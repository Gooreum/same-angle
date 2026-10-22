// Original implementation (MIT). Inline icons adapted from Lucide (ISC); see README.
import * as store from './store.js';
import * as camera from './camera.js';

const app = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const toast = document.querySelector('#toast');
const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="m12 19-7-7 7-7M5 12h14"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-8h6v8"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = value => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(value));
let urls = [];
let cleanup = () => {};
let routeVersion = 0;
let toastTimer;
let pendingSave = false;
function photoUrl(photoId) {
  const photo = store.current().photos.find(item => item.id === photoId);
  if (!photo) return '';
  const url = URL.createObjectURL(photo.blob);
  urls.push(url);
  return url;
}
function notify(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4500);
}
async function persist() {
  const success = await store.save();
  pendingSave = !success;
  if (!success) notify("Couldn't save on this phone");
  return success;
}
function bind(action, callback) {
  app.querySelectorAll(`[data-action="${action}"]`).forEach(button => button.addEventListener('click', callback));
}
function go(route) { location.hash = route; }
function privacy() { return `<p class="privacy">${icon('lock')} Saved on this phone only</p>`; }
function header(title, back = null, subtitle = '') {
  return `<header class="appbar">${back ? `<a class="icon-button" href="${back}" aria-label="Back">${icon('back')}</a>` : `<span class="brand-icon">${icon('home')}</span>`}<div><p class="eyebrow">SAME ANGLE</p><p class="bar-title">${escape(title)}</p></div>${subtitle ? `<span class="badge">${subtitle}</span>` : ''}</header>`;
}
function promptSheet(title, label, value, submit, onSave, description = '') {
  const previous = document.activeElement;
  sheet.innerHTML = `<form><span class="handle"></span><h2 id="sheet-title">${escape(title)}</h2>${description ? `<p class="muted">${escape(description)}</p>` : ''}<label for="sheet-input">${escape(label)}</label><input id="sheet-input" name="name" value="${escape(value)}" maxlength="80" required autocomplete="off"><div class="sheet-actions"><button type="button" class="secondary" id="cancel-sheet">Cancel</button><button class="primary" type="submit">${escape(submit)}</button></div></form>`;
  sheet.showModal();
  const input = sheet.querySelector('input');
  input.focus();
  input.select();
  const close = () => { sheet.close(); previous?.focus(); };
  sheet.querySelector('#cancel-sheet').onclick = close;
  sheet.querySelector('form').onsubmit = async event => {
    event.preventDefault();
    if (!input.value.trim()) { input.setCustomValidity('Enter a name.'); input.reportValidity(); return; }
    const value = input.value.trim();
    close();
    await onSave(value);
  };
  input.oninput = () => input.setCustomValidity('');
}
function confirmDelete(title, description, action) {
  sheet.innerHTML = `<form><span class="handle"></span><h2 id="sheet-title">${escape(title)}</h2><p class="muted">${escape(description)}</p><div class="sheet-actions"><button type="button" class="secondary">Cancel</button><button type="submit" class="danger">Delete</button></div></form>`;
  sheet.showModal();
  sheet.querySelector('button').onclick = () => sheet.close();
  sheet.querySelector('form').onsubmit = async event => { event.preventDefault(); sheet.close(); await action(); };
}
function removeSpots(ids) {
  const state = store.current();
  const photoIds = state.spots.filter(spot => ids.includes(spot.id)).flatMap(spot => [spot.inPhotoId, spot.outPhotoId]);
  state.photos = state.photos.filter(photo => !photoIds.includes(photo.id));
  state.spots = state.spots.filter(spot => !ids.includes(spot.id));
}
function editMenu(kind, item) {
  sheet.innerHTML = `<div class="sheet-content"><span class="handle"></span><h2 id="sheet-title">${escape(item.name || item.label)}</h2><button class="secondary" id="rename">Rename ${kind}</button><button class="text-danger" id="delete">Delete ${kind}</button><button class="secondary" id="close-menu">Cancel</button></div>`;
  sheet.showModal();
  sheet.querySelector('#close-menu').onclick = () => sheet.close();
  sheet.querySelector('#rename').onclick = () => {
    sheet.close();
    promptSheet(`Rename ${kind}`, kind === 'room' ? 'Room name' : 'Spot label', item.name || item.label, 'Save changes', async value => {
      item[kind === 'room' ? 'name' : 'label'] = value;
      await persist(); await render();
    });
  };
  sheet.querySelector('#delete').onclick = () => {
    sheet.close();
    confirmDelete(`Delete this ${kind}?`, 'Its photos will also be deleted from this phone. This cannot be undone.', async () => {
      if (kind === 'room') {
        removeSpots(store.current().spots.filter(spot => spot.roomId === item.id).map(spot => spot.id));
        store.current().rooms = store.current().rooms.filter(room => room.id !== item.id);
      } else removeSpots([item.id]);
      await persist(); await render();
    });
  };
}
function homeScreen() {
  const { home, rooms, spots } = store.current();
  const count = spots.filter(spot => spot.inPhotoId).length;
  app.innerHTML = `${header('Your home', null, 'MOVE-IN')}<section class="page"><div class="page-heading"><p class="eyebrow">YOUR MOVE-IN RECORD</p><h1>${escape(home.name)}</h1><p class="muted">Shoot move-out photos from the exact same angle as move-in.</p></div><div class="section-heading"><h2>Rooms <span class="count">${rooms.length}</span></h2><span class="muted small">${count} ${count === 1 ? 'photo' : 'photos'} saved</span></div>${rooms.length ? `<div class="card-list">${[...rooms].sort((a, b) => a.order - b.order).map(room => {
    const roomSpots = spots.filter(spot => spot.roomId === room.id);
    const saved = roomSpots.filter(spot => spot.inPhotoId).length;
    const thumb = roomSpots.find(spot => spot.inPhotoId);
    return `<article class="room-card"><a class="room-link" href="#/room/${room.id}">${thumb ? `<img class="room-thumb" src="${photoUrl(thumb.inPhotoId)}" alt="Move-in view of ${escape(room.name)}">` : `<span class="room-thumb placeholder">${icon('home')}</span>`}<div><h3>${escape(room.name)}</h3><p class="muted small">${saved} of ${roomSpots.length} spots photographed</p></div>${icon('arrow')}</a><button class="icon-button" data-action="room-menu" data-id="${room.id}" aria-label="Options for ${escape(room.name)}">${icon('more')}</button></article>`;
  }).join('')}</div>` : `<div class="empty-state"><span class="empty-icon">${icon('home')}</span><h2>A clear record starts here.</h2><p>Add a room, then photograph the spots you want to remember.</p><div class="empty-example"><span>01</span><div><strong>Room by room.</strong><p>Walls, floors, fixtures — one spot at a time.</p></div></div></div>`}<button class="primary full" data-action="add-room">${icon('plus')} Add a room</button><aside class="note"><strong>A little care now. A clearer record later.</strong><p>Capture the details while the room is empty. Every photo keeps its date and time.</p></aside>${privacy()}</section>`;
  bind('add-room', () => promptSheet('Add a room', 'Room name', '', 'Add room', async name => {
    const room = { id: store.id(), homeId: home.id, name, order: rooms.length };
    rooms.push(room); await persist(); go(`#/room/${room.id}`);
  }, 'Start with the room you are standing in.'));
  bind('room-menu', event => editMenu('room', rooms.find(room => room.id === event.currentTarget.dataset.id)));
}
function roomScreen(room) {
  const spots = store.current().spots.filter(spot => spot.roomId === room.id).sort((a, b) => a.order - b.order);
  app.innerHTML = `${header('Room', '#/', 'MOVE-IN')}<section class="page"><div class="page-heading"><p class="eyebrow">MOVE-IN RECORD</p><h1>${escape(room.name)}</h1><p class="muted">${spots.filter(spot => spot.inPhotoId).length} of ${spots.length} spots photographed</p></div>${spots.length ? `<div class="card-list">${spots.map(spot => `<article class="spot-card">${spot.inPhotoId ? `<img class="spot-photo" src="${photoUrl(spot.inPhotoId)}" alt="Move-in: ${escape(spot.label)}">` : `<a href="#/capture/${spot.id}/in" class="photo-placeholder">${icon('camera')}<span>Take a move-in photo</span></a>`}<div class="spot-details"><div><h2>${escape(spot.label)}</h2>${spot.inAt ? `<p class="photo-caption">Move-in photo</p><time datetime="${spot.inAt}">${date(spot.inAt)}</time>` : '<p class="muted small">No move-in photo yet</p>'}</div><button class="icon-button" data-action="spot-menu" data-id="${spot.id}" aria-label="Options for ${escape(spot.label)}">${icon('more')}</button></div>${spot.inPhotoId ? `<a class="retake" href="#/capture/${spot.id}/in">Retake move-in photo ${icon('arrow')}</a>` : ''}</article>`).join('')}</div>` : `<div class="empty-state"><span class="empty-icon">${icon('camera')}</span><h2>What needs a record?</h2><p>Start with a wall, a floor corner, or a fixture. Add one spot for each view.</p></div>`}<button class="primary full" data-action="add-spot">${icon('plus')} Add spot</button>${privacy()}</section>`;
  bind('add-spot', async () => {
    const spot = { id: store.id(), roomId: room.id, label: `Spot ${spots.length + 1}`, order: spots.length, inPhotoId: null, inAt: null, outPhotoId: null, outAt: null, outScore: null, outAuto: false };
    store.current().spots.push(spot); await persist(); go(`#/capture/${spot.id}/in`);
  });
  bind('spot-menu', event => editMenu('spot', spots.find(spot => spot.id === event.currentTarget.dataset.id)));
}
async function captureScreen(spot, version) {
  const room = store.current().rooms.find(room => room.id === spot.roomId);
  app.innerHTML = `<section class="camera-screen">${header(room.name, `#/room/${room.id}`, 'MOVE-IN')}<div class="camera-heading"><h1>${escape(spot.label)}</h1><p>Keep the whole spot in view.</p></div><div class="viewfinder"><video autoplay muted playsinline aria-label="Live camera preview"></video><div class="viewfinder-corners" aria-hidden="true"></div><div class="camera-status" role="status"><span class="status-icon">${icon('camera')}</span><strong>Opening camera…</strong><p>Your browser may ask for permission.</p></div></div><div class="camera-controls"><p class="capture-hint">Date and time are saved with your photo.</p><button class="shutter" data-action="shutter" aria-label="Take photo" disabled><span></span></button><label class="upload-button" for="upload-photo">Upload a photo</label><input class="visually-hidden" type="file" id="upload-photo" accept="image/*"><p class="camera-private">Photos stay on this phone.</p></div></section>`;
  const video = app.querySelector('video');
  const status = app.querySelector('.camera-status');
  const shutter = app.querySelector('.shutter');
  let disposed = false;
  let busy = false;
  cleanup = () => { disposed = true; camera.stop(video); };
  async function preview(photo) {
    if (disposed || version !== routeVersion) return;
    disposed = true;
    camera.stop(video);
    cleanup = () => camera.stop(video);
    const at = new Date().toISOString();
    const url = URL.createObjectURL(photo.blob);
    urls.push(url);
    app.innerHTML = `${header('Save your photo', `#/room/${room.id}`, 'MOVE-IN')}<section class="page"><div class="page-heading"><p class="eyebrow">MOVE-IN PHOTO</p><h1>Name this spot</h1><p class="muted">A short label makes it easy to find later.</p></div><img class="review-photo" src="${url}" alt="New move-in photo for ${escape(spot.label)}"><p class="photo-caption">Captured <time datetime="${at}">${date(at)}</time></p><form id="save-photo"><label for="spot-label">Spot label</label><input id="spot-label" name="label" maxlength="80" required value="${escape(spot.label)}"><button class="primary full" type="submit">Save move-in photo</button></form><button class="secondary full" data-action="try-again">Retake photo</button>${privacy()}</section>`;
    let record;
    app.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      const label = app.querySelector('#spot-label').value.trim();
      if (!label) { app.querySelector('#spot-label').focus(); return; }
      const button = app.querySelector('[type="submit"]');
      button.disabled = true;
      button.textContent = 'Saving…';
      if (!record) {
        record = { id: store.id(), ...photo };
        const oldId = spot.inPhotoId;
        store.current().photos = store.current().photos.filter(item => item.id !== oldId);
        store.current().photos.push(record);
      }
      Object.assign(spot, { label, inPhotoId: record.id, inAt: at });
      if (await persist()) { go(`#/room/${room.id}`); notify('Move-in photo saved'); }
      else { button.disabled = false; button.textContent = 'Retry saving photo'; }
    };
    bind('try-again', () => render());
  }
  bind('shutter', async () => {
    if (busy) return;
    busy = true;
    try { await preview(await camera.capture(video)); }
    catch { notify('Could not take a photo. Try again or upload one.'); }
    finally { busy = false; }
  });
  app.querySelector('#upload-photo').onchange = async event => {
    if (busy || !event.target.files[0]) return;
    busy = true;
    try { await preview(await camera.upload(event.target.files[0])); }
    catch { notify('Could not open that photo. Try a JPEG or PNG.'); event.target.value = ''; }
    finally { busy = false; }
  };
  try {
    await camera.start(video);
    if (disposed || version !== routeVersion) { camera.stop(video); return; }
    status.hidden = true;
    shutter.disabled = false;
  } catch {
    if (disposed || version !== routeVersion) return;
    status.innerHTML = `<span class="status-icon">${icon('camera')}</span><strong>Camera unavailable</strong><p>Allow camera access in your browser, or upload a photo below.</p>`;
  }
}
async function render() {
  const version = ++routeVersion;
  cleanup(); cleanup = () => {};
  urls.forEach(URL.revokeObjectURL); urls = [];
  if (sheet.open) sheet.close();
  if (!pendingSave) await store.load();
  if (version !== routeVersion) return;
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const room = store.current().rooms.find(item => item.id === parts[1]);
  const spot = store.current().spots.find(item => item.id === parts[1]);
  if (parts[0] === 'room' && room) roomScreen(room);
  else if (parts[0] === 'capture' && spot && parts[2] === 'in') await captureScreen(spot, version);
  else homeScreen();
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);
window.addEventListener('pagehide', () => cleanup());
window.addEventListener('pageshow', render);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cleanup();
  else if (location.hash.startsWith('#/capture/')) render();
});
await render();
