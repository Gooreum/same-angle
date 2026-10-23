// Original implementation (MIT). Inline icons adapted from Lucide (ISC); see README.
import * as store from './store.js';
import * as camera from './camera.js';
import * as match from './match.js';
import { renderReport } from './report.js';

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
let nextNotice;
let pendingSave = false;
const drafts = new Map();
const spotWord = count => count === 1 ? 'spot' : 'spots';
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
function go(route, message = '') {
  nextNotice = message ? { route, message } : null;
  location.hash = route;
}
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
  app.innerHTML = `${header('Home', null, home.mode === 'out' ? 'MOVE-OUT' : 'MOVE-IN')}<section class="page ${rooms.length ? '' : 'home-empty'}"><div class="page-heading"><p class="eyebrow">YOUR ${home.mode === 'out' ? 'MOVE-OUT' : 'MOVE-IN'} RECORD</p><h1>${escape(home.name)}</h1><p class="muted">Shoot move-out photos from the same angle as move-in.</p></div><div class="mode-switch" role="group" aria-label="Capture mode">${['in', 'out'].map(mode => `<button class="${home.mode === mode ? 'selected' : ''}" data-action="mode" data-mode="${mode}" aria-pressed="${home.mode === mode}">Move-${mode}</button>`).join('')}</div><div class="section-heading"><h2>Rooms <span class="count">${rooms.length}</span></h2><span class="muted small">${count} ${count === 1 ? 'photo' : 'photos'} saved</span></div>${rooms.length ? `<div class="card-list">${[...rooms].sort((a, b) => a.order - b.order).map(room => {
    const roomSpots = spots.filter(spot => spot.roomId === room.id);
    const saved = roomSpots.filter(spot => home.mode === 'out' ? spot.outPhotoId : spot.inPhotoId).length;
    const thumb = roomSpots.find(spot => spot.inPhotoId);
    return `<article class="room-card"><a class="room-link" href="#/room/${room.id}">${thumb ? `<img class="room-thumb" src="${photoUrl(thumb.inPhotoId)}" alt="Move-in view of ${escape(room.name)}">` : `<span class="room-thumb placeholder">${icon('home')}</span>`}<div><h3>${escape(room.name)}</h3><p class="muted small">${saved} of ${roomSpots.length} ${spotWord(roomSpots.length)} ${home.mode === 'out' ? 'retaken' : 'photographed'}</p></div>${icon('arrow')}</a><button class="icon-button" data-action="room-menu" data-id="${room.id}" aria-label="Options for ${escape(room.name)}">${icon('more')}</button></article>`;
  }).join('')}</div>` : `<div class="empty-state"><span class="empty-icon">${icon('home')}</span><h2>A clear record starts here.</h2><p>Add a room, then photograph the spots you want to remember.</p><div class="empty-steps"><div class="empty-example"><span>01</span><div><strong>Move-in</strong><p>Photograph each spot.</p></div></div><div class="empty-example"><span>02</span><div><strong>Move-out</strong><p>Line up the ghost.</p></div></div><div class="empty-example"><span>03</span><div><strong>Report</strong><p>Save pairs as PDF.</p></div></div></div></div>`}<button class="primary full" data-action="add-room">${icon('plus')} Add a room</button>${rooms.length ? '' : '<button class="secondary full" data-action="load-sample">Try with a sample home</button>'}<a class="secondary full" href="#/report">Report ${icon('arrow')}</a><aside class="note"><strong>A little care now. A clearer record later.</strong><p>Capture the details while the room is empty. Every photo keeps its date and time.</p></aside>${privacy()}${rooms.length ? '<button class="text-danger full" data-action="delete-home">Delete this home</button>' : ''}</section>`;
  bind('load-sample', async event => {
    event.currentTarget.disabled = true;
    try {
      const success = await store.loadSample();
      pendingSave = !success;
      await render();
      notify(success ? 'Sample home loaded — try retaking a spot.' : "Couldn't save on this phone");
    } catch {
      await render();
      notify('Could not load the sample photos. Try again.');
    }
  });
  bind('delete-home', () => confirmDelete('Delete this home?', 'All rooms, spots, and photos will be deleted from this phone. This cannot be undone.', async () => {
    pendingSave = !await store.deleteHome();
    drafts.clear();
    await render();
    notify(pendingSave ? "Couldn't save on this phone" : 'Home deleted');
  }));
  bind('mode', async event => { home.mode = event.currentTarget.dataset.mode; await persist(); await render(); });
  bind('add-room', () => promptSheet('Add a room', 'Room name', '', 'Add room', async name => {
    const room = { id: store.id(), homeId: home.id, name, order: rooms.length };
    rooms.push(room); await persist(); go(`#/room/${room.id}`);
  }, 'Start with the room you are standing in.'));
  bind('room-menu', event => editMenu('room', rooms.find(room => room.id === event.currentTarget.dataset.id)));
}
function roomScreen(room) {
  const out = store.current().home.mode === 'out';
  const spots = store.current().spots.filter(spot => spot.roomId === room.id).sort((a, b) => a.order - b.order);
  app.innerHTML = `${header('Room', '#/', out ? 'MOVE-OUT' : 'MOVE-IN')}<section class="page"><div class="page-heading"><p class="eyebrow">${out ? 'MOVE-OUT' : 'MOVE-IN'} RECORD</p><h1>${escape(room.name)}</h1><p class="muted">${spots.filter(spot => out ? spot.outPhotoId : spot.inPhotoId).length} of ${spots.length} ${spotWord(spots.length)} ${out ? 'retaken' : 'photographed'}</p></div>${spots.length ? `<div class="card-list">${spots.map(spot => `<article class="spot-card">${spot.inPhotoId ? `<img class="spot-photo" src="${photoUrl(spot.inPhotoId)}" alt="Move-in: ${escape(spot.label)}">` : `<a href="#/capture/${spot.id}/in" class="photo-placeholder">${icon('camera')}<span>Take a move-in photo</span></a>`}<div class="spot-details"><div><h2>${escape(spot.label)}</h2>${spot.inAt ? `<p class="photo-caption">Move-in photo</p><time datetime="${spot.inAt}">${date(spot.inAt)}</time>` : '<p class="muted small">No move-in photo yet</p>'}</div><button class="icon-button" data-action="spot-menu" data-id="${spot.id}" aria-label="Options for ${escape(spot.label)}">${icon('more')}</button></div>${out ? `${spot.outPhotoId ? `<img class="spot-photo" src="${photoUrl(spot.outPhotoId)}" alt="Move-out: ${escape(spot.label)}"><p class="saved-after"><time datetime="${spot.outAt}">${date(spot.outAt)}</time> · ${spot.outScore ?? 0}% match · ${spot.outAuto ? 'Auto-matched' : 'Manual'}</p>` : '<p class="saved-after muted">Not retaken yet</p>'}<a class="retake" href="#/capture/${spot.id}/out">Retake ${icon('arrow')}</a>${spot.outPhotoId ? `<a class="retake" href="#/pair/${spot.id}">Review pair ${icon('arrow')}</a>` : ''}` : spot.inPhotoId ? `<a class="retake" href="#/capture/${spot.id}/in">Retake move-in photo ${icon('arrow')}</a>` : ''}</article>`).join('')}</div>` : `<div class="empty-state"><span class="empty-icon">${icon('camera')}</span><h2>What needs a record?</h2><p>Start with a wall, a floor corner, or a fixture. Add one spot for each view.</p></div>`}${out ? '' : `<button class="primary full" data-action="add-spot">${icon('plus')} Add spot</button>`}${privacy()}</section>`;
  bind('add-spot', async () => {
    const spot = { id: store.id(), roomId: room.id, label: `Spot ${spots.length + 1}`, order: spots.length, inPhotoId: null, inAt: null, outPhotoId: null, outAt: null, outScore: null, outAuto: false };
    store.current().spots.push(spot); await persist(); go(`#/capture/${spot.id}/in`);
  });
  bind('spot-menu', event => editMenu('spot', spots.find(spot => spot.id === event.currentTarget.dataset.id)));
}
function cameraUnavailable(missingMoveIn = false) {
  const screen = app.querySelector('.camera-screen');
  camera.stop(screen.querySelector('video'));
  screen.classList.add('camera-unavailable');
  const ghost = screen.querySelector('.ghost-photo');
  if (ghost) { ghost.hidden = false; ghost.style.opacity = '1'; }
  const status = screen.querySelector('.camera-status');
  status.hidden = false;
  status.innerHTML = '<strong>Camera unavailable</strong><p>Allow camera access in your browser, or choose a photo from this phone.</p>';
  screen.querySelector('.viewfinder').after(status);
  screen.querySelector('.camera-heading p').textContent = missingMoveIn
    ? 'No move-in photo for this spot. Choose a photo to record it.'
    : 'Choose a photo to record this spot.';
  screen.querySelector('.upload-button').classList.add('primary', 'full');
}
async function captureScreen(spot, version) {
  const room = store.current().rooms.find(room => room.id === spot.roomId);
  app.innerHTML = `<section class="camera-screen">${header(room.name, `#/room/${room.id}`, 'MOVE-IN')}<div class="camera-heading"><h1>${escape(spot.label)}</h1><p>Keep the whole spot in view.</p></div><div class="viewfinder"><video autoplay muted playsinline aria-label="Live camera preview"></video><div class="viewfinder-corners" aria-hidden="true"></div><div class="camera-status" role="status"><span class="status-icon">${icon('camera')}</span><strong>Opening camera…</strong><p>Your browser may ask for permission.</p></div></div><div class="camera-controls"><p class="capture-hint">Date and time are saved with your photo.</p><button class="shutter" data-action="shutter" aria-label="Take photo" disabled><span></span></button><button class="upload-button" type="button" data-action="upload">Upload a photo</button><input class="visually-hidden" type="file" id="upload-photo" accept="image/*" aria-label="Upload a photo file" tabindex="-1"><p class="camera-private">Photos stay on this phone.</p></div></section>`;
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
      if (await persist()) { go(`#/room/${room.id}`, 'Move-in photo saved'); }
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
  bind('upload', () => app.querySelector('#upload-photo').click());
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
    cameraUnavailable();
  }
}
async function outScreen(spot, version) {
  const room = store.current().rooms.find(item => item.id === spot.roomId);
  const before = photoUrl(spot.inPhotoId);
  app.innerHTML = `<section class="camera-screen">${header(room.name, `#/room/${room.id}`, 'MOVE-OUT')}<div class="camera-heading"><h1>${escape(spot.label)}</h1><p>${before ? 'Line up the live view with your move-in photo.' : 'No move-in photo for this spot. Take a normal photo.'}</p></div><div class="viewfinder"><video autoplay muted playsinline aria-label="Live camera preview"></video>${before ? `<img class="ghost-photo" src="${before}" alt="Move-in alignment guide">` : ''}<div class="viewfinder-corners" aria-hidden="true"></div><div class="camera-status" role="status"><strong>Opening camera…</strong><p>Your browser may ask for permission.</p></div></div><div class="match-controls">${before ? `<div class="match-heading"><strong id="match-label">Line it up</strong><output id="match-score" data-score="0">0% match</output></div><meter min="0" max="100" value="0" aria-label="Match score"></meter><p class="match-hint">Too dark or too different — use the manual shutter</p><div class="ghost-settings"><label for="ghost-opacity">Ghost opacity <span id="opacity-value">50%</span></label><button class="ghost-toggle" type="button" aria-pressed="false">Hide ghost</button></div><input type="range" id="ghost-opacity" min="0" max="100" value="50">` : ''}</div><div class="camera-controls"><p class="capture-hint">${before ? 'Hold steady — the photo is taken automatically when it matches.' : 'Date and time are saved with your photo.'}</p><button class="shutter" data-action="shutter" aria-label="Take photo" disabled><span></span></button><button class="upload-button" type="button" data-action="upload">Upload a photo</button><input class="visually-hidden" type="file" id="upload-photo" accept="image/*" aria-label="Upload a photo file" tabindex="-1"><p class="camera-private">Photos stay on this phone.</p></div></section>`;
  const video = app.querySelector('video'), ghost = app.querySelector('.ghost-photo');
  const shutter = app.querySelector('.shutter'), status = app.querySelector('.camera-status');
  let disposed = false, busy = false, currentScore = 0, stopMatch = () => {}, autoTimer;
  cleanup = () => { disposed = true; clearTimeout(autoTimer); stopMatch(); camera.stop(video); };
  function update(value) {
    currentScore = value;
    if (!ghost) return;
    app.querySelector('#match-score').textContent = `${value}% match`;
    app.querySelector('#match-score').dataset.score = value;
    app.querySelector('meter').value = value;
    app.querySelector('.match-hint').textContent = value >= match.THRESHOLD ? 'Hold steady…' : 'Too dark or too different — use the manual shutter';
  }
  async function finish(photo, auto, value) {
    if (disposed || version !== routeVersion) return;
    cleanup();
    drafts.set(spot.id, { photo, at: new Date().toISOString(), score: value, auto });
    go(`#/pair/${spot.id}`);
  }
  async function shoot(auto = false) {
    if (busy || disposed) return;
    busy = true; stopMatch(); clearTimeout(autoTimer);
    try { await finish(await camera.capture(video), auto, currentScore); }
    catch { notify('Could not take a photo. Try again or upload one.'); busy = false; startMatch(); }
  }
  function startMatch() {
    if (!ghost || disposed) return;
    stopMatch = match.watch(video, ghost, update, () => {
      if (disposed || busy) return;
      app.querySelector('.viewfinder').classList.add('matched');
      app.querySelector('#match-label').textContent = 'Matched';
      app.querySelector('.match-hint').textContent = 'Matched — taking the photo…';
      try { navigator.vibrate?.(80); } catch { /* Vibration is optional. */ }
      autoTimer = setTimeout(() => shoot(true), 200);
    });
  }
  bind('shutter', () => shoot(false));
  if (ghost) {
    const slider = app.querySelector('#ghost-opacity'), toggle = app.querySelector('.ghost-toggle');
    slider.oninput = () => { ghost.style.opacity = slider.value / 100; app.querySelector('#opacity-value').textContent = `${slider.value}%`; };
    toggle.onclick = () => { ghost.hidden = !ghost.hidden; toggle.textContent = ghost.hidden ? 'Show ghost' : 'Hide ghost'; toggle.setAttribute('aria-pressed', String(ghost.hidden)); };
  }
  bind('upload', () => app.querySelector('#upload-photo').click());
  app.querySelector('#upload-photo').onchange = async event => {
    if (busy || !event.target.files[0]) return;
    busy = true; stopMatch(); clearTimeout(autoTimer);
    try {
      const photo = await camera.upload(event.target.files[0]);
      let value = 0;
      if (ghost) {
        await ghost.decode();
        const image = new Image(), url = URL.createObjectURL(photo.blob);
        try { image.src = url; await image.decode(); value = match.score(image, ghost); }
        finally { URL.revokeObjectURL(url); }
      }
      await finish(photo, false, value);
    } catch { busy = false; notify('Could not open that photo. Try a JPEG or PNG.'); startMatch(); }
  };
  try {
    await camera.start(video);
    if (disposed || version !== routeVersion) { camera.stop(video); return; }
    status.hidden = true; shutter.disabled = false;
    if (ghost) { await ghost.decode(); if (!disposed) startMatch(); }
  } catch {
    if (disposed || version !== routeVersion) return;
    stopMatch();
    cameraUnavailable(!before);
  }
}
function pairScreen(spot) {
  const draft = drafts.get(spot.id);
  if (!draft && !spot.outPhotoId) { go(`#/room/${spot.roomId}`); return; }
  const before = photoUrl(spot.inPhotoId);
  let after = photoUrl(spot.outPhotoId);
  if (draft) { after = URL.createObjectURL(draft.photo.blob); urls.push(after); }
  const at = draft?.at ?? spot.outAt, value = draft?.score ?? spot.outScore ?? 0, auto = draft?.auto ?? spot.outAuto;
  app.innerHTML = `${header('Pair review', `#/room/${spot.roomId}`, 'MOVE-OUT')}<section class="page"><div class="page-heading"><p class="eyebrow">${escape(spot.label)}</p><h1>Review your pair</h1><p class="muted">Check that both photos show the same spot.</p></div><div class="pair-photos"><figure><figcaption>Before</figcaption>${before ? `<img src="${before}" alt="Before: ${escape(spot.label)}"><time datetime="${spot.inAt}">${date(spot.inAt)}</time>` : '<p class="muted">No move-in photo</p>'}</figure><figure><figcaption>After</figcaption><img src="${after}" alt="After: ${escape(spot.label)}"><time datetime="${at}">${date(at)}</time></figure></div><p class="pair-result ${auto ? 'auto' : ''}">${value}% match · ${auto ? 'Auto-matched' : 'Manual'}</p><button class="primary full" data-action="keep-pair">Keep pair</button><button class="secondary full" data-action="retake-pair">Retake photo</button>${privacy()}</section>`;
  let record;
  bind('keep-pair', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    if (draft) {
      if (!record) {
        record = { id: store.id(), ...draft.photo };
        store.current().photos = store.current().photos.filter(item => item.id !== spot.outPhotoId);
        store.current().photos.push(record);
      }
      Object.assign(spot, { outPhotoId: record.id, outAt: at, outScore: value, outAuto: auto });
      if (!await persist()) { button.disabled = false; button.textContent = 'Retry saving pair'; return; }
      drafts.delete(spot.id);
    }
    go(`#/room/${spot.roomId}`, 'Move-out photo saved');
  });
  bind('retake-pair', () => { drafts.delete(spot.id); go(`#/capture/${spot.id}/out`); });
}

async function render() {
  const version = ++routeVersion;
  clearTimeout(toastTimer);
  toast.classList.remove('visible');
  toast.textContent = '';
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
  else if (parts[0] === 'capture' && spot && parts[2] === 'out') await outScreen(spot, version);
  else if (parts[0] === 'pair' && spot) pairScreen(spot);
  else if (parts[0] === 'report') {
    app.innerHTML = `${header('Report', '#/')}<section class="page report-page"><div class="report-actions"><button class="primary full" data-action="print-report">Save as PDF</button><p class="muted small">Choose Save as PDF in your print options.</p></div>${renderReport(store.current(), photoUrl)}</section>`;
    bind('print-report', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      await Promise.all([...app.querySelectorAll('img')].map(image => image.decode().catch(() => {})));
      if (version === routeVersion) { button.disabled = false; window.print(); }
    });
  }
  else homeScreen();
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  if (nextNotice) {
    const notice = nextNotice; nextNotice = null;
    if (location.hash === notice.route) notify(notice.message);
  }
}
window.addEventListener('hashchange', render);
window.addEventListener('pagehide', () => cleanup());
window.addEventListener('pageshow', render);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cleanup();
  else if (location.hash.startsWith('#/capture/')) render();
});
await render();
