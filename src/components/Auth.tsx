import { useState, FormEvent } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Shield, Key, Mail, User, AlertCircle, ArrowRight, Sparkles, LogIn } from 'lucide-react';

interface AuthProps {
  onSuccess: (uid: string) => void;
}

export default function Auth({ onSuccess }: AuthProps) {
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
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      // Sign in anonymously for easy, seamless evaluation without signups
      const userCredential = await signInAnonymously(auth);
      await initUserProfile(userCredential.user.uid, 'demo@esp32-telemetry.io', 'Demo Operator');
      onSuccess(userCredential.user.uid);
    } catch (err: any) {
      console.error(err);
      setError('Demo Sign-In failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
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

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-xl">
      {/* Header */}
      <div className="text-center mb-8">
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
              placeholder="operator@system.io"
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

      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
        <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Or</span>
        <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
      </div>

      {/* One click Demo Account login option */}
      <button
        id="demo-login-btn"
        onClick={handleDemoLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-cyan-500/30 dark:border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 dark:bg-[#0f172a] text-cyan-500 font-semibold py-2.5 px-4 rounded-xl transition-all"
      >
        <LogIn className="h-4 w-4" />
        <span>One-Click Demo Operator login</span>
      </button>

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
