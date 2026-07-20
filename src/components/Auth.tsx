import { useState, FormEvent } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import {
  Shield,
  Key,
  Mail,
  User,
  AlertCircle,
  ArrowRight,
  Sparkles,
  LogIn,
  Settings,
  X,
  Cpu,
  Database,
  Wifi,
  Copy,
  Check,
  BookOpen,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  // Guide / Explainer Modal State
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

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
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Email is already registered';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is disabled on this Firebase project. Please enable Email/Password provider in the Firebase Console (Authentication > Sign-in method).';
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
      setError('Google Sign-In failed: ' + err.message);
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

  const handlePrefillDemo = () => {
    setEmail('demo.operator@gateway.io');
    setPassword('operator123');
    setIsSignUp(false);
    setInfoMessage('Demo credentials pre-filled! Click "Authenticate Operator" to sign in.');
    setShowHelpModal(false);
  };

  const testFirebaseConnection = async () => {
    setConnectionStatus('checking');
    try {
      // Fetch connection doc
      await getDocFromServer(doc(db, 'test', 'connection'));
      setConnectionStatus('connected');
    } catch (error) {
      console.warn("Firestore validation:", error);
      // Even if the document doesn't exist, if it returns an object or doesn't throw a network error, we're online
      if (error instanceof Error && error.message.includes('offline')) {
        setConnectionStatus('error');
      } else {
        setConnectionStatus('connected');
      }
    }
  };

  const arduinoCode = `// ESP32 Telemetry Gateway Client
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Replace with your deploy gateway endpoint
const char* serverUrl = "https://your-app-url.run.app/api/telemetry";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected to Wi-Fi!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Static / read sensors
    float temp = 24.5 + (random(-10, 10) / 10.0);
    float humidity = 45.0 + (random(-50, 50) / 10.0);
    float voltage = 4.2 - (random(0, 100) / 100.0);

    StaticJsonDocument<200> doc;
    doc["temperature"] = temp;
    doc["humidity"] = humidity;
    doc["voltage"] = voltage;
    doc["deviceId"] = "ESP32-HARDWARE-01";

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    Serial.print("HTTP Response: ");
    Serial.println(httpResponseCode);
    http.end();
  }
  delay(10000); // Send every 10 seconds
}`;

  const copyArduinoCode = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="relative w-full max-w-md mx-auto bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-xl">
      
      {/* Help / Informational Settings Explainer Icon at Top Right */}
      <button
        id="system-guide-trigger"
        onClick={() => setShowHelpModal(true)}
        className="absolute top-5 right-5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-cyan-500 dark:text-slate-400 dark:hover:text-cyan-400 transition-all cursor-pointer shadow-sm hover:scale-110 active:scale-95"
        title="How the system works & Setup Guide"
      >
        <Settings className="h-5 w-5 animate-[spin_12s_linear_infinite]" />
      </button>

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
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-500/10 dark:shadow-none transition-all disabled:opacity-50 mt-2 cursor-pointer"
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
        className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-[#0f172a] dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm text-xs cursor-pointer"
      >
        <LogIn className="h-4 w-4 text-cyan-500" />
        <span>Sign In with Google</span>
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
          className="text-cyan-500 font-semibold hover:underline cursor-pointer"
        >
          {isSignUp ? 'Login Here' : 'Register Operator'}
        </button>
      </div>

      {/* Help Modal Explainer Panel */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#182232]">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">ESP32 Gateway Manual</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">How the system operates & setup guide</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-250 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* 1. How the system works */}
                <section className="space-y-2">
                  <h4 className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Database className="h-3.5 w-3.5 text-cyan-500" />
                    How the System Works
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    This platform is an <b>Industrial Telemetric Gateway</b> designed to monitor active edge microcontrollers (like ESP32).
                    Sensor fields (Temperature, Humidity, and Voltage) are measured at the hardware node and processed instantly. 
                    The data is sent directly to <b>Google Cloud Firestore</b>, which synchronizes with this dashboard in real-time.
                  </p>
                </section>

                {/* 2. How to use */}
                <section className="space-y-2">
                  <h4 className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Info className="h-3.5 w-3.5 text-cyan-500" />
                    How to Use the Dashboard
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 list-disc pl-5 leading-relaxed">
                    <li><b>Live Monitor:</b> Displays meters, system statuses, and dynamic chart curves.</li>
                    <li><b>Threshold Controls:</b> Custom safe-range settings for temp, humidity, and battery voltage.</li>
                    <li><b>Instant Alarms:</b> Visual popups and a browser-synthesized audio warning chime activate immediately upon limit violation.</li>
                    <li><b>Logs & Export:</b> Filter operational entries and export spreadsheet-ready CSV archives.</li>
                  </ul>
                </section>

                {/* 3. How to connect */}
                <section className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h4 className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Cpu className="h-3.5 w-3.5 text-cyan-500" />
                    How to Connect & Stream
                  </h4>
                  
                  <div className="space-y-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Option A: Simulated Hardware (Instant Testing)</span>
                      <p className="mt-0.5 leading-relaxed">
                        After signing in, use the <b>ESP32 Hardware Simulator Console</b> on the right pane. Set your values and click <b>Start Auto-Send</b> to begin broadcasting telemetry streams into your Cloud.
                      </p>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Option B: Real ESP32 Microcontroller</span>
                      <p className="mt-0.5 leading-relaxed">
                        Deploy your firmware code to a real ESP32 development board. Direct the payload to the server's telemetry collector endpoint.
                      </p>
                      
                      {/* Arduino code copy area */}
                      <div className="mt-2.5 relative bg-slate-900 dark:bg-[#090d16] text-slate-300 font-mono text-[10px] rounded-lg p-3 max-h-36 overflow-y-auto leading-relaxed border border-slate-800">
                        <button
                          onClick={copyArduinoCode}
                          className="absolute top-2 right-2 p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                        >
                          {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedCode ? 'Copied' : 'Copy C++'}</span>
                        </button>
                        <pre>{arduinoCode}</pre>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. Connectivity Test Status */}
                <section className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Wifi className={`h-4.5 w-4.5 ${connectionStatus === 'connected' ? 'text-emerald-500' : connectionStatus === 'error' ? 'text-rose-500' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {connectionStatus === 'connected' && 'Firebase Cloud: Connected'}
                      {connectionStatus === 'checking' && 'Testing database latency...'}
                      {connectionStatus === 'error' && 'Firebase Connection Error'}
                      {connectionStatus === 'idle' && 'Firebase Connectivity Test'}
                    </span>
                  </div>
                  <button
                    onClick={testFirebaseConnection}
                    disabled={connectionStatus === 'checking'}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Check Ping
                  </button>
                </section>

              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#182232] flex flex-col sm:flex-row gap-2 justify-between">
                <button
                  onClick={handlePrefillDemo}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>🔑 Pre-fill Demo Credentials</span>
                </button>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-250 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close Manual
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
