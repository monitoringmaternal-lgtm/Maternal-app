import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { SensorReading } from '../types';
import { Download, FileSpreadsheet, RefreshCw, Filter, Calendar, Activity, Database } from 'lucide-react';

export default function ExportLogs() {
  const [logs, setLogs] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDevice, setFilterDevice] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [maxLogs, setMaxLogs] = useState<number>(100);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const readingsCol = collection(db, 'sensor_readings');
      const q = query(readingsCol, orderBy('timestamp', 'desc'), limit(maxLogs));
      const querySnapshot = await getDocs(q);
      
      const fetchedLogs: SensorReading[] = [];
      querySnapshot.forEach((doc) => {
        const item = doc.data();
        fetchedLogs.push({
          id: doc.id,
          temperature: item.temperature,
          humidity: item.humidity,
          voltage: item.voltage,
          deviceId: item.deviceId || 'ESP32',
          status: item.status || 'Normal',
          timestamp: item.timestamp ? item.timestamp.toDate() : new Date()
        });
      });
      setLogs(fetchedLogs);
    } catch (e) {
      console.error("Error fetching logs for export: ", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [maxLogs]);

  // List unique devices for filtering
  const devices = ['All', ...new Set(logs.map(log => log.deviceId))];

  // Filtering logs
  const filteredLogs = logs.filter(log => {
    const matchDevice = filterDevice === 'All' || log.deviceId === filterDevice;
    const matchStatus = filterStatus === 'All' || log.status === filterStatus;
    return matchDevice && matchStatus;
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    // Define CSV columns
    const headers = ['Record ID', 'Timestamp', 'Device ID', 'Temperature (°C)', 'Humidity (%)', 'Node Voltage (V)', 'Status'];
    
    // Format rows
    const rows = filteredLogs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.deviceId,
      log.temperature.toFixed(1),
      log.humidity.toFixed(1),
      log.voltage.toFixed(2),
      log.status
    ]);

    // Create CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `esp32_telemetry_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 sm:p-6 shadow-sm">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-cyan-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Sensor Data Logs & Export</h3>
        </div>
        
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="logs-refresh-btn"
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-[#0f172a] dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="logs-export-csv-btn"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/10 dark:shadow-none disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV ({filteredLogs.length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter Device ID
          </label>
          <select
            id="filter-device"
            value={filterDevice}
            onChange={(e) => setFilterDevice(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {devices.map(dev => (
              <option key={dev} value={dev}>{dev}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Activity className="h-3 w-3" /> Filter status
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="All">All Statuses</option>
            <option value="Normal">Normal</option>
            <option value="Alert">Alert Only</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Query volume
          </label>
          <select
            id="filter-volume"
            value={maxLogs}
            onChange={(e) => setMaxLogs(parseInt(e.target.value))}
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value={50}>Last 50 packets</option>
            <option value={100}>Last 100 packets</option>
            <option value={200}>Last 200 packets</option>
            <option value={500}>Last 500 packets</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <th className="p-3">Time</th>
              <th className="p-3">Device</th>
              <th className="p-3">Temp</th>
              <th className="p-3">Humidity</th>
              <th className="p-3">Voltage</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  <div className="h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading database records...
                </td>
              </tr>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr id={`log-row-${log.id}`} key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 font-mono">
                  <td className="p-3">
                    {log.timestamp.toLocaleDateString([], { month: '2-digit', day: '2-digit' })}{' '}
                    {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-3 text-slate-800 dark:text-slate-200">{log.deviceId}</td>
                  <td className="p-3 font-semibold text-rose-500">{log.temperature.toFixed(1)}°C</td>
                  <td className="p-3 font-semibold text-sky-500">{log.humidity.toFixed(1)}%</td>
                  <td className="p-3 font-semibold text-emerald-500">{log.voltage.toFixed(2)}V</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'Alert'
                        ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                        : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                  No records match the active filter parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
