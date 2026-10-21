/** Derived paintings are reused between levels; expensive pixel reads never repeat on restart. */
const stars = new Map<string, HTMLCanvasElement>();
export function starPainting(image: HTMLImageElement) {
  const existing = stars.get(image.src);
  if (existing) return existing;
  const canvas = document.createElement("canvas");
  if (!image.complete || !image.naturalWidth) return canvas;
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  // Pixel reads happen once on a scratch surface; the result is copied to an ordinary surface
  // so drawing it every frame stays on the phone's fast graphics path.
  const scratch = document.createElement("canvas");
  scratch.width = canvas.width; scratch.height = canvas.height;
  const read = scratch.getContext("2d", { willReadFrequently: true });
  const ctx = canvas.getContext("2d");
  if (!read || !ctx) return canvas;
  read.drawImage(image, 0, 0);
  const pixels = read.getImageData(0, 0, scratch.width, scratch.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const minimum = Math.min(pixels.data[i] ?? 0, pixels.data[i + 1] ?? 0, pixels.data[i + 2] ?? 0);
    pixels.data[i + 3] = Math.floor(i / 4 / scratch.width) < scratch.height * 0.78 ? Math.max(0, Math.min(255, (minimum - 145) * 3)) : 0;
  }
  read.putImageData(pixels, 0, 0);
  ctx.drawImage(scratch, 0, 0);
  scratch.width = scratch.height = 0;
  stars.set(image.src, canvas);
  return canvas;
}

