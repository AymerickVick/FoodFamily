import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAJxkL3eaH14IhAlmrA-U4pZgo_RzxIWAw",
  authDomain: "familly-d600e.firebaseapp.com",
  projectId: "familly-d600e",
  storageBucket: "familly-d600e.firebasestorage.app",
  messagingSenderId: "803469541794",
  appId: "1:803469541794:web:a71eeb230b4883b81ef2fb",
  measurementId: "G-FQZ4E8T0WB"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);