export function createCanvas(width: number, height: number, fill?: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  if (fill) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, width, height);
    }
  }
  return canvas;
}

export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = createCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0);
  }
  return canvas;
}

export function imageToCanvas(image: HTMLImageElement | ImageBitmap | HTMLCanvasElement): HTMLCanvasElement {
  if (image instanceof HTMLCanvasElement) {
    return cloneCanvas(image);
  }
  const width = 'naturalWidth' in image ? image.naturalWidth : image.width;
  const height = 'naturalHeight' in image ? image.naturalHeight : image.height;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(image, 0, 0, width, height);
  }
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to export canvas.'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

export function getCanvasPointFromEvent(
  event: PointerEvent,
  canvas: HTMLCanvasElement,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / zoom - offsetX;
  const y = (event.clientY - rect.top) / zoom - offsetY;
  return { x, y };
}

export function buildFilterString({
  exposure,
  contrast,
  saturation,
  temperature,
}: {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
}) {
  const brightnessValue = clamp(1 + exposure, 0.1, 5);
  const contrastValue = clamp(1 + contrast, 0.1, 5);
  const saturationValue = clamp(1 + saturation, 0, 5);
  const hueRotate = temperature * 45; // degrees
  return `brightness(${brightnessValue}) contrast(${contrastValue}) saturate(${saturationValue}) hue-rotate(${hueRotate}deg)`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function drawBrushStroke(
  canvas: HTMLCanvasElement,
  points: Array<{ x: number; y: number }>,
  options: {
    size: number;
    color: string;
    hardness: number;
    flow: number;
    mode: 'draw' | 'erase';
  },
) {
  if (points.length < 2) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = options.size;
  ctx.globalAlpha = clamp(options.flow, 0.05, 1);
  if (options.mode === 'erase') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = options.color;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    ctx.lineTo(current.x, current.y);
  }
  ctx.stroke();
  ctx.restore();
}

export function cropCanvas(
  canvas: HTMLCanvasElement,
  rect: { x: number; y: number; width: number; height: number },
): HTMLCanvasElement {
  const cropped = createCanvas(rect.width, rect.height);
  const ctx = cropped.getContext('2d');
  if (ctx) {
    ctx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  }
  return cropped;
}

export function getBoundingBox(points: Array<{ x: number; y: number }>) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.ceil(maxX - minX),
    height: Math.ceil(maxY - minY),
  };
}

export function captureRegion(
  canvas: HTMLCanvasElement,
  rect: { x: number; y: number; width: number; height: number },
): ImageData | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { x, y, width, height } = rect;
  try {
    return ctx.getImageData(x, y, width, height);
  } catch (error) {
    console.warn('Failed to capture region', error);
    return null;
  }
}

export function restoreRegion(
  canvas: HTMLCanvasElement,
  rect: { x: number; y: number; width: number; height: number },
  data: ImageData,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.putImageData(data, rect.x, rect.y);
}
