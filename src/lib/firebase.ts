import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDZ4LdI4fk2ZxvBz79Gs6HdaoByvVR-vGo",
  authDomain: "ecosysthem-admin.firebaseapp.com",
  databaseURL: "https://ecosysthem-admin-default-rtdb.firebaseio.com",
  projectId: "ecosysthem-admin",
  storageBucket: "ecosysthem-admin.firebasestorage.app",
  messagingSenderId: "453418459474",
  appId: "1:453418459474:web:07c417cac096b4e3b0da8b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;