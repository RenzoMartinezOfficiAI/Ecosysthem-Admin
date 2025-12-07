"public": "public",
...
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZ4LdI4fk2ZxvBz79Gs6HdaoByvVR-vGo",
  authDomain: "ecosysthem-admin.firebaseapp.com",
  databaseURL: "https://ecosysthem-admin-default-rtdb.firebaseio.com",
  projectId: "ecosysthem-admin",
  storageBucket: "ecosysthem-admin.firebasestorage.app",
  messagingSenderId: "453418459474",
  appId: "1:453418459474:web:59bd7ada18c94363b0da8b"
};

// Singleton pattern to prevent re-initialization in some dev environments
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

export default app;