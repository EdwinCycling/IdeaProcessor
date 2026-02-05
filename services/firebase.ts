import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase config is provided
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== '';

let app;
let db: any;
let auth: any;
let functions: any;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    functions = getFunctions(app, "us-central1"); // Default region
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase is not configured. Please fill in the .env file.");
}

export { db, auth, functions };

// Collection References
export const COLLECTIONS = {
  SESSIONS: 'sessions',
  IDEAS: 'ideas',
  USERS: 'users',
  SAVED_SESSIONS: 'saved_sessions',
  SESSION_CODES: 'session_codes'
};

// Default Session ID for this event - Legacy/Default
export const CURRENT_SESSION_ID = 'exact-live-event';
