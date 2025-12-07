import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAEmiQ7Z8VPdG3rCXxz4iIig_nx8uJughM",
  authDomain: "ecosysthem-admin-5176766-fd6e2.firebaseapp.com",
  projectId: "ecosysthem-admin-5176766-fd6e2",
  storageBucket: "ecosysthem-admin-5176766-fd6e2.firebasestorage.app",
  messagingSenderId: "302755902426",
  appId: "1:302755902426:web:874c07193686771cd2c6e3"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

export default app;