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
  Smartphone,
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
import ESP32Simulator from './components/ESP32Simulator';

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

  // Listen to Firestore User Profile in real-time when authenticated
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          uid: user.uid,
          email: data.email || user.email || 'anonymous@esp32.io',
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
          email: user.email || 'anonymous@esp32.io',
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
    // Auth state is handled in standard listener, just safety update loading
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

      {/* Main Responsive Grid Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
        
        {/* App Title Header Banner */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-cyan-500 text-white rounded-lg flex items-center justify-center shadow-md shadow-cyan-500/10">
                <Shield className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-850 dark:text-slate-50">ESP32 Telemetric Gateway</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Industrial real-time sensor processing and safe operational boundary monitoring.
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
              <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-cyan-500/10 border border-slate-200 dark:border-cyan-500/20 px-3 py-1.5 rounded-xl text-slate-500 dark:text-cyan-400 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                Node Connect Active
              </span>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Mobile Phone Simulated Viewport */}
          <div className="lg:col-span-7 flex justify-center">
            
            {/* Standard Mobile Frame */}
            <div className="w-full max-w-[430px] bg-[#1e293b] dark:bg-[#1e293b] p-3 sm:p-4 rounded-[42px] shadow-2xl border-4 border-[#0f172a] flex flex-col relative aspect-[9/19.5] min-h-[780px] overflow-hidden shadow-cyan-500/5">
              
              {/* Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-[#1e293b] rounded-full z-20 flex items-center justify-between px-3.5">
                <span className="h-1.5 w-1.5 bg-cyan-400/80 rounded-full animate-ping"></span>
                <span className="w-12 h-1 bg-slate-800 rounded-full"></span>
                <span className="h-1.5 w-1.5 bg-cyan-500/30 rounded-full"></span>
              </div>

              {/* Inner Mobile Screen Content Area */}
              <div className="flex-1 bg-slate-50 dark:bg-[#0f172a] rounded-[32px] overflow-hidden flex flex-col relative border border-slate-100 dark:border-slate-800/60">
                
                {/* Mobile Status Bar */}
                <div className="bg-white dark:bg-[#1e293b] px-6 pt-6.5 pb-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-400 font-mono">
                  <span>SYSTEM_IO</span>
                  <div className="flex items-center gap-1">
                    <span>LTE</span>
                    <span>100%</span>
                  </div>
                </div>

                 {/* Main Scrollable Viewport */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {authLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <div className="h-8 w-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-semibold text-slate-400">Restoring operational credentials...</span>
                    </div>
                  ) : !user ? (
                    <div className="flex items-center justify-center h-full py-6">
                      <Auth onSuccess={handleAuthSuccess} />
                    </div>
                  ) : (
                    <>
                      {/* Sub-Views */}
                      {activeTab === 'dashboard' && profile && (
                        <Dashboard thresholds={activeThresholds} />
                      )}
                      
                      {activeTab === 'alerts' && (
                        <AlertsList userId={user.uid} />
                      )}
                      
                      {activeTab === 'export' && (
                        <ExportLogs />
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
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Bottom Navigation Tabs - Only show when authenticated */}
                {user && profile && (
                  <nav className="bg-white dark:bg-[#1e293b] border-t border-slate-150 dark:border-slate-800 px-4 py-3.5 flex justify-around items-center rounded-b-[32px] shrink-0 z-10">
                    <button
                      id="nav-tab-dashboard"
                      onClick={() => setActiveTab('dashboard')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
                        activeTab === 'dashboard'
                          ? 'text-cyan-500 dark:text-cyan-400'
                          : 'text-slate-400 dark:text-slate-500 hover:text-cyan-500'
                      }`}
                    >
                      <LayoutDashboard className="h-4.5 w-4.5" />
                      <span>Dashboard</span>
                    </button>

                    <button
                      id="nav-tab-alerts"
                      onClick={() => setActiveTab('alerts')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors relative ${
                        activeTab === 'alerts'
                          ? 'text-cyan-500 dark:text-cyan-400'
                          : 'text-slate-400 dark:text-slate-500 hover:text-cyan-500'
                      }`}
                    >
                      <BellRing className="h-4.5 w-4.5" />
                      <span>Alerts</span>
                    </button>

                    <button
                      id="nav-tab-export"
                      onClick={() => setActiveTab('export')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
                        activeTab === 'export'
                          ? 'text-cyan-500 dark:text-cyan-400'
                          : 'text-slate-400 dark:text-slate-500 hover:text-cyan-500'
                      }`}
                    >
                      <FileSpreadsheet className="h-4.5 w-4.5" />
                      <span>Logs</span>
                    </button>

                    <button
                      id="nav-tab-thresholds"
                      onClick={() => setActiveTab('thresholds')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
                        activeTab === 'thresholds'
                          ? 'text-cyan-500 dark:text-cyan-400'
                          : 'text-slate-400 dark:text-slate-500 hover:text-cyan-500'
                      }`}
                    >
                      <Settings2 className="h-4.5 w-4.5" />
                      <span>Alert Settings</span>
                    </button>

                    <button
                      id="nav-tab-profile"
                      onClick={() => setActiveTab('profile')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
                        activeTab === 'profile'
                          ? 'text-cyan-500 dark:text-cyan-400'
                          : 'text-slate-400 dark:text-slate-500 hover:text-cyan-500'
                      }`}
                    >
                      <User className="h-4.5 w-4.5" />
                      <span>Profile</span>
                    </button>
                  </nav>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Hardware Simulator Console */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
            <ESP32Simulator
              thresholds={activeThresholds}
              userId={user?.uid}
              onAlertTriggered={(message, type) => {
                addToast(message, type);
              }}
            />

            {/* Quick documentation box */}
            <div className="bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-xs uppercase tracking-wide text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 mb-2">
                <Info className="h-4 w-4 text-cyan-500" /> Quick Documentation
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <li>
                  <b>1. Set Safe Ranges</b>: Head to the <i>Alert Settings</i> tab inside the mobile screen to customize limits (e.g. Temp Max: 32°C).
                </li>
                <li>
                  <b>2. Stream Live Data</b>: Click the green <b>Start Auto-Send</b> button on the simulator console to initiate live broadcasting to your Firestore database.
                </li>
                <li>
                  <b>3. Watch Real-time Sync</b>: Telemetry readings will flow directly into the mobile dashboard without any page refresh.
                </li>
                <li>
                  <b>4. Trigger Buzzer Warnings</b>: Slide Temperature or Voltage limits beyond your custom settings to hear a warning tone and receive alert banners in real-time.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
