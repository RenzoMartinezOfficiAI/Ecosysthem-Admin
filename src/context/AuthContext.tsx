import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, IdTokenResult } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserRole } from '../../types'; // Adjust import path if needed

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
      // Force refresh to get latest claims
      const tokenResult: IdTokenResult = await currentUser.getIdTokenResult(true);
      const userRole = tokenResult.claims.role as UserRole;
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
        // Initial fetch logic
        const tokenResult = await currentUser.getIdTokenResult();
        setRole(tokenResult.claims.role as UserRole || null);
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

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};