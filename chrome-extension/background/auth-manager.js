// Auth Manager - Handles Firebase Authentication
import { 
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

export class AuthManager {
  constructor(auth) {
    this.auth = auth;
    this.currentUser = null;
  }

  // Sign in with Google using Chrome Identity API
  async signIn() {
    try {
      // Use Chrome Identity API for OAuth
      const token = await this.getAuthToken();
      
      if (token) {
        // Create Firebase credential with the token
        const credential = GoogleAuthProvider.credential(null, token);
        
        // Sign in to Firebase
        const result = await signInWithCredential(this.auth, credential);
        this.currentUser = result.user;
        
        console.log('User signed in:', this.currentUser.uid);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Get OAuth token using Chrome Identity API
  async getAuthToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  // Sign out
  async signOut() {
    try {
      await signOut(this.auth);
      
      // Revoke Chrome Identity token
      const token = await this.getAuthToken();
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          console.log('Token revoked');
        });
      }
      
      this.currentUser = null;
      console.log('User signed out');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current auth state
  async getAuthState() {
    return {
      isAuthenticated: !!this.currentUser,
      user: this.currentUser ? {
        uid: this.currentUser.uid,
        email: this.currentUser.email,
        displayName: this.currentUser.displayName,
        photoURL: this.currentUser.photoURL
      } : null
    };
  }

  // Set up auth state listener
  onAuthStateChanged(callback) {
    return onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      callback(user);
    });
  }
}