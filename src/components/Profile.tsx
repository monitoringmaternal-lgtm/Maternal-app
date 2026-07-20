import { useState, FormEvent } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { User, LogOut, Sun, Moon, Shield, Settings2, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileProps {
  profile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export default function Profile({ profile, onProfileUpdate }: ProfileProps) {
  const [username, setUsername] = useState<string>(profile.username);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const handleUpdateUsername = async (e: FormEvent) => {

    e.preventDefault();
    if (!username.trim()) return;
    setSaving(true);
    setSuccess(false);

    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        username: username.trim()
      });
      onProfileUpdate({
        ...profile,
        username: username.trim()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating profile username: ", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDarkMode = async () => {
    const nextMode = !profile.darkMode;
    try {
      // Toggle client-side right away
      onProfileUpdate({
        ...profile,
        darkMode: nextMode
      });
      // Save setting to Firestore
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        darkMode: nextMode
      });
    } catch (err) {
      console.error("Error toggling dark mode in DB: ", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out operator: ", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Operator Card */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center">
        <div className="h-20 w-20 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-500 mb-4 border-2 border-cyan-500/20 shadow-inner">
          <User className="h-10 w-10 stroke-[1.5]" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{profile.username}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">{profile.email}</p>
        
        <div className="mt-4 flex gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 bg-cyan-500/10 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-500/20 rounded-full flex items-center gap-1">
            <Shield className="h-3 w-3" /> SECURITY OPERATOR
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900 rounded-full flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> ACTIVE NODE
          </span>
        </div>
      </div>

      {/* Operator Customizations */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Settings2 className="h-5 w-5 text-cyan-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Operator Customizations</h3>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Profile username updated successfully!</span>
          </div>
        )}

        {/* Change Username form */}
        <form onSubmit={handleUpdateUsername} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Operator Handle</label>
            <div className="flex gap-2">
              <input
                id="profile-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
                placeholder="Operator name"
              />
              <button
                id="profile-username-save-btn"
                type="submit"
                disabled={saving || !username.trim() || username.trim() === profile.username}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
              >
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </form>

        {/* Dark Mode and Preferences */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0f172a] rounded-2xl border border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
              {profile.darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Dark Interface Mode</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Toggle eye-safe night mode layout</p>
            </div>
          </div>
          <button
            id="profile-darkmode-toggle"
            onClick={handleToggleDarkMode}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors relative focus:outline-none ${
              profile.darkMode ? 'bg-cyan-500' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white h-4.5 w-4.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                profile.darkMode ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Sign Out Action */}
        <button
          id="profile-logout-btn"
          onClick={handleLogout}
          className="w-full py-2.5 px-4 border border-dashed border-rose-200 dark:border-rose-900 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign Out Operator Profile
        </button>
      </div>
    </div>
  );
}
