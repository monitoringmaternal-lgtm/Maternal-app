import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Cpu, Play, Square, RefreshCw, AlertTriangle, Battery, Thermometer, Droplets } from 'lucide-react';
import { AlertThresholds } from '../types';

interface ESP32SimulatorProps {
  thresholds: AlertThresholds;
  userId?: string;
  onAlertTriggered: (alertMessage: string, type: string) => void;
}

export default function ESP32Simulator({ thresholds, userId, onAlertTriggered }: ESP32SimulatorProps) {
  const [temperature, setTemperature] = useState<number>(24.5);
  const [humidity, setHumidity] = useState<number>(45.0);
  const [voltage, setVoltage] = useState<number>(4.2);
  const [deviceId, setDeviceId] = useState<string>('ESP32-WROOM-32');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [intervalSec, setIntervalSec] = useState<number>(3);
  const [lastSent, setLastSent] = useState<string>('Never');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Auto-send logic when running simulation
  useEffect(() => {
    let timer: any = null;
    if (isSimulating) {
      timer = setInterval(() => {
        // Apply slight random variations to simulate realistic environment walk
        setTemperature(prev => {
          const delta = (Math.random() - 0.5) * 1.5;
          const next = prev + delta;
          return Math.min(Math.max(Number(next.toFixed(1)), -10), 85);
        });
        setHumidity(prev => {
          const delta = (Math.random() - 0.5) * 4;
          const next = prev + delta;
          return Math.min(Math.max(Number(next.toFixed(1)), 0), 100);
        });
        setVoltage(prev => {
          // Slowly discharge battery with occasional minor fluctuations
          const delta = -0.01 + (Math.random() - 0.5) * 0.02;
          const next = prev + delta;
          return Math.min(Math.max(Number(next.toFixed(2)), 2.5), 5.0);
        });
        
        // Trigger transmission
        sendTelemetry();
      }, intervalSec * 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSimulating, intervalSec, temperature, humidity, voltage, deviceId, thresholds, userId]);

  const sendTelemetry = async () => {
    setIsSending(true);
    try {
      // Check for threshold crossings
      const alerts: string[] = [];
      const now = new Date();

      if (temperature > thresholds.tempMax) {
        alerts.push(`High Temperature! Current: ${temperature}°C (Limit: ${thresholds.tempMax}°C)`);
        triggerAlert('temperature_high', temperature, thresholds.tempMax, `Temperature exceeds limit! Current: ${temperature}°C`);
      } else if (temperature < thresholds.tempMin) {
        alerts.push(`Low Temperature! Current: ${temperature}°C (Limit: ${thresholds.tempMin}°C)`);
        triggerAlert('temperature_low', temperature, thresholds.tempMin, `Temperature below limit! Current: ${temperature}°C`);
      }

      if (humidity > thresholds.humidityMax) {
        alerts.push(`High Humidity! Current: ${humidity}% (Limit: ${thresholds.humidityMax}%)`);
        triggerAlert('humidity_high', humidity, thresholds.humidityMax, `Humidity exceeds limit! Current: ${humidity}%`);
      } else if (humidity < thresholds.humidityMin) {
        alerts.push(`Low Humidity! Current: ${humidity}% (Limit: ${thresholds.humidityMin}%)`);
        triggerAlert('humidity_low', humidity, thresholds.humidityMin, `Humidity below limit! Current: ${humidity}%`);
      }

      if (voltage > thresholds.voltageMax) {
        alerts.push(`High Voltage Alert! Current: ${voltage}V (Limit: ${thresholds.voltageMax}V)`);
        triggerAlert('voltage_high', voltage, thresholds.voltageMax, `Voltage exceeds limit! Current: ${voltage}V`);
      } else if (voltage < thresholds.voltageMin) {
        alerts.push(`Low Battery Alert! Current: ${voltage}V (Limit: ${thresholds.voltageMin}V)`);
        triggerAlert('voltage_low', voltage, thresholds.voltageMin, `Battery Voltage Low! Current: ${voltage}V`);
      }

      const hasAlert = alerts.length > 0;

      // Add sensor reading
      await addDoc(collection(db, 'sensor_readings'), {
        temperature,
        humidity,
        voltage,
        deviceId,
        status: hasAlert ? 'Alert' : 'Normal',
        timestamp: serverTimestamp()
      });

      setLastSent(now.toLocaleTimeString());
    } catch (error) {
      console.error("Error sending telemetry: ", error);
    } finally {
      setIsSending(false);
    }
  };

  const triggerAlert = async (
    type: 'temperature_high' | 'temperature_low' | 'humidity_high' | 'humidity_low' | 'voltage_low' | 'voltage_high',
    value: number,
    threshold: number,
    message: string
  ) => {
    let sensorType: 'temperature' | 'humidity' | 'voltage' = 'temperature';
    if (type.startsWith('humidity')) sensorType = 'humidity';
    if (type.startsWith('voltage')) sensorType = 'voltage';

    try {
      await addDoc(collection(db, 'alerts'), {
        userId: userId || 'anonymous',
        type,
        sensorType,
        value,
        threshold,
        read: false,
        message,
        timestamp: serverTimestamp()
      });
      onAlertTriggered(message, sensorType);
    } catch (e) {
      console.error("Error triggering alert: ", e);
    }
  };

  return (
    <div id="esp32-simulator-panel" className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-cyan-500 animate-pulse" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">ESP32 Hardware Simulator</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-full ${isSimulating ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
          <span className="text-xs text-slate-500 font-medium">
            {isSimulating ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
        Simulate an ESP32 microcontroller reading DHT11/22 & battery sensors. Sliding these inputs writes live data to your Firestore database.
      </p>

      <div className="space-y-4">
        {/* Device Settings */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Device ID / MAC</label>
          <input
            id="sim-device-id"
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Temperature slider */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span className="flex items-center gap-1 text-rose-500"><Thermometer className="h-3.5 w-3.5" /> Temp</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{temperature}°C</span>
          </div>
          <input
            id="sim-temp-slider"
            type="range"
            min="-10"
            max="85"
            step="0.5"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-rose-500 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Humidity slider */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span className="flex items-center gap-1 text-sky-500"><Droplets className="h-3.5 w-3.5" /> Humidity</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{humidity}%</span>
          </div>
          <input
            id="sim-humidity-slider"
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={humidity}
            onChange={(e) => setHumidity(parseFloat(e.target.value))}
            className="w-full accent-sky-500 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Voltage/Battery slider */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span className="flex items-center gap-1 text-emerald-500"><Battery className="h-3.5 w-3.5" /> Voltage</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{voltage} V</span>
          </div>
          <input
            id="sim-voltage-slider"
            type="range"
            min="2.5"
            max="5.0"
            step="0.05"
            value={voltage}
            onChange={(e) => setVoltage(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Threshold limits helper info */}
        <div className="bg-slate-50 dark:bg-[#0f172a] p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Active Alert Bounds
          </div>
          <div className="grid grid-cols-3 gap-2 text-center font-mono mt-1">
            <div>
              <span className="block text-[9px] text-slate-400">Temp</span>
              {thresholds.tempMin}°C - {thresholds.tempMax}°C
            </div>
            <div>
              <span className="block text-[9px] text-slate-400">Hum</span>
              {thresholds.humidityMin}% - {thresholds.humidityMax}%
            </div>
            <div>
              <span className="block text-[9px] text-slate-400">Volt</span>
              {thresholds.voltageMin}V - {thresholds.voltageMax}V
            </div>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Interval</span>
              <select
                id="sim-interval-select"
                value={intervalSec}
                onChange={(e) => setIntervalSec(parseInt(e.target.value))}
                className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value={2}>2s</option>
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            </div>

            <button
              id="sim-send-btn"
              onClick={sendTelemetry}
              disabled={isSending || isSimulating}
              className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-medium rounded-lg border border-cyan-500/20 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSending ? 'animate-spin' : ''}`} />
              Send Single
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              id="sim-toggle-btn"
              onClick={() => setIsSimulating(!isSimulating)}
              className={`w-full flex items-center justify-center gap-2 text-xs py-2 px-4 rounded-xl font-medium transition-colors ${
                isSimulating
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              }`}
            >
              {isSimulating ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop Auto-Send
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Start Auto-Send
                </>
              )}
            </button>
          </div>

          <div className="flex justify-between items-center mt-3 text-[11px] text-slate-400 font-mono">
            <span>Last Packet Sent:</span>
            <span>{lastSent}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
