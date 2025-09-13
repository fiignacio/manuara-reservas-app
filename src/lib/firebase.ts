import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA49rKxFV1Sr-zFsR6GASKLc0Hd5GBXYc0",
  authDomain: "gestion-reservas-manuara.firebaseapp.com",
  projectId: "gestion-reservas-manuara",
  storageBucket: "gestion-reservas-manuara.firebasestorage.app",
  messagingSenderId: "977714534745",
  appId: "1:977714534745:web:f64d41df6f79f8ee405448"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with optimized settings for better performance
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
});

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;