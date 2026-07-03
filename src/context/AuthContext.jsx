import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [currentUser,   setCurrentUser]   = useState(null);
  const [userProfile,   setUserProfile]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [needsProfile,  setNeedsProfile]  = useState(false);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password) {
    // Creates the Firebase Auth account; profile popup handles the rest
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    setUserProfile(null);
    setNeedsProfile(false);
    return signOut(auth);
  }

  async function saveProfile({ firstName, lastName, role, hourGoal }) {
    const uid  = auth.currentUser?.uid;
    if (!uid) return;
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    const data = {
      name,
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      role,
      hourGoal:  parseInt(hourGoal) || 0,
      email:     auth.currentUser.email,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid), data, { merge: true });
    setUserProfile(data);
    setNeedsProfile(false);
  }

  async function fetchUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists() && snap.data().firstName) {
      setUserProfile(snap.data());
      setNeedsProfile(false);
    } else {
      setNeedsProfile(true);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) await fetchUserProfile(user.uid);
      else { setUserProfile(null); setNeedsProfile(false); }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser, userProfile, loading, needsProfile,
      login, register, logout, saveProfile
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
