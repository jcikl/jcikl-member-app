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

          // Step 1: Try to find existing member by email first
          let memberDocRef = null;
          let memberDoc = null;
          let userData: User;

          if (firebaseUser.email) {
            // Normalize email to lowercase for consistent matching
            const normalizedEmail = firebaseUser.email.toLowerCase().trim();
            console.log(`🔍 [Google Login] Searching for existing member with email: ${firebaseUser.email}`);
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
              memberDoc = emailResults.docs[0];
              memberDocRef = memberDoc.ref;
              const memberData = memberDoc.data();
              console.log(`✅ [Google Login] Found existing member: ${memberDoc.id}`);
              console.log(`📋 [Google Login] Member data:`, {
                id: memberDoc.id,
                name: memberData.name,
                email: memberData.email,
                category: memberData.category,
                status: memberData.status,
              });
            } else {
              console.log(`❌ [Google Login] No existing member found with email: ${firebaseUser.email}`);
              console.log(`💡 [Google Login] Will create new member or check Google UID`);
            }
          }

          if (memberDoc && memberDocRef) {
            // Step 2: Link Google UID to existing member document
            const existingData = memberDoc.data() as any; // Preserve all Member fields
            
            console.log(`🔗 [Google Login] Using existing member data: ${memberDoc.id}`);
            console.log(`📊 [Google Login] Existing data keys:`, Object.keys(existingData));
            
            // Calculate new avatar
            const newAvatar = firebaseUser.photoURL || existingData.avatar || existingData.profile?.avatar;
            
            // Use the existing member's data directly (read-only approach)
            // We don't update the document to avoid permission issues
            userData = {
              id: memberDoc.id,
              ...existingData, // This includes profile, business, jciCareer, etc.
              googleLinked: true,
              googleUid: firebaseUser.uid,
              ...(newAvatar && { avatar: newAvatar }),
            } as User;
            
            console.log(`✅ [Google Login] Using existing member data (read-only mode)`);
            console.log(`💡 [Google Login] Note: Document not updated to avoid permission issues`);

            console.log(`✅ [Google Login] Successfully linked Google account to member: ${existingData.name}`);
            console.log(`📦 [Google Login] User data includes:`, {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              hasProfile: !!userData.profile,
              hasBusiness: !!userData.business,
              hasJciCareer: !!userData.jciCareer,
              category: userData.category,
              status: userData.status,
              googleLinked: userData.googleLinked,
              googleUid: userData.googleUid,
            });
          } else {
            // Step 3: Check if Google UID already exists (user previously logged in with Google)
            const googleDocRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, firebaseUser.uid);
            const googleDoc = await getDoc(googleDocRef);

            if (googleDoc.exists()) {
              // Existing Google user
              userData = {
                id: googleDoc.id,
                ...googleDoc.data(),
              } as User;

              // Update avatar if changed
              if (firebaseUser.photoURL && firebaseUser.photoURL !== userData.avatar) {
                await setDoc(
                  googleDocRef,
                  cleanUndefinedValues({ 
                    avatar: firebaseUser.photoURL,
                    updatedAt: new Date().toISOString(),
                  }),
                  { merge: true }
                );
                userData.avatar = firebaseUser.photoURL;
              }
            } else {
              // Step 4: Create completely new user with Google UID as document ID
              console.log(`🆕 [Google Login] Creating new member with Google account`);
              
              const newUser: Omit<User, 'id'> = {
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                avatar: firebaseUser.photoURL || undefined,
                role: 'member',
                status: 'pending',
                googleLinked: true,
                googleUid: firebaseUser.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              await setDoc(googleDocRef, cleanUndefinedValues(newUser));

              userData = {
                id: firebaseUser.uid,
                ...newUser,
              } as User;
            }
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
              
              // Step 1: For Google users, prioritize email-based lookup to find original member document
              if (firebaseUser.email && firebaseUser.providerData.some(p => p.providerId === 'google.com')) {
                console.log(`🔍 [CheckAuth] Google user detected, searching by email first:`, firebaseUser.email);
                
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
                  console.log(`⚠️ [CheckAuth] No member found by email, falling back to UID`);
                }
              }
              
              // Step 2: If not found by email, try UID (for non-Google users or fallback)
              if (!userDoc) {
                console.log(`🔍 [CheckAuth] Searching by UID:`, firebaseUser.uid);
                const uidDoc = await getDoc(
                  doc(db, GLOBAL_COLLECTIONS.MEMBERS, firebaseUser.uid)
                );
                if (uidDoc.exists()) {
                  userDoc = uidDoc;
                  console.log(`✅ [CheckAuth] Found user by UID:`, userDoc.id);
                }
              }

              if (userDoc.exists()) {
                const userData = {
                  id: userDoc.id,
                  ...userDoc.data(),
                } as User;

                console.log(`✅ [CheckAuth] User data loaded:`, {
                  id: userData.id,
                  email: userData.email,
                  name: userData.name,
                  category: userData.category,
                });

                set({
                  user: userData,
                  firebaseUser,
                  isAuthenticated: true,
                  loading: false,
                });
              } else {
                console.log(`❌ [CheckAuth] No member found for:`, firebaseUser.email);
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



