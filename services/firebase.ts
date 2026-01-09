import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth, setPersistence, browserLocalPersistence } from "firebase/auth";

const STORAGE_KEY = 'dharma_firebase_config';

// Safe access to environment variables (supports process.env and import.meta.env)
const getEnv = (key: string) => {
  try {
    // Check import.meta.env (Vite/Modern)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
    
    // Check process.env (Webpack/Create React App)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch {
    return undefined;
  }
  return undefined;
};

// 1. Check for Env Vars (Build time)
// Supports both REACT_APP_ (CRA) and VITE_ (Vite) prefixes
const envConfig = {
  apiKey: getEnv('REACT_APP_FIREBASE_API_KEY') || getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('REACT_APP_FIREBASE_AUTH_DOMAIN') || getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('REACT_APP_FIREBASE_PROJECT_ID') || getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('REACT_APP_FIREBASE_STORAGE_BUCKET') || getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID') || getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('REACT_APP_FIREBASE_APP_ID') || getEnv('VITE_FIREBASE_APP_ID')
};

// 2. Check Local Storage (Runtime override)
let localConfig: any = {};
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
     localConfig = JSON.parse(stored);
     console.log("DHARMA: Loaded Firebase config from LocalStorage");
  }
} catch (e) {
  console.error("Error reading firebase config from storage", e);
}

// 3. Construct Final Config
export const firebaseConfig = {
  apiKey: envConfig.apiKey || localConfig.apiKey || "YOUR_API_KEY_HERE",
  authDomain: envConfig.authDomain || localConfig.authDomain || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: envConfig.projectId || localConfig.projectId || "YOUR_PROJECT_ID",
  storageBucket: envConfig.storageBucket || localConfig.storageBucket || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: envConfig.messagingSenderId || localConfig.messagingSenderId || "YOUR_MESSAGING_SENDER_ID",
  appId: envConfig.appId || localConfig.appId || "YOUR_APP_ID"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;

try {
  // Prevent multiple initializations
  if (!getApps().length) {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
       app = initializeApp(firebaseConfig);
       console.log("DHARMA: Firebase Initialized Successfully");
    } else {
       console.warn("DHARMA: Firebase Config invalid, waiting for user input.");
    }
  } else {
    app = getApps()[0];
  }
  
  if (app) {
     auth = getAuth(app);
     
     // Ensure auth state persists across refreshes
     setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("Auth Persistence Error:", error);
     });

     googleProvider = new GoogleAuthProvider();
     // Add scopes if needed (e.g. for Drive access), but for login default is fine
     googleProvider.addScope('profile');
     googleProvider.addScope('email');
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

export { auth, googleProvider };

// Helper to save config from UI and reload
export const saveFirebaseConfig = (config: any) => {
  if (!config || !config.apiKey) {
    alert("Invalid Configuration Object");
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
};

export const resetFirebaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};