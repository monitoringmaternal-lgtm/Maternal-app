import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { SensorAlert } from '../types';
import { BellRing, ShieldAlert, Thermometer, Droplets, Battery, Trash2, Check, Clock, ShieldCheck } from 'lucide-react';

interface AlertsListProps {
  userId: string;
}

export default function AlertsList({ userId }: AlertsListProps) {
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to real-time safety alerts matching operator ID
    const alertsCol = collection(db, 'alerts');
    const q = query(alertsCol, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: SensorAlert[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data();
        // Show alerts for this specific user or anonymous alerts for guests
        if (item.userId === userId || item.userId === 'anonymous' || !userId) {
          data.push({
            id: doc.id,
            userId: item.userId,
            timestamp: item.timestamp ? item.timestamp.toDate() : new Date(),
            type: item.type,
            sensorType: item.sensorType,
            value: item.value,
            threshold: item.threshold,
            read: item.read || false,
            message: item.message || 'Threshold warning triggered'
          });
        }
      });
      setAlerts(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore subscription error for alerts:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleMarkAllRead = async () => {
    try {
      const batch = writeBatch(db);
      alerts.forEach((alert) => {
        if (!alert.read) {
          const alertRef = doc(db, 'alerts', alert.id);
          batch.update(alertRef, { read: true });
        }
      });
      await batch.commit();
    } catch (e) {
      console.error("Error marking alerts as read: ", e);
    }
  };

  const handleClearAll = async () => {
    try {
      const promises = alerts.map((alert) => deleteDoc(doc(db, 'alerts', alert.id)));
      await Promise.all(promises);
    } catch (e) {
      console.error("Error clearing alert history: ", e);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const sec = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (sec < 60) return 'Just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getAlertStyle = (type: string) => {
    if (type === 'temperature') {
      return { bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-500', icon: Thermometer };
    }
    if (type === 'humidity') {
      return { bg: 'bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/40 text-sky-500', icon: Droplets };
    }
    return { bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-500', icon: Battery };
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative">
            <BellRing className="h-5 w-5 text-cyan-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Alert logs</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Chronological history of threshold crossings</p>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              id="alerts-mark-read-btn"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#0f172a] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" /> Mark All Read
            </button>
            <button
              id="alerts-clear-btn"
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1 border border-rose-100 dark:border-rose-900/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
          </div>
        )}
      </div>

      {/* List content */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => {
            const style = getAlertStyle(alert.sensorType);
            const Icon = style.icon;

            return (
              <div
                id={`alert-item-${alert.id}`}
                key={alert.id}
                className={`p-4 border rounded-3xl flex items-start gap-3 transition-all ${
                  alert.read
                    ? 'bg-white dark:bg-[#1e293b] border-slate-100 dark:border-slate-800/60 opacity-60'
                    : 'bg-white dark:bg-[#1e293b] border-cyan-500/30 dark:border-cyan-500/30 shadow-md shadow-cyan-500/5'
                }`}
              >
                {/* Alert Badge Icon */}
                <div className={`p-2.5 rounded-xl border flex-shrink-0 ${style.bg}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {alert.sensorType} WARNING
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatTimeAgo(alert.timestamp)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                    {alert.message}
                  </h4>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>Value: <strong className="text-slate-700 dark:text-slate-300">{alert.value}</strong></span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>Safety Boundary: <strong className="text-slate-700 dark:text-slate-300">{alert.threshold}</strong></span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/50 rounded-3xl shadow-sm">
            <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Safety Infractions</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
              Excellent! No threshold crossings are currently recorded. All system parameters are within bounds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
