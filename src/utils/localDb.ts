import { AggregatedDataset } from '../types/data';

const DB_NAME = 'LocalSheet_AirGapped_DB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const KEY = 'active_analysis_session';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves current analysis session in local IndexedDB
 */
export async function saveLocalSession(dataset: AggregatedDataset): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // We don't need to store raw File objects since they cannot serialize directly,
      // but parsedFiles without File handle serialize cleanly.
      const serializableDataset = {
        ...dataset,
        files: dataset.files.map(f => ({
          ...f,
        })),
        savedAt: Date.now(),
      };
      const req = store.put(serializableDataset, KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to persist session to IndexedDB:', err);
  }
}

/**
 * Loads previous session from local IndexedDB
 */
export async function loadLocalSession(): Promise<AggregatedDataset | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load session from IndexedDB:', err);
    return null;
  }
}

/**
 * Permanently purges all locally cached datasets and wipes database
 */
export async function purgeLocalSession(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to purge local IndexedDB:', err);
  }
}
