export interface AlertThresholds {
  tempMax: number;
  tempMin: number;
  humidityMax: number;
  humidityMin: number;
  voltageMin: number;
  voltageMax: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  alertSettings: AlertThresholds;
  darkMode: boolean;
}

export interface SensorReading {
  id: string;
  timestamp: any; // Firestore Timestamp or Date or string
  temperature: number;
  humidity: number;
  voltage: number;
  status: 'Normal' | 'Alert';
  deviceId: string;
}

export interface SensorAlert {
  id: string;
  userId: string;
  timestamp: any;
  type: 'temperature_high' | 'temperature_low' | 'humidity_high' | 'humidity_low' | 'voltage_low' | 'voltage_high';
  sensorType: 'temperature' | 'humidity' | 'voltage';
  value: number;
  threshold: number;
  read: boolean;
  message: string;
}
