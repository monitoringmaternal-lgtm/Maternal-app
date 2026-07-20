import { useState, FormEvent } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Shield, Key, Mail, User, AlertCircle, ArrowRight, Sparkles, LogIn, Database, Cpu } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthProps {
  onSuccess: (uid: string) => void;
  dbMode: 'firebase' | 'local';
  setDbMode: (mode: 'firebase' | 'local') => void;
}

export default function Auth({ onSuccess, dbMode, setDbMode }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const initUserProfile = async (uid: string, userEmail: string, userDisplayName: string) => {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      // Create initial settings
      await setDoc(userDocRef, {
        uid,
        email: userEmail || 'anonymous@esp32.io',
        username: userDisplayName || 'ESP32 Operator',
        alertSettings: {
          tempMax: 38.0,
          tempMin: 15.0,
          humidityMax: 75.0,
          humidityMin: 25.0,
          voltageMin: 3.3,
          voltageMax: 4.7
        },
        darkMode: false
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      if (dbMode === 'firebase') {
        if (isSignUp) {
          if (!username) {
            setError('Please provide an operator name');
            setLoading(false);
            return;
          }
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await initUserProfile(userCredential.user.uid, email, username);
          onSuccess(userCredential.user.uid);
        } else {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          await initUserProfile(userCredential.user.uid, email, userCredential.user.displayName || 'ESP32 Operator');
          onSuccess(userCredential.user.uid);
        }
      } else {
        // LOCAL DATABASE MODE
        const localUsers = JSON.parse(localStorage.getItem('esp32_local_users') || '[]');
        
        if (isSignUp) {
          if (!username) {
            setError('Please provide an operator name');
            setLoading(false);
            return;
          }
          if (localUsers.some((u: any) => u.email === email)) {
            setError('Email is already registered in local database');
            setLoading(false);
            return;
          }
          
          const uid = 'local-' + Math.random().toString(36).substring(2, 9);
          const newUser = { uid, email, username, password };
          localUsers.push(newUser);
          localStorage.setItem('esp32_local_users', JSON.stringify(localUsers));

          const defaultProfile: UserProfile = {
            uid,
            email,
            username,
            alertSettings: {
              tempMax: 38.0,
              tempMin: 15.0,
              humidityMax: 75.0,
              humidityMin: 25.0,
              voltageMin: 3.3,
              voltageMax: 4.7
            },
            darkMode: false
          };
          localStorage.setItem(`esp32_local_profile_${uid}`, JSON.stringify(defaultProfile));
          localStorage.setItem('esp32_local_session', JSON.stringify({ uid, email }));
          
          window.dispatchEvent(new Event('esp32_local_db_update'));
          onSuccess(uid);
        } else {
          const matchedUser = localUsers.find((u: any) => u.email === email && u.password === password);
          if (!matchedUser) {
            setError('Invalid local operator email or password. Feel free to use the "Sandbox Quick Login" below to bypass registration!');
            setLoading(false);
            return;
          }
          
          localStorage.setItem('esp32_local_session', JSON.stringify({ uid: matchedUser.uid, email: matchedUser.email }));
          window.dispatchEvent(new Event('esp32_local_db_update'));
          onSuccess(matchedUser.uid);
        }
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Email is already registered';
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'Invalid credentials provided';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is disabled on this Firebase project. Please enable Email/Password provider in the Firebase Console (Authentication > Sign-in method), or use the "Local Sandbox" option above for instant zero-config login.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await initUserProfile(
        userCredential.user.uid,
        userCredential.user.email || '',
        userCredential.user.displayName || 'ESP32 Operator'
      );
      onSuccess(userCredential.user.uid);
    } catch (err: any) {
      console.error(err);
      setError('Google Sign-In failed: ' + err.message + '. If Firebase setup is incomplete, please switch to "Local Sandbox" at the top.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (dbMode === 'local') {
      setInfoMessage('Local database mode does not require password reset. Simply use the quick sandbox bypass button!');
      return;
    }
    if (!email) {
      setError('Please enter your email to request a reset link');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfoMessage('Password reset link sent to your email!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSandboxLogin = () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const uid = 'local-operator';
      const email = 'operator@local.io';
      const username = 'Sandbox Operator';
      
      const defaultProfile = {
        uid,
        email,
        username,
        alertSettings: {
          tempMax: 38.0,
          tempMin: 15.0,
          humidityMax: 75.0,
          humidityMin: 25.0,
          voltageMin: 3.3,
          voltageMax: 4.7
        },
        darkMode: false
      };
      
      if (!localStorage.getItem(`esp32_local_profile_${uid}`)) {
        localStorage.setItem(`esp32_local_profile_${uid}`, JSON.stringify(defaultProfile));
      }
      
      localStorage.setItem('esp32_local_session', JSON.stringify({ uid, email }));
      window.dispatchEvent(new Event('esp32_local_db_update'));
      onSuccess(uid);
    } catch (err: any) {
      setError('Sandbox login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-xl">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center h-14 w-14 bg-cyan-500/10 rounded-2xl mb-4 text-cyan-500">
          <Shield className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isSignUp ? 'Create Operator Account' : 'Secure Operator Login'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
          Access the real-time ESP32 telemetric network dashboard.
        </p>
      </div>

      {/* Connection Mode Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-50 dark:bg-[#0f172a] rounded-xl mb-6 border border-slate-200/50 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => {
            setDbMode('firebase');
            setError('');
            setInfoMessage('');
          }}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            dbMode === 'firebase'
              ? 'bg-white dark:bg-[#1e293b] text-cyan-500 dark:text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Firebase Cloud</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setDbMode('local');
            setError('');
            setInfoMessage('');
          }}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            dbMode === 'local'
              ? 'bg-white dark:bg-[#1e293b] text-cyan-500 dark:text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Local Sandbox</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
          <span>{infoMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Operator Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="auth-username"
                type="text"
                placeholder="e.g. Engineer John"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="auth-email"
              type="email"
              placeholder={dbMode === 'firebase' ? 'operator@system.io' : 'operator@local.io'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Access Token / Password</label>
            {!isSignUp && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] text-cyan-500 hover:underline"
              >
                Forgot?
              </button>
            )}
          </div>
          <div className="relative">
            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
            />
          </div>
        </div>

        <button
          id="auth-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-500/10 dark:shadow-none transition-all disabled:opacity-50 mt-2"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              {isSignUp ? 'Create Operator Account' : 'Authenticate Operator'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* If in local mode, show Quick Access Login */}
      {dbMode === 'local' ? (
        <div className="mt-4">
          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Or bypass credentials</span>
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          </div>
          <button
            id="sandbox-quick-login-btn"
            onClick={handleQuickSandboxLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-amber-500/10 text-xs uppercase tracking-wider"
          >
            <Cpu className="h-4 w-4" />
            <span>⚡ Direct Sandbox Quick Login</span>
          </button>
        </div>
      ) : (
        <>
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Or</span>
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          </div>

          {/* Google Sign-In Button */}
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-[#0f172a] dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm text-xs"
          >
            <LogIn className="h-4 w-4 text-cyan-500" />
            <span>Sign In with Google</span>
          </button>
        </>
      )}

      <div className="mt-6 text-center text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          {isSignUp ? 'Already have an account?' : "Don't have an operator profile?"}
        </span>{' '}
        <button
          id="auth-toggle-mode"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
            setInfoMessage('');
          }}
          className="text-cyan-500 font-semibold hover:underline"
        >
          {isSignUp ? 'Login Here' : 'Register Operator'}
        </button>
      </div>
    </div>
  );
}
