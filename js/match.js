// Original implementation, MIT. Gradient zero-mean normalized cross-correlation.
export const THRESHOLD = 70;
export const HOLD_MS = 500;
const width = 64, height = 48;
const canvas = document.createElement('canvas');
canvas.width = width; canvas.height = height;
const context = canvas.getContext('2d', { willReadFrequently: true });
function gradients(source) {
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  const rgba = context.getImageData(0, 0, width, height).data;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = rgba[i * 4] * .299 + rgba[i * 4 + 1] * .587 + rgba[i * 4 + 2] * .114;
  const result = [];
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    result.push(Math.hypot(gray[i + 1] - gray[i - 1], gray[i + width] - gray[i - width]));
  }
  return result;
}
export function score(liveCanvas, ghostImage) {
  const a = gradients(liveCanvas), b = gradients(ghostImage);
  const meanA = a.reduce((sum, v) => sum + v, 0) / a.length;
  const meanB = b.reduce((sum, v) => sum + v, 0) / b.length;
  let covariance = 0, varianceA = 0, varianceB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - meanA, y = b[i] - meanB;
    covariance += x * y; varianceA += x * x; varianceB += y * y;
  }
  // Flat or dark frames contain too little structure to justify an automatic match.
  if (meanA < 2 || meanB < 2 || varianceA < 1 || varianceB < 1) return 0;
  return Math.round(Math.max(0, Math.min(1, covariance / Math.sqrt(varianceA * varianceB))) * 100);
}
export function watch(video, ghost, onScore, onMatched) {
  let since = null, fired = false;
  const timer = setInterval(() => {
    if (fired || video.readyState < 2 || !ghost.complete || !ghost.naturalWidth) return;
    const value = score(video, ghost);
    onScore(value);
    if (value >= THRESHOLD) {
      since ??= performance.now();
      if (performance.now() - since >= HOLD_MS) { fired = true; onMatched(value); }
    } else since = null;
  }, 125);
  return () => clearInterval(timer);
}
