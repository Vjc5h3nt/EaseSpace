import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, httpsCallable, Functions } from "firebase/functions";
import { firebaseConfig } from "./config";

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);
functions = getFunctions(app);

// If you are using the Firebase Emulator Suite, connect to the functions emulator
if (process.env.NODE_ENV === 'development') {
    // getFunctions(app, 'us-central1') to specify a region
    // connectFunctionsEmulator(functions, "localhost", 5001);
}

export { app, auth, db, storage, functions, httpsCallable };
export * from './provider';
