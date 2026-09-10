import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const provider = new GoogleAuthProvider();
// Request Google Drive & Google Sheets scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.setCustomParameters({
  prompt: 'consent select_account',
  access_type: 'offline',
});

// Flag to indicate ongoing sign-in flow
let isSigningIn = false;
let cachedAccessToken: string | null = null;
const SESSION_TOKEN_KEY = 'misfinanzas_g_token';
const SESSION_TOKEN_EXP_KEY = 'misfinanzas_g_token_exp';

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const savedToken = localStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
    const savedExp = localStorage.getItem(SESSION_TOKEN_EXP_KEY) || sessionStorage.getItem(SESSION_TOKEN_EXP_KEY);
    if (savedToken && savedExp && Date.now() < parseInt(savedExp, 10)) {
      cachedAccessToken = savedToken;
      return savedToken;
    }
  } catch (e) {
    // storage not available
  }
  return null;
};

export const hasActiveAccessToken = (): boolean => {
  if (cachedAccessToken) return true;
  try {
    const savedToken = localStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
    const savedExp = localStorage.getItem(SESSION_TOKEN_EXP_KEY) || sessionStorage.getItem(SESSION_TOKEN_EXP_KEY);
    return Boolean(savedToken && savedExp && Date.now() < parseInt(savedExp, 10));
  } catch (e) {
    return false;
  }
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      const exp = String(Date.now() + 3500 * 1000);
      localStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.setItem(SESSION_TOKEN_EXP_KEY, exp);
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(SESSION_TOKEN_EXP_KEY, exp);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_TOKEN_EXP_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_EXP_KEY);
    }
  } catch (e) {}
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = await getAccessToken();
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      setAccessTokenInMemory(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google para Drive y Sheets');
    }

    setAccessTokenInMemory(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      // User closed the popup window or canceled the prompt — not a runtime crash
      console.info('Ventana de inicio de sesión de Google cerrada por el usuario.');
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error(
        'El navegador bloqueó la ventana emergente de Google. Por favor permite las ventanas emergentes en la barra de direcciones.'
      );
    }
    if (
      error?.code === 'auth/unauthorized-domain' ||
      error?.message?.includes('unauthorized-domain')
    ) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      const customErr: any = new Error(
        `Dominio no autorizado (${currentHost}). Debes agregar este dominio en Firebase Console > Authentication > Settings > Dominios autorizados.`
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.isUnauthorizedDomain = true;
      customErr.domain = currentHost;
      customErr.projectId = firebaseConfig.projectId;
      throw customErr;
    }
    console.warn('Google Sign-in warning:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    setAccessTokenInMemory(null);
  }
};
