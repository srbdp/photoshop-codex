import type { Layer, Selection } from '../state/types';
import { buildFilterString } from '../utils/canvas';

interface RenderOptions {
  background: string;
  width: number;
  height: number;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  selection?: Selection;
  drawSelectionOverlay?: boolean;
}

export function renderDocument(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  options: RenderOptions,
) {
  const {
    background,
    width,
    height,
    zoom = 1,
    offsetX = 0,
    offsetY = 0,
    selection,
    drawSelectionOverlay = false,
  } = options;

  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(offsetX, offsetY);
  ctx.clearRect(-offsetX, -offsetY, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(-offsetX, -offsetY, width, height);

  layers.forEach((layer) => {
    if (!layer.visible) return;
    const layerCanvas = layer.canvas;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.translate(layer.transform.x, layer.transform.y);
    const centerX = layerCanvas.width / 2;
    const centerY = layerCanvas.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(layer.transform.rotation);
    ctx.scale(layer.transform.scaleX, layer.transform.scaleY);
    ctx.translate(-centerX, -centerY);
    ctx.filter = buildFilterString(layer.adjustments);
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();
  });

  if (selection && drawSelectionOverlay) {
    ctx.save();
    ctx.strokeStyle = 'rgba(82, 177, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
    ctx.restore();
  }

  ctx.restore();
}
