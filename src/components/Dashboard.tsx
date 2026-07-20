import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { SensorReading, AlertThresholds } from '../types';
import {
  Thermometer,
  Droplets,
  Battery,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  Zap,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  thresholds: AlertThresholds;
}

export default function Dashboard({ thresholds }: DashboardProps) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [chartMetric, setChartMetric] = useState<'temperature' | 'humidity' | 'voltage'>('temperature');
  const [recordLimit, setRecordLimit] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to Firestore for sensor readings in real-time
    const readingsCol = collection(db, 'sensor_readings');
    const q = query(readingsCol, orderBy('timestamp', 'desc'), limit(recordLimit));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: SensorReading[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data();
        data.push({
          id: doc.id,
          temperature: item.temperature,
          humidity: item.humidity,
          voltage: item.voltage,
          deviceId: item.deviceId || 'ESP32',
          status: item.status || 'Normal',
          timestamp: item.timestamp ? item.timestamp.toDate() : new Date()
        });
      });

      setReadings(data);
      if (data.length > 0) {
        setLatest(data[0]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore real-time subscription error: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [recordLimit]);

  // Check if current values violate limits
  const isTempAlert = latest ? (latest.temperature > thresholds.tempMax || latest.temperature < thresholds.tempMin) : false;
  const isHumAlert = latest ? (latest.humidity > thresholds.humidityMax || latest.humidity < thresholds.humidityMin) : false;
  const isVoltAlert = latest ? (latest.voltage > thresholds.voltageMax || latest.voltage < thresholds.voltageMin) : false;
  const hasAlert = isTempAlert || isHumAlert || isVoltAlert;

  // Formatting chart data (reverse to display oldest to newest)
  const chartData = [...readings].reverse().map(r => ({
    time: r.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    temperature: r.temperature,
    humidity: r.humidity,
    voltage: r.voltage,
    rawTime: r.timestamp
  }));

  // Battery percentage estimate based on Li-ion voltage (3.2V - 4.2V range)
  const getBatteryPercent = (v: number) => {
    const min = 3.2;
    const max = 4.2;
    const pct = Math.round(((v - min) / (max - min)) * 100);
    return Math.min(Math.max(pct, 0), 100);
  };

  const metricColors = {
    temperature: {
      stroke: '#ef4444',
      fill: 'rgba(239, 68, 68, 0.1)',
      gradStart: '#ef4444',
      gradEnd: 'rgba(239, 68, 68, 0)'
    },
    humidity: {
      stroke: '#0ea5e9',
      fill: 'rgba(14, 165, 233, 0.1)',
      gradStart: '#0ea5e9',
      gradEnd: 'rgba(14, 165, 233, 0)'
    },
    voltage: {
      stroke: '#10b981',
      fill: 'rgba(16, 185, 129, 0.1)',
      gradStart: '#10b981',
      gradEnd: 'rgba(16, 185, 129, 0)'
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Telemetry Status Banner */}
      {loading ? (
        <div className="flex items-center justify-center h-20 bg-slate-50 dark:bg-slate-850 rounded-2xl animate-pulse">
          <Activity className="h-5 w-5 text-indigo-500 animate-spin mr-2" />
          <span className="text-sm font-medium text-slate-500">Connecting to telemetry network...</span>
        </div>
      ) : latest ? (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-colors ${
          hasAlert
            ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50 text-rose-800 dark:text-rose-400'
            : 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400'
        }`}>
          <div className="flex items-center gap-3">
            {hasAlert ? (
              <div className="h-10 w-10 bg-rose-500 text-white rounded-xl flex items-center justify-center animate-pulse">
                <AlertTriangle className="h-5 w-5" />
              </div>
            ) : (
              <div className="h-10 w-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="font-bold text-sm">
                {hasAlert ? 'CRITICAL: Threshold Violations Detected' : 'SYSTEM HEALTH: Stable'}
              </div>
              <div className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Live Feed: {latest.deviceId} (Last Sync {latest.timestamp.toLocaleTimeString()})
              </div>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              hasAlert ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {hasAlert ? 'ALERT' : 'ONLINE'}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No Telemetry Received Yet</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            Activate the <b>ESP32 Hardware Simulator</b> panel at the bottom to begin broadcasting real-time data to Firestore.
          </p>
        </div>
      )}

      {/* Sensor Grid (3 Pillars) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Temp Card */}
        <div className={`p-6 rounded-3xl border transition-all ${
          isTempAlert
            ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-300 dark:border-rose-900/50'
            : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700/50 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-rose-500" /> Temperature
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isTempAlert ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400'
            }`}>
              {isTempAlert ? 'LIMIT EXCEEDED' : 'NORMAL'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">
              {latest ? latest.temperature.toFixed(1) : '--.-'}
            </span>
            <span className="text-lg font-bold text-slate-500">°C</span>
          </div>
          {/* Progress bar mapping */}
          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-[#0f172a] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isTempAlert ? 'bg-rose-500' : 'bg-rose-400'}`}
                style={{ width: `${Math.min(Math.max(((latest?.temperature || 24) + 10) / 95 * 100, 0), 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>{thresholds.tempMin}°C Min</span>
              <span>{thresholds.tempMax}°C Max</span>
            </div>
          </div>
        </div>

        {/* Humidity Card */}
        <div className={`p-6 rounded-3xl border transition-all ${
          isHumAlert
            ? 'bg-sky-50/50 dark:bg-sky-950/10 border-sky-300 dark:border-sky-900/50'
            : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700/50 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-sky-500" /> Humidity
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isHumAlert ? 'bg-sky-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400'
            }`}>
              {isHumAlert ? 'LIMIT EXCEEDED' : 'NORMAL'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">
              {latest ? latest.humidity.toFixed(1) : '--.-'}
            </span>
            <span className="text-lg font-bold text-slate-500">%</span>
          </div>
          {/* Progress bar mapping */}
          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-[#0f172a] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isHumAlert ? 'bg-sky-500' : 'bg-sky-400'}`}
                style={{ width: `${latest ? latest.humidity : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>{thresholds.humidityMin}% Min</span>
              <span>{thresholds.humidityMax}% Max</span>
            </div>
          </div>
        </div>

        {/* Battery / Voltage Card */}
        <div className={`p-6 rounded-3xl border transition-all ${
          isVoltAlert
            ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-900/50'
            : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700/50 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Battery className="h-4 w-4 text-emerald-500" /> Node Voltage
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isVoltAlert ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400'
            }`}>
              {isVoltAlert ? 'VOLTAGE OUT' : `${latest ? getBatteryPercent(latest.voltage) : 0}% BATTERY`}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">
              {latest ? latest.voltage.toFixed(2) : '-.--'}
            </span>
            <span className="text-lg font-bold text-slate-500">V</span>
          </div>
          {/* Progress bar mapping */}
          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-[#0f172a] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isVoltAlert ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${latest ? ((latest.voltage - 2.5) / 2.5) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>{thresholds.voltageMin}V Min</span>
              <span>{thresholds.voltageMax}V Max</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Trend Graphs */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Telemetry Trends & Analytics</h3>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Limit selector */}
            <select
              id="chart-limit-select"
              value={recordLimit}
              onChange={(e) => setRecordLimit(parseInt(e.target.value))}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value={10}>10 records</option>
              <option value={20}>20 records</option>
              <option value={50}>50 records</option>
              <option value={100}>100 records</option>
            </select>

            {/* Metric Tabs */}
            <div className="flex bg-slate-100 dark:bg-[#0f172a] p-1 rounded-xl">
              <button
                id="chart-tab-temp"
                onClick={() => setChartMetric('temperature')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  chartMetric === 'temperature'
                    ? 'bg-white dark:bg-[#1e293b] text-rose-500 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Temp
              </button>
              <button
                id="chart-tab-humidity"
                onClick={() => setChartMetric('humidity')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  chartMetric === 'humidity'
                    ? 'bg-white dark:bg-[#1e293b] text-sky-500 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Humid
              </button>
              <button
                id="chart-tab-voltage"
                onClick={() => setChartMetric('voltage')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  chartMetric === 'voltage'
                    ? 'bg-white dark:bg-[#1e293b] text-emerald-500 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Volt
              </button>
            </div>
          </div>
        </div>

        <div className="h-64 sm:h-80 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${chartMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricColors[chartMetric].gradStart} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={metricColors[chartMetric].gradEnd} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.2)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#94a3b8' }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke={metricColors[chartMetric].stroke}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#gradient-${chartMetric})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 text-xs gap-2">
              <Zap className="h-6 w-6 stroke-1 animate-bounce text-indigo-500" />
              <span>Broadcast data using the simulator to populate this chart.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
