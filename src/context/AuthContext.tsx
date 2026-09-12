import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType, testFirestoreConnection } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isOnline: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Run connection test on boot
    testFirestoreConnection().then(connected => {
      setIsOnline(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            setUserProfile({ ...data, role: 'super_admin' });
            setCurrentRole('super_admin');
          } else {
            // New user registration profile - exclusively super_admin
            const newProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || 'Super Admin',
              email: user.email || '',
              role: 'super_admin',
              status: 'active',
              photoURL: user.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
            setCurrentRole('super_admin');
          }
        } catch (err) {
          console.warn('User profile sync note:', err);
          // Fallback user profile in memory if Firestore rules or offline
          const fallbackProfile: UserProfile = {
            id: user.uid,
            name: user.displayName || 'Mangalparv Lead',
            email: user.email || 'krunalande1998@gmail.com',
            role: 'super_admin',
            status: 'active',
            photoURL: user.photoURL || undefined,
          };
          setUserProfile(fallbackProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign-in failed', err);
      setAuthError(err instanceof Error ? err.message : 'Google Sign-in failed');
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        currentRole,
        setCurrentRole,
        loading,
        signInWithGoogle,
        signOut,
        isOnline,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
