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
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config';
import { cleanUndefinedValues, removeNullish } from '@/utils/dataHelpers';
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

          const userData = {
            id: firebaseUser.uid,
            ...newUser,
          } as User;

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

          let userData: User;

          // ONLY search by email for Google users
          if (!firebaseUser.email) {
            throw new Error('Google 账号没有邮箱，无法登录');
          }

          console.log(`🔍 [Google Login] Searching for member with email: ${firebaseUser.email}`);
          
          // Normalize email to lowercase for consistent matching
          const normalizedEmail = firebaseUser.email.toLowerCase().trim();
          console.log(`📧 [Google Login] Normalized email: ${normalizedEmail}`);
          
          // Try exact match first
          let emailQuery = query(
            collection(db, GLOBAL_COLLECTIONS.MEMBERS),
            where('email', '==', firebaseUser.email),
            limit(1)
          );
          let emailResults = await getDocs(emailQuery);
          
          console.log(`🔍 [Google Login] Exact match query returned ${emailResults.size} results`);
          
          // If no exact match, try lowercase match
          if (emailResults.empty && normalizedEmail !== firebaseUser.email) {
            console.log(`🔍 [Google Login] Trying lowercase match...`);
            emailQuery = query(
              collection(db, GLOBAL_COLLECTIONS.MEMBERS),
              where('email', '==', normalizedEmail),
              limit(1)
            );
            emailResults = await getDocs(emailQuery);
            console.log(`🔍 [Google Login] Lowercase match query returned ${emailResults.size} results`);
          }
          
          if (!emailResults.empty) {
            // Found existing member - use their document directly
            const memberDoc = emailResults.docs[0];
            const existingData = memberDoc.data() as any;
            
            console.log(`✅ [Google Login] Found existing member: ${memberDoc.id}`);
            console.log(`📋 [Google Login] Member has:`, {
              id: memberDoc.id,
              name: existingData.name,
              email: existingData.email,
              category: existingData.category,
              status: existingData.status,
              hasProfile: !!existingData.profile,
              hasBusiness: !!existingData.business,
              hasJciCareer: !!existingData.jciCareer,
            });
            
            // Use the existing member's data with ALL fields
            userData = {
              id: memberDoc.id,
              ...existingData, // Inherit ALL settings, data, and permissions
              googleLinked: true,
              googleUid: firebaseUser.uid,
              avatar: firebaseUser.photoURL || existingData.avatar || existingData.profile?.avatar || undefined,
            } as User;

            console.log(`✅ [Google Login] Using member document with complete data`);
            console.log(`📦 [Google Login] Inherited:`, {
              profile: !!userData.profile,
              business: !!userData.business,
              jciCareer: !!userData.jciCareer,
              category: userData.category,
              permissions: !!userData.effectivePermissions || !!userData.profile?.effectivePermissions,
            });
          } else {
            // No existing member found - create new one
            console.log(`🆕 [Google Login] No member found, creating new account`);
            
            const newUser: Omit<User, 'id'> = {
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User',
              avatar: firebaseUser.photoURL || undefined,
              role: 'member',
              status: 'pending',
              googleLinked: true,
              googleUid: firebaseUser.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // Create with Google UID as document ID
            const newDocRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, firebaseUser.uid);
            await setDoc(newDocRef, cleanUndefinedValues(newUser));

            userData = {
              id: firebaseUser.uid,
              ...newUser,
            } as User;
            
            console.log(`✅ [Google Login] Created new member: ${userData.id}`);
          }

          // Check user status
          if (userData.status === 'suspended') {
            await firebaseSignOut(auth);
            throw new Error('账号已被停用');
          }

          console.log(`🎯 [Google Login] Setting auth state with user data:`, {
            userId: userData.id,
            email: userData.email,
            name: userData.name,
            category: userData.category,
            hasAllFields: Object.keys(userData).length,
          });

          set({
            user: userData,
            firebaseUser,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          
          console.log(`✅ [Google Login] Auth state updated successfully`);
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
              console.log(`🔄 [CheckAuth] Checking auth for user:`, firebaseUser.uid);
              console.log(`📧 [CheckAuth] User email:`, firebaseUser.email);
              
              let userDoc = null;
              const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com');
              
              // For Google users: ONLY search by email
              if (isGoogleUser && firebaseUser.email) {
                console.log(`🔍 [CheckAuth] Google user - searching ONLY by email:`, firebaseUser.email);
                
                const normalizedEmail = firebaseUser.email.toLowerCase().trim();
                let emailQuery = query(
                  collection(db, GLOBAL_COLLECTIONS.MEMBERS),
                  where('email', '==', firebaseUser.email),
                  limit(1)
                );
                let emailResults = await getDocs(emailQuery);
                
                console.log(`🔍 [CheckAuth] Email exact match returned ${emailResults.size} results`);
                
                // Try lowercase if exact match fails
                if (emailResults.empty && normalizedEmail !== firebaseUser.email) {
                  console.log(`🔍 [CheckAuth] Trying lowercase email match...`);
                  emailQuery = query(
                    collection(db, GLOBAL_COLLECTIONS.MEMBERS),
                    where('email', '==', normalizedEmail),
                    limit(1)
                  );
                  emailResults = await getDocs(emailQuery);
                  console.log(`🔍 [CheckAuth] Lowercase match returned ${emailResults.size} results`);
                }
                
                if (!emailResults.empty) {
                  userDoc = emailResults.docs[0];
                  console.log(`✅ [CheckAuth] Found member by email:`, userDoc.id);
                } else {
                  console.log(`❌ [CheckAuth] No member found with email for Google user`);
                }
              } else {
                // For non-Google users: search by UID
                console.log(`🔍 [CheckAuth] Non-Google user - searching by UID:`, firebaseUser.uid);
                const uidDoc = await getDoc(
                  doc(db, GLOBAL_COLLECTIONS.MEMBERS, firebaseUser.uid)
                );
                if (uidDoc.exists()) {
                  userDoc = uidDoc;
                  console.log(`✅ [CheckAuth] Found user by UID:`, userDoc.id);
                }
              }

              if (userDoc && userDoc.exists()) {
                const userData = {
                  id: userDoc.id,
                  ...userDoc.data(),
                } as User;

                console.log(`✅ [CheckAuth] User data loaded:`, {
                  id: userData.id,
                  email: userData.email,
                  name: userData.name,
                  category: userData.category,
                  hasProfile: !!userData.profile,
                  hasBusiness: !!userData.business,
                  hasJciCareer: !!userData.jciCareer,
                });

                set({
                  user: userData,
                  firebaseUser,
                  isAuthenticated: true,
                  loading: false,
                });
              } else {
                console.log(`❌ [CheckAuth] No member document found`);
                set({
                  user: null,
                  firebaseUser: null,
                  isAuthenticated: false,
                  loading: false,
                });
              }
            } catch (error) {
              console.error(`❌ [CheckAuth] Error:`, error);
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



