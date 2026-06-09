import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// The Firebase web config is public by design (the apiKey identifies the
// project; security comes from backend token verification + Firebase rules).
// Values come from VITE_FIREBASE_* (see .env.local / .env.example).
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = firebaseEnabled ? initializeApp(firebaseConfig) : undefined;
export const auth = app ? getAuth(app) : undefined;
export const googleProvider = new GoogleAuthProvider();
