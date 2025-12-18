import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, IdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole } from '../../types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshRole: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (currentUser: User) => {
    try {
      // 1. Try Custom Claims first (Best performance)
      const tokenResult: IdTokenResult = await currentUser.getIdTokenResult(true);
      let userRole = tokenResult.claims.role as UserRole;

      // 2. If no custom claim, fallback to Firestore Document (Dev/Manual setup)
      if (!userRole) {
         const userDocRef = doc(db, 'users', currentUser.uid);
         const userDoc = await getDoc(userDocRef);
         if (userDoc.exists()) {
             const data = userDoc.data();
             if (data.role) {
                 userRole = data.role as UserRole;
             }
         }
      }

      setRole(userRole || null);
    } catch (e) {
      console.error("Error fetching user role", e);
      setRole(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchRole(currentUser);
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshRole = async () => {
    if (user) await fetchRole(user);
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setRole(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  // Memoize context value to prevent unnecessary re-renders of consuming components
  const value = useMemo(() => ({
      user, role, loading, signOut, refreshRole
  }), [user, role, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
