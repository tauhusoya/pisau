import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCz_eGjHl52wrWgHubfvjuD4nkKaSGdfI0",
  authDomain: "knives-laravel.firebaseapp.com",
  projectId: "knives-laravel",
  storageBucket: "knives-laravel.appspot.com",
  messagingSenderId: "837297189287",
  appId: "1:837297189287:web:783b288ca8ee698b2f8682"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enhanced session management
class FirebaseSessionManager {
  constructor() {
    this.isInitialized = false;
    this.sessionCheckInterval = null;
    this.init();
  }

  async init() {
    try {
      // Set persistence to LOCAL (survives browser restarts)
      await setPersistence(auth, browserLocalPersistence);
      console.log('Firebase: Persistence set to LOCAL');

      // Set up auth state listener
      this.setupAuthStateListener();

      // Start session monitoring
      this.startSessionMonitoring();

      this.isInitialized = true;
      console.log('Firebase: Session manager initialized');
    } catch (error) {
      console.error('Firebase: Error initializing session manager:', error);
    }
  }

  setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Firebase: User authenticated:', user.email);
        this.storeUserSession(user);
      } else {
        console.log('Firebase: User signed out');
        this.clearUserSession();
      }
    });
  }

  storeUserSession(user) {
    try {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        lastSignInTime: user.metadata.lastSignInTime,
        sessionStart: new Date().toISOString()
      };

      localStorage.setItem('firebaseUser', JSON.stringify(userData));
      localStorage.setItem('firebaseSessionActive', 'true');
      console.log('Firebase: User session stored');
    } catch (error) {
      console.error('Firebase: Error storing user session:', error);
    }
  }

  clearUserSession() {
    try {
      localStorage.removeItem('firebaseUser');
      localStorage.removeItem('firebaseSessionActive');
      console.log('Firebase: User session cleared');
    } catch (error) {
      console.error('Firebase: Error clearing user session:', error);
    }
  }

  startSessionMonitoring() {
    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionValidity();
    }, 5 * 60 * 1000);
  }

  async checkSessionValidity() {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Refresh the token to ensure it's still valid
        await currentUser.getIdToken(true);
        console.log('Firebase: Session is valid');
      } catch (error) {
        console.error('Firebase: Session expired, signing out');
        await auth.signOut();
      }
    }
  }

  stopSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  getStoredUser() {
    try {
      const userData = localStorage.getItem('firebaseUser');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Firebase: Error getting stored user:', error);
      return null;
    }
  }

  isSessionActive() {
    return localStorage.getItem('firebaseSessionActive') === 'true';
  }
}

// Initialize session manager
const sessionManager = new FirebaseSessionManager();

export { auth, db, storage, sessionManager };
