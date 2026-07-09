import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isMock } from '../firebase/config';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper: Mock Database setup
  const getMockUsers = () => JSON.parse(localStorage.getItem('mock_users') || '{}');
  const setMockUsers = (users) => localStorage.setItem('mock_users', JSON.stringify(users));

  useEffect(() => {
    if (isMock) {
      // Simulate onAuthStateChanged with localStorage
      const savedUser = localStorage.getItem('mock_current_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCurrentUser({ ...user, ...userDoc.data() });
          } else {
            setCurrentUser(user);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  // Signup
  const signup = async (email, password, displayName) => {
    setLoading(true);
    try {
      if (isMock) {
        const users = getMockUsers();
        if (users[email]) throw new Error("Email already exists.");

        const uid = 'mock_' + Math.random().toString(36).substr(2, 9);
        const newUser = {
          uid,
          email,
          displayName,
          role: null,
          photoURL: null,
          createdAt: new Date().toISOString()
        };

        users[email] = { ...newUser, password };
        setMockUsers(users);

        localStorage.setItem('mock_current_user', JSON.stringify(newUser));
        setCurrentUser(newUser);
        return newUser;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const profile = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || '',
        role: null,
        photoURL: user.photoURL || null,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), profile);
      setCurrentUser({ ...user, ...profile });
      return user;
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    setLoading(true);
    try {
      if (isMock) {
        const users = getMockUsers();
        const user = users[email];
        if (!user || user.password !== password) {
          throw new Error("Invalid email or password.");
        }
        const { password: _, ...profile } = user;
        localStorage.setItem('mock_current_user', JSON.stringify(profile));
        setCurrentUser(profile);
        return profile;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        setCurrentUser({ ...user, ...profile });
        return { ...user, ...profile };
      }
      setCurrentUser(user);
      return user;
    } finally {
      setLoading(false);
    }
  };

  // Google Login
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (isMock) {
        const email = 'google_demo@example.com';
        const users = getMockUsers();
        let profile = users[email];

        if (!profile) {
          const uid = 'mock_google_' + Math.random().toString(36).substr(2, 9);
          profile = {
            uid,
            email,
            displayName: 'Google Demo User',
            role: null,
            photoURL: null,
            createdAt: new Date().toISOString()
          };
          users[email] = profile;
          setMockUsers(users);
        }

        localStorage.setItem('mock_current_user', JSON.stringify(profile));
        setCurrentUser(profile);
        return profile;
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let profile = {};

      if (!userDoc.exists()) {
        profile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          role: null,
          photoURL: user.photoURL || null,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), profile);
      } else {
        profile = userDoc.data();
      }

      setCurrentUser({ ...user, ...profile });
      return { ...user, ...profile };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    try {
      if (isMock) {
        localStorage.removeItem('mock_current_user');
        setCurrentUser(null);
        return;
      }
      await signOut(auth);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const resetPassword = async (email) => {
    if (isMock) {
      const users = getMockUsers();
      if (!users[email]) throw new Error("Email address not found.");
      return; // Simulated success
    }
    await sendPasswordResetEmail(auth, email);
  };

  // Update Role
  const updateRole = async (role) => {
    if (!currentUser) throw new Error("No active user session.");
    setLoading(true);
    try {
      if (isMock) {
        const updated = { ...currentUser, role };
        const users = getMockUsers();
        // find profile key by email
        const email = currentUser.email;
        if (users[email]) {
          users[email].role = role;
          setMockUsers(users);
        }
        localStorage.setItem('mock_current_user', JSON.stringify(updated));
        setCurrentUser(updated);
        return;
      }

      await updateDoc(doc(db, 'users', currentUser.uid), { role });
      setCurrentUser((prev) => ({ ...prev, role }));
    } finally {
      setLoading(false);
    }
  };

  // Complete Onboarding
  const completeOnboarding = async (role, profileData, demoMode) => {
    if (!currentUser) throw new Error("No active user session.");
    setLoading(true);
    try {
      const updatedFields = {
        role,
        onboardingCompleted: true,
        profile: profileData,
        demoMode
      };

      if (isMock) {
        const updated = { ...currentUser, ...updatedFields };
        const users = getMockUsers();
        const email = currentUser.email;
        if (users[email]) {
          users[email] = { ...users[email], ...updatedFields };
          setMockUsers(users);
        }
        localStorage.setItem('mock_current_user', JSON.stringify(updated));
        setCurrentUser(updated);
        return;
      }

      await updateDoc(doc(db, 'users', currentUser.uid), updatedFields);
      setCurrentUser((prev) => ({ ...prev, ...updatedFields }));
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateRole,
    completeOnboarding,
    isMock
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
