import type { EditorStore } from '../state/types';
import { renderDocument } from '../canvas/composer';
import { canvasToBlob, createCanvas } from './canvas';

export async function exportDocument(state: EditorStore, type: 'png' | 'jpeg' = 'png') {
  if (!state.document) throw new Error('Document not ready');
  const { width, height, background } = state.document;
  const compositeCanvas = createCanvas(width, height, background);
  const ctx = compositeCanvas.getContext('2d');
  if (!ctx) throw new Error('Unable to acquire canvas context');

  renderDocument(ctx, state.layers, {
    background,
    width,
    height,
  });

  const blob = await canvasToBlob(
    compositeCanvas,
    type === 'png' ? 'image/png' : 'image/jpeg',
    type === 'jpeg' ? 0.92 : undefined,
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `photoshop-codex-export.${type}`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
