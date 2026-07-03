import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAyueE-veGJqegAzxHr6fj-DRvKF_FU-xU",
  authDomain: "ministry-companion-7f836.firebaseapp.com",
  projectId: "ministry-companion-7f836",
  storageBucket: "ministry-companion-7f836.firebasestorage.app",
  messagingSenderId: "503033076207",
  appId: "1:503033076207:web:84b2e98c38156320db7e1a",
  measurementId: "G-PMZGQ9VYXR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
