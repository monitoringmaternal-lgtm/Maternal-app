import { useState, FormEvent } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { AlertThresholds } from '../types';
import { Bell, ShieldAlert, Thermometer, Droplets, Battery, Save, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AlertSettingsProps {
  userId: string;
  currentThresholds: AlertThresholds;
  onUpdate: (newThresholds: AlertThresholds) => void;
}

export default function AlertSettings({ userId, currentThresholds, onUpdate }: AlertSettingsProps) {
  const [tempMax, setTempMax] = useState<number>(currentThresholds.tempMax);
  const [tempMin, setTempMin] = useState<number>(currentThresholds.tempMin);
  const [humidityMax, setHumidityMax] = useState<number>(currentThresholds.humidityMax);
  const [humidityMin, setHumidityMin] = useState<number>(currentThresholds.humidityMin);
  const [voltageMax, setVoltageMax] = useState<number>(currentThresholds.voltageMax);
  const [voltageMin, setVoltageMin] = useState<number>(currentThresholds.voltageMin);

  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    const updated: AlertThresholds = {
      tempMax: Number(tempMax),
      tempMin: Number(tempMin),
      humidityMax: Number(humidityMax),
      humidityMin: Number(humidityMin),
      voltageMax: Number(voltageMax),
      voltageMin: Number(voltageMin)
    };

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        alertSettings: updated
      });
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error("Error updating thresholds:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setTempMax(38.0);
    setTempMin(15.0);
    setHumidityMax(75.0);
    setHumidityMin(25.0);
    setVoltageMax(4.7);
    setVoltageMin(3.3);
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-cyan-500" />
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Define Alert Settings</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
        Specify safe operating zones for sensor telemetry. When a parameter is outside these boundaries, the system will mark the packet as critical and issue a alert notification.
      </p>

      {success && (
        <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Operator thresholds successfully updated!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Temp bounds */}
        <div className="p-4 bg-rose-50/20 dark:bg-rose-950/5 rounded-2xl border border-rose-100/40 dark:border-rose-900/10">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer className="h-4 w-4 text-rose-500" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-rose-500">Temperature Safeguards (°C)</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Lower Limit</label>
              <input
                id="threshold-temp-min"
                type="number"
                step="0.1"
                value={tempMin}
                onChange={(e) => setTempMin(parseFloat(e.target.value))}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Upper Limit</label>
              <input
                id="threshold-temp-max"
                type="number"
                step="0.1"
                value={tempMax}
                onChange={(e) => setTempMax(parseFloat(e.target.value))}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Humidity bounds */}
        <div className="p-4 bg-sky-50/20 dark:bg-sky-950/5 rounded-2xl border border-sky-100/40 dark:border-sky-900/10">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="h-4 w-4 text-sky-500" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-sky-500">Humidity Safeguards (%)</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Lower Limit</label>
              <input
                id="threshold-humidity-min"
                type="number"
                step="1"
                value={humidityMin}
                onChange={(e) => setHumidityMin(parseInt(e.target.value))}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Upper Limit</label>
              <input
                id="threshold-humidity-max"
                type="number"
                step="1"
                value={humidityMax}
                onChange={(e) => setHumidityMax(parseInt(e.target.value))}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Voltage bounds */}
        <div className="p-4 bg-emerald-50/20 dark:bg-emerald-950/5 rounded-2xl border border-emerald-100/40 dark:border-emerald-900/10">
          <div className="flex items-center gap-2 mb-3">
            <Battery className="h-4 w-4 text-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-500">ESP32 Voltage Safeguards (V)</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Battery Min (e.g. 3.3V)</label>
              <input
                id="threshold-voltage-min"
                type="number"
                step="0.05"
                value={voltageMin}
                onChange={(e) => setVoltageMin(parseFloat(e.target.value))}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Overvoltage Max</label>
              <input
                id="threshold-voltage-max"
                type="number"
                step="0.05"
                value={voltageMax}
                onChange={(e) => setVoltageMax(parseFloat(e.target.value))}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            id="threshold-defaults-btn"
            type="button"
            onClick={handleResetDefaults}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0f172a] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset to Defaults
          </button>
          
          <button
            id="threshold-save-btn"
            type="submit"
            disabled={saving}
            className="w-full sm:flex-1 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/10 dark:shadow-none"
          >
            {saving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Safe Operating Zones
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
