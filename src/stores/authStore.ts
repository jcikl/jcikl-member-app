import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config';
import { cleanUndefinedValues } from '@/utils/dataHelpers';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      /**
       * Login with email and password
       */
      login: async (email: string, password: string) => {
        try {
          set({ loading: true, error: null });

          // Sign in with Firebase
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;

          // Get user data from Firestore
          const userDoc = await getDoc(
            doc(db, GLOBAL_COLLECTIONS.MEMBERS, firebaseUser.uid)
          );

          if (!userDoc.exists()) {
            throw new Error('用户数据不存在');
          }

          const userData = {
            id: userDoc.id,
            ...userDoc.data(),
          } as User;

          // Check user status
          if (userData.status === 'suspended') {
            await firebaseSignOut(auth);
            throw new Error('账号已被停用');
          }

          set({
            user: userData,
            firebaseUser,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || '登录失败',
            loading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Register with email and password
       */
      register: async (email: string, password: string, name: string) => {
        try {
          set({ loading: true, error: null });

          // Create user with email and password
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;

          // Update display name
          await updateProfile(firebaseUser, {
            displayName: name,
          });

          // Create user document in Firestore
          const newUser: Omit<User, 'id'> = {
            email: firebaseUser.email || email,
            name: name,
            avatar: undefined,
            role: 'member',
            status: 'pending', // New users need approval
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await setDoc(
            doc(db, GLOBAL_COLLECTIONS.MEMBERS, firebaseUser.uid),
            cleanUndefinedValues(newUser)
          );

          const userData: User = {
            id: firebaseUser.uid,
            ...newUser,
          };

          set({
            user: userData,
            firebaseUser,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.message || '注册失败',
            loading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Login with Google
       */
      loginWithGoogle: async () => {
        try {
          set({ loading: true, error: null });

          // Create Google Auth Provider
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({
            prompt: 'select_account',
          });

          // Sign in with popup
          const result = await signInWithPopup(auth, provider);
          const firebaseUser = result.user;

          // Check if user exists in Firestore
          const userDocRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          let userData: User;

          if (!userDoc.exists()) {
            // Create new user in Firestore
            const newUser: Omit<User, 'id'> = {
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              avatar: firebaseUser.photoURL || undefined,
              role: 'member',
              status: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await setDoc(userDocRef, cleanUndefinedValues(newUser));

            userData = {
              id: firebaseUser.uid,
              ...newUser,
            };
          } else {
            // User exists, get data
            userData = {
              id: userDoc.id,
              ...userDoc.data(),
            } as User;

            // Update avatar if changed
            if (firebaseUser.photoURL && firebaseUser.photoURL !== userData.avatar) {
              await setDoc(
                userDocRef,
                cleanUndefinedValues({ avatar: firebaseUser.photoURL }),
                { merge: true }
              );
              userData.avatar = firebaseUser.photoURL;
            }
          }

          // Check user status
          if (userData.status === 'suspended') {
            await firebaseSignOut(auth);
            throw new Error('账号已被停用');
          }

          set({
            user: userData,
            firebaseUser,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          // Handle specific Google login errors
          let errorMessage = '登录失败';

          if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = '登录已取消';
          } else if (error.code === 'auth/popup-blocked') {
            errorMessage = '弹窗被浏览器阻止，请允许弹窗';
          } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = '登录请求已取消';
          } else if (error.message) {
            errorMessage = error.message;
          }

          set({
            error: errorMessage,
            loading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Logout
       */
      logout: async () => {
        try {
          await firebaseSignOut(auth);
          set({
            user: null,
            firebaseUser: null,
            isAuthenticated: false,
            error: null,
          });
        } catch (error: any) {
          set({ error: error.message || '登出失败' });
          throw error;
        }
      },

      /**
       * Check authentication state
       */
      checkAuth: () => {
        onAuthStateChanged(auth, async firebaseUser => {
          if (firebaseUser) {
            try {
              // Get user data
              const userDoc = await getDoc(
                doc(db, GLOBAL_COLLECTIONS.MEMBERS, firebaseUser.uid)
              );

              if (userDoc.exists()) {
                const userData = {
                  id: userDoc.id,
                  ...userDoc.data(),
                } as User;

                set({
                  user: userData,
                  firebaseUser,
                  isAuthenticated: true,
                  loading: false,
                });
              } else {
                set({
                  user: null,
                  firebaseUser: null,
                  isAuthenticated: false,
                  loading: false,
                });
              }
            } catch (error) {
              set({
                user: null,
                firebaseUser: null,
                isAuthenticated: false,
                loading: false,
              });
            }
          } else {
            set({
              user: null,
              firebaseUser: null,
              isAuthenticated: false,
              loading: false,
            });
          }
        });
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);



