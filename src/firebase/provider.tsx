'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
}

const FirebaseContext = createContext<FirebaseContextType>({ app: null, auth: null, db: null, storage: null });

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebase, setFirebase] = useState<FirebaseContextType>({ app: null, auth: null, db: null, storage: null });

  useEffect(() => {
    let app: FirebaseApp;
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    setFirebase({ app, auth, db, storage });
  }, []);

  return <FirebaseContext.Provider value={firebase}>{children}</FirebaseContext.Provider>;
};

export const useFirebase = () => useContext(FirebaseContext);
export const useAuth = () => useContext(FirebaseContext).auth;
export const useFirestore = () => useContext(FirebaseContext).db;
export const useStorage = () => useContext(FirebaseContext).storage;
