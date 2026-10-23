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

// Load all bundled photos before replacing the empty home; never overwrite a record.
export async function loadSample() {
  if (memory.rooms.length || memory.spots.length || memory.photos.length) throw new Error('Home is not empty');
  const samples = [
    ['Living room', 'Wall by window', 'wall-window'],
    ['Living room', 'Floor corner', 'floor-corner'],
    ['Kitchen', 'Counter & sink', 'kitchen']
  ];
  const photos = await Promise.all(samples.map(async ([, , file]) => {
    const response = await fetch(new URL(`../img/sample/${file}.jpg`, import.meta.url));
    if (!response.ok) throw new Error('Sample photo unavailable');
    const blob = await response.blob();
    if (!blob.size) throw new Error('Sample photo unavailable');
    return { id: id(), blob, width: 1280, height: 960 };
  }));
  if (memory.rooms.length || memory.spots.length || memory.photos.length) throw new Error('Home is not empty');
  const sample = empty();
  sample.home.name = 'Sample home';
  sample.home.mode = 'out';
  const at = new Date();
  at.setDate(at.getDate() - 30);
  sample.rooms = ['Living room', 'Kitchen'].map((name, order) => ({ id: id(), homeId: sample.home.id, name, order }));
  sample.photos = photos;
  sample.spots = samples.map(([roomName, label], index) => ({
    id: id(), roomId: sample.rooms.find(room => room.name === roomName).id,
    label, order: roomName === 'Kitchen' ? 0 : index,
    inPhotoId: photos[index].id, inAt: at.toISOString(),
    outPhotoId: null, outAt: null, outScore: null, outAuto: false
  }));
  memory = sample;
  return save();
}
export async function deleteHome() {
  memory = empty();
  return save();
}
