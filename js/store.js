// Original implementation. Licensed under the repository MIT license.
const empty = () => ({ home: { id: 'home', name: 'My home', mode: 'in', createdAt: new Date().toISOString() }, rooms: [], spots: [], photos: [] });
let memory = empty();
let dbPromise;
function database() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('same-angle', 1);
    request.onupgradeneeded = () => {
      for (const name of ['home', 'rooms', 'spots', 'photos']) request.result.createObjectStore(name, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Storage is blocked'));
  }).catch(error => { dbPromise = undefined; throw error; });
  return dbPromise;
}
export function current() { return memory; }
export async function load() {
  try {
    const db = await database();
    const values = await Promise.all(['home', 'rooms', 'spots', 'photos'].map(name => new Promise((resolve, reject) => {
      const request = db.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    })));
    memory = { home: values[0][0] || memory.home, rooms: values[1], spots: values[2], photos: values[3] };
    return true;
  } catch { return false; }
}
// Keep the session copy on failure, including photo blobs, so saving can be retried.
export async function save() {
  try {
    const db = await database();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['home', 'rooms', 'spots', 'photos'], 'readwrite');
      for (const name of ['home', 'rooms', 'spots', 'photos']) {
        const target = transaction.objectStore(name);
        target.clear();
        for (const value of name === 'home' ? [memory.home] : memory[name]) target.put(value);
      }
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return true;
  } catch { return false; }
}
export const id = () => crypto.randomUUID();
