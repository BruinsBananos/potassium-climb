import { Texture, ImageSource } from 'pixi.js';

/** Key out near-green (or magenta) pixels → transparent texture. */
export async function loadKeyedTexture(
  url: string,
  key: 'green' | 'magenta' = 'green',
  threshold = 70,
): Promise<Texture> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    let kill = false;
    if (key === 'green') {
      kill = g > r + threshold && g > b + threshold && g > 80;
    } else {
      kill = r > g + threshold && b > g + threshold && r > 80 && b > 80;
    }
    if (kill) d[i + 3] = 0;
  }
  ctx.putImageData(data, 0, 0);
  return new Texture({ source: new ImageSource({ resource: canvas }) });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

export async function loadPlainTexture(url: string): Promise<Texture> {
  const img = await loadImage(url);
  return Texture.from(img);
}
