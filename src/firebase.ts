import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAwl8dB6LeI6GkTniQ91Y3K4x5OKTH_cmI",
  authDomain: "gen-lang-client-0469186857.firebaseapp.com",
  projectId: "gen-lang-client-0469186857",
  storageBucket: "gen-lang-client-0469186857.firebasestorage.app",
  messagingSenderId: "331433534538",
  appId: "1:331433534538:web:003a6f3ef707a3b99032b3"
};

const app = initializeApp(firebaseConfig);

// Use the specific firestore database ID from configuration
export const db = getFirestore(app, "ai-studio-ffdf5d1c-74b9-42f5-94a7-5b52946fd3d2");

export const auth = getAuth(app);

