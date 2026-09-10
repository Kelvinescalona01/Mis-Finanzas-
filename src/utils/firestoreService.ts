import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebaseAuth';
import { Movimiento, MetaAhorro, AppSettings } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Clean document ID to conform to regex ^[a-zA-Z0-9_\-]+$
function sanitizeDocId(id: string): string {
  const sanitized = id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return sanitized || `doc_${Date.now()}`;
}

/**
 * Subscribe to user movements in real-time from Firestore
 */
export function subscribeUserMovimientos(
  userId: string,
  onUpdate: (movs: Movimiento[]) => void
): Unsubscribe {
  const subPath = `users/${userId}/movimientos`;
  const collRef = collection(db, 'users', userId, 'movimientos');

  return onSnapshot(
    collRef,
    (snapshot) => {
      const movements: Movimiento[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        movements.push({
          id: data.id || docSnap.id,
          fecha: data.fecha || '',
          mes: data.mes || '',
          tipo: data.tipo || 'GastoVariable',
          concepto: data.concepto || '',
          necesidad: data.necesidad || 'Necesidades',
          monto: typeof data.monto === 'number' ? data.monto : 0,
          notas: data.notas || undefined,
          categoriaDetalle: data.categoriaDetalle || undefined,
        });
      });
      // Sort chronologically desc
      movements.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      onUpdate(movements);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, subPath);
    }
  );
}

/**
 * Save or update a single movement in Firestore
 */
export async function saveUserMovimiento(userId: string, mov: Movimiento): Promise<void> {
  const cleanId = sanitizeDocId(mov.id);
  const path = `users/${userId}/movimientos/${cleanId}`;
  const docRef = doc(db, 'users', userId, 'movimientos', cleanId);

  const payload: Record<string, any> = {
    id: cleanId,
    userId,
    fecha: (mov.fecha || new Date().toISOString().slice(0, 10)).slice(0, 32),
    mes: (mov.mes || 'Enero').slice(0, 32),
    tipo: (mov.tipo || 'GastoVariable').slice(0, 32),
    concepto: (mov.concepto || 'Sin concepto').slice(0, 200),
    necesidad: (mov.necesidad || 'Necesidades').slice(0, 32),
    monto: Number(mov.monto) || 0,
    updatedAt: new Date().toISOString(),
  };

  if (mov.notas) payload.notas = mov.notas.slice(0, 500);
  if (mov.categoriaDetalle) payload.categoriaDetalle = mov.categoriaDetalle.slice(0, 50);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a movement from Firestore
 */
export async function deleteUserMovimiento(userId: string, movId: string): Promise<void> {
  const cleanId = sanitizeDocId(movId);
  const path = `users/${userId}/movimientos/${cleanId}`;
  const docRef = doc(db, 'users', userId, 'movimientos', cleanId);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to savings goals in Firestore
 */
export function subscribeUserMetas(
  userId: string,
  onUpdate: (metas: MetaAhorro[]) => void
): Unsubscribe {
  const subPath = `users/${userId}/metas`;
  const collRef = collection(db, 'users', userId, 'metas');

  return onSnapshot(
    collRef,
    (snapshot) => {
      const metas: MetaAhorro[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        metas.push({
          id: data.id || docSnap.id,
          nombre: data.nombre || '',
          objetivo: typeof data.objetivo === 'number' ? data.objetivo : 0,
          acumulado: typeof data.acumulado === 'number' ? data.acumulado : 0,
          color: data.color || '#3E7C6B',
          fechaLimite: data.fechaLimite || undefined,
        });
      });
      onUpdate(metas);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, subPath);
    }
  );
}

/**
 * Save or update a goal in Firestore
 */
export async function saveUserMeta(userId: string, meta: MetaAhorro): Promise<void> {
  const cleanId = sanitizeDocId(meta.id);
  const path = `users/${userId}/metas/${cleanId}`;
  const docRef = doc(db, 'users', userId, 'metas', cleanId);

  const payload: Record<string, any> = {
    id: cleanId,
    userId,
    nombre: (meta.nombre || 'Meta').slice(0, 150),
    objetivo: Number(meta.objetivo) || 0,
    acumulado: Number(meta.acumulado) || 0,
    color: (meta.color || '#3E7C6B').slice(0, 32),
    updatedAt: new Date().toISOString(),
  };

  if (meta.fechaLimite) payload.fechaLimite = meta.fechaLimite.slice(0, 32);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a goal from Firestore
 */
export async function deleteUserMeta(userId: string, metaId: string): Promise<void> {
  const cleanId = sanitizeDocId(metaId);
  const path = `users/${userId}/metas/${cleanId}`;
  const docRef = doc(db, 'users', userId, 'metas', cleanId);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to user settings
 */
export function subscribeUserSettings(
  userId: string,
  onUpdate: (settings: Partial<AppSettings>) => void
): Unsubscribe {
  const path = `users/${userId}/settings/general`;
  const docRef = doc(db, 'users', userId, 'settings', 'general');

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          moneda: data.moneda,
          simboloMoneda: data.simboloMoneda,
          sheetsEndpoint: data.sheetsEndpoint,
          googleSheetId: data.googleSheetId || '',
          googleSheetName: data.googleSheetName || '',
          googleSpreadsheetTitle: data.googleSpreadsheetTitle || '',
          googleDriveWebViewLink: data.googleDriveWebViewLink || '',
          autoSync: typeof data.autoSync === 'boolean' ? data.autoSync : true,
          lastSyncedAt: data.lastSyncedAt || '',
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Save user settings to Firestore
 */
export async function saveUserSettings(userId: string, settings: AppSettings): Promise<void> {
  const path = `users/${userId}/settings/general`;
  const docRef = doc(db, 'users', userId, 'settings', 'general');

  const payload: Record<string, any> = {
    userId,
    moneda: (settings.moneda || 'MXN').slice(0, 10),
    simboloMoneda: (settings.simboloMoneda || '$').slice(0, 10),
    sheetsEndpoint: (settings.sheetsEndpoint || '').slice(0, 500),
    autoSync: Boolean(settings.autoSync),
    updatedAt: new Date().toISOString(),
  };

  if (settings.googleSheetId) payload.googleSheetId = settings.googleSheetId.slice(0, 256);
  if (settings.googleSheetName) payload.googleSheetName = settings.googleSheetName.slice(0, 100);
  if (settings.googleSpreadsheetTitle) payload.googleSpreadsheetTitle = settings.googleSpreadsheetTitle.slice(0, 200);
  if (settings.googleDriveWebViewLink) payload.googleDriveWebViewLink = settings.googleDriveWebViewLink.slice(0, 500);
  if (settings.lastSyncedAt) payload.lastSyncedAt = settings.lastSyncedAt.slice(0, 64);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Batch save movements to Firestore (used for imports or synchronization)
 */
export async function batchSaveUserMovimientos(userId: string, movs: Movimiento[]): Promise<void> {
  if (movs.length === 0) return;
  const path = `users/${userId}/movimientos`;

  try {
    // Firestore batch limit is 500
    const chunkSize = 400;
    for (let i = 0; i < movs.length; i += chunkSize) {
      const chunk = movs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const m of chunk) {
        const cleanId = sanitizeDocId(m.id);
        const docRef = doc(db, 'users', userId, 'movimientos', cleanId);
        const payload: Record<string, any> = {
          id: cleanId,
          userId,
          fecha: (m.fecha || new Date().toISOString().slice(0, 10)).slice(0, 32),
          mes: (m.mes || 'Enero').slice(0, 32),
          tipo: (m.tipo || 'GastoVariable').slice(0, 32),
          concepto: (m.concepto || 'Sin concepto').slice(0, 200),
          necesidad: (m.necesidad || 'Necesidades').slice(0, 32),
          monto: Number(m.monto) || 0,
          updatedAt: new Date().toISOString(),
        };
        if (m.notas) payload.notas = m.notas.slice(0, 500);
        if (m.categoriaDetalle) payload.categoriaDetalle = m.categoriaDetalle.slice(0, 50);
        batch.set(docRef, payload, { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Batch clear all movements for user
 */
export async function batchClearUserMovimientos(userId: string): Promise<void> {
  const path = `users/${userId}/movimientos`;
  try {
    const collRef = collection(db, 'users', userId, 'movimientos');
    const snap = await getDocs(collRef);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
