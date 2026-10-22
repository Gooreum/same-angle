// Original implementation. Licensed under the repository MIT license.
export async function start(video) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } } });
  video.srcObject = stream;
  try { await video.play(); } catch (error) { stop(video); throw error; }
  return stream;
}
export function stop(video) {
  video?.srcObject?.getTracks().forEach(track => track.stop());
  if (video) video.srcObject = null;
}
function encode(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve({ blob, width: canvas.width, height: canvas.height }) : reject(new Error('Could not encode photo')), 'image/jpeg', 0.88));
}
export function capture(video) {
  if (!video.videoWidth) throw new Error('Camera is not ready');
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return encode(canvas);
}
export async function upload(file) {
  if (!file || (file.type && !file.type.startsWith('image/'))) throw new Error('Choose an image file');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return await encode(canvas);
  } finally { URL.revokeObjectURL(url); }
}
