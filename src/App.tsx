import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile, AlertThresholds } from './types';
import {
  LayoutDashboard,
  BellRing,
  FileSpreadsheet,
  Settings2,
  User,
  Shield,
  Info,
  X,
  Volume2,
  VolumeX,
  Sun,
  Moon
} from 'lucide-react';

import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AlertsList from './components/AlertsList';
import ExportLogs from './components/ExportLogs';
import AlertSettings from './components/AlertSettings';
import Profile from './components/Profile';

interface InAppToast {
  id: string;
  message: string;
  type: string;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alerts' | 'export' | 'thresholds' | 'profile'>('dashboard');
  const [toasts, setToasts] = useState<InAppToast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to User Profile (Firestore)
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          uid: user.uid,
          email: data.email || user.email || 'operator@system.io',
          username: data.username || 'ESP32 Operator',
          alertSettings: data.alertSettings || {
            tempMax: 38.0,
            tempMin: 15.0,
            humidityMax: 75.0,
            humidityMin: 25.0,
            voltageMin: 3.3,
            voltageMax: 4.7
          },
          darkMode: data.darkMode || false
        });
      } else {
        // Fallback profile if Firestore is still bootstrapping
        setProfile({
          uid: user.uid,
          email: user.email || 'operator@system.io',
          username: 'ESP32 Operator',
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
      setAuthLoading(false);
    }, (error) => {
      console.error("Error listening to user profile:", error);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Apply dark mode class to HTML element
  useEffect(() => {
    if (profile?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile?.darkMode]);

  // Web Audio API helper for warning sound effect
  const playAlertBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      // Dual-tone warning beep sequence
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch alert note
      osc.frequency.setValueAtTime(587, audioCtx.currentTime + 0.15); // Secondary alarm note
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn("AudioContext: User interaction required before sound triggers.", e);
    }
  };

  const addToast = (message: string, type: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Play hardware buzzer sound
    playAlertBeep();

    // Auto dismiss toast in 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const defaultThresholds: AlertThresholds = {
    tempMax: 38.0,
    tempMin: 15.0,
    humidityMax: 75.0,
    humidityMin: 25.0,
    voltageMin: 3.3,
    voltageMax: 4.7
  };

  const activeThresholds = profile?.alertSettings || defaultThresholds;

  const handleAuthSuccess = (uid: string) => {
    setAuthLoading(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Real-time Toast Notifications HUD */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            id={`toast-${toast.id}`}
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 rounded-2xl p-4 shadow-xl flex items-start gap-3 border border-slate-800/20 dark:border-slate-100/10 animate-slide-down"
          >
            <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 animate-ping ${
              toast.type === 'temperature' ? 'bg-rose-500' : toast.type === 'humidity' ? 'bg-sky-500' : 'bg-emerald-500'
            }`}></div>
            
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-60">System Alarm Alert</div>
              <p className="text-xs font-semibold leading-snug mt-0.5">{toast.message}</p>
            </div>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 dark:hover:bg-slate-100 text-white/60 dark:text-slate-600 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Responsive Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
        
        {/* App Title Header Banner */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-cyan-500 text-white rounded-lg flex items-center justify-center shadow-md shadow-cyan-500/10">
                <Shield className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-850 dark:text-slate-50">ESP32 Real-Time Telemetry Monitor</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Industrial remote monitoring workspace connected to Firebase database & real-time sensor streams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="sound-toggle-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title={soundEnabled ? "Mute buzzer sound" : "Enable buzzer sound"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
            </button>

            {profile && (
              <span className="text-[11px] font-mono font-bold border px-3 py-1.5 rounded-xl flex items-center gap-1.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse bg-emerald-400"></span>
                Firebase Cloud Active
              </span>
            )}
          </div>
        </header>

        {authLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
            <div className="h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold text-slate-400">Restoring operational credentials...</span>
          </div>
        ) : !user ? (
          <div className="flex items-center justify-center min-h-[450px]">
            <div className="w-full max-w-md">
              <Auth onSuccess={handleAuthSuccess} />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            
            {/* Elegant Sub-Navigation Tab Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1e293b] border border-slate-200/50 dark:border-slate-850 p-2.5 rounded-2xl shadow-sm">
              <div className="flex flex-wrap gap-1.5">
                <button
                  id="nav-tab-dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Telemetry Dashboard</span>
                </button>

                <button
                  id="nav-tab-alerts"
                  onClick={() => setActiveTab('alerts')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'alerts'
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <BellRing className="h-4 w-4" />
                  <span>Safety Alerts</span>
                </button>

                <button
                  id="nav-tab-export"
                  onClick={() => setActiveTab('export')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'export'
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Telemetry Logs</span>
                </button>

                <button
                  id="nav-tab-thresholds"
                  onClick={() => setActiveTab('thresholds')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'thresholds'
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Settings2 className="h-4 w-4" />
                  <span>Threshold Rules</span>
                </button>

                <button
                  id="nav-tab-profile"
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'profile'
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/10'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Operator Profile</span>
                </button>
              </div>

              {/* Operator details badge */}
              {profile && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750 rounded-xl text-[11px]">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
                  <span className="text-slate-400">Operator:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{profile.username}</span>
                </div>
              )}
            </div>

            {/* Active View Panel (No narrow aspect restriction) */}
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm min-h-[520px]">
              {activeTab === 'dashboard' && profile && (
                <Dashboard thresholds={activeThresholds} userId={user.uid} />
              )}
              
              {activeTab === 'alerts' && (
                <AlertsList userId={user.uid} />
              )}
              
              {activeTab === 'export' && (
                <ExportLogs userId={user.uid} />
              )}
              
              {activeTab === 'thresholds' && profile && (
                <AlertSettings
                  userId={user.uid}
                  currentThresholds={activeThresholds}
                  onUpdate={(newThresholds) => {
                    setProfile({
                      ...profile,
                      alertSettings: newThresholds
                    });
                  }}
                />
              )}
              
              {activeTab === 'profile' && profile && (
                <Profile
                  profile={profile}
                  onProfileUpdate={(updatedProfile) => {
                    setProfile(updatedProfile);
                  }}
                  onLogout={() => {
                    setUser(null);
                    setProfile(null);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
