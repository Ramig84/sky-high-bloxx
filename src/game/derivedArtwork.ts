/** Derived paintings are reused between levels; expensive pixel reads never repeat on restart. */
const stars = new Map<string, HTMLCanvasElement>();
export function starPainting(image: HTMLImageElement) {
  const existing = stars.get(image.src);
  if (existing) return existing;
  const canvas = document.createElement("canvas");
  if (!image.complete || !image.naturalWidth) return canvas;
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const minimum = Math.min(pixels.data[i] ?? 0, pixels.data[i + 1] ?? 0, pixels.data[i + 2] ?? 0);
    pixels.data[i + 3] = Math.floor(i / 4 / canvas.width) < canvas.height * 0.78 ? Math.max(0, Math.min(255, (minimum - 145) * 3)) : 0;
  }
  ctx.putImageData(pixels, 0, 0); stars.set(image.src, canvas);
  return canvas;
}