import { create } from 'zustand';
import { produce } from 'immer';

import type {
  EditorStore,
  Layer,
  LayerKind,
  ToolSettings,
  ToolSettingsPatch,
  SelectionRect,
  EditorState,
  HistoryEntry,
} from './types';
import {
  captureRegion,
  clamp,
  createCanvas,
  cropCanvas,
  drawBrushStroke,
  getBoundingBox,
  imageToCanvas,
  restoreRegion,
  cloneCanvas,
} from '../utils/canvas';

const DEFAULT_DOCUMENT = {
  width: 1280,
  height: 720,
  background: '#2a2a2a',
  colorProfile: 'sRGB' as const,
};

const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  brush: {
    size: 32,
    hardness: 0.7,
    flow: 0.85,
    color: '#ffffff',
  },
  eraser: {
    size: 42,
    hardness: 1,
  },
};

const MAX_HISTORY = 50;

const baseState: EditorState = {
  document: null,
  layers: [],
  activeLayerId: null,
  activeTool: 'move',
  selection: null,
  crop: {
    isActive: false,
    rect: null,
  },
  workspace: {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    showGrid: true,
  },
  isDocumentReady: false,
  history: {
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
  },
  toolSettings: DEFAULT_TOOL_SETTINGS,
  revision: 0,
};

function createLayer(
  name: string,
  kind: LayerKind,
  canvas: HTMLCanvasElement,
  options?: Partial<Omit<Layer, 'id' | 'name' | 'kind' | 'canvas'>>,
): Layer {
  const id = crypto.randomUUID();
  return {
    id,
    name,
    kind,
    canvas,
    visible: true,
    opacity: options?.opacity ?? 1,
    blendMode: options?.blendMode ?? 'source-over',
    adjustments:
      options?.adjustments ?? {
        exposure: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
      },
    transform:
      options?.transform ?? {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    locked: options?.locked ?? false,
    createdAt: Date.now(),
  };
}

function clampRectToCanvas(
  rect: SelectionRect,
  canvas: HTMLCanvasElement,
): SelectionRect {
  const x = clamp(rect.x, 0, canvas.width);
  const y = clamp(rect.y, 0, canvas.height);
  const maxWidth = canvas.width - x;
  const maxHeight = canvas.height - y;
  const width = clamp(rect.width, 0, maxWidth);
  const height = clamp(rect.height, 0, maxHeight);
  return { ...rect, x, y, width, height };
}

function withHistoryLimit(history: HistoryEntry[]): HistoryEntry[] {
  if (history.length <= MAX_HISTORY) return history;
  return history.slice(history.length - MAX_HISTORY);
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...baseState,

  initializeDocument: (width, height, options) => {
    const document = {
      ...DEFAULT_DOCUMENT,
      width,
      height,
      background: options?.background ?? DEFAULT_DOCUMENT.background,
    };

    const backgroundCanvas = createCanvas(width, height, '#ffffff');
    const backgroundLayer = createLayer('Background', 'background', backgroundCanvas, {
      locked: true,
    });

    set(
      produce((state: EditorStore) => {
        state.document = document;
        state.layers = [backgroundLayer];
        state.activeLayerId = backgroundLayer.id;
        state.isDocumentReady = true;
        state.history = {
          past: [],
          future: [],
          canUndo: false,
          canRedo: false,
        };
        state.workspace.zoom = 1;
        state.workspace.offsetX = 0;
        state.workspace.offsetY = 0;
        state.selection = null;
        state.crop = { isActive: false, rect: null };
        state.revision += 1;
      }),
    );
  },

  resetDocument: () => {
    const { width, height, background } = DEFAULT_DOCUMENT;
    get().initializeDocument(width, height, { background });
  },

  addPaintLayer: (name) => {
    const { document } = get();
    if (!document) return;
    const canvas = createCanvas(document.width, document.height);
    const layer = createLayer(name ?? `Layer ${get().layers.length}`, 'paint', canvas);

    set(
      produce((state: EditorStore) => {
        state.layers.push(layer);
        state.activeLayerId = layer.id;
        state.revision += 1;
      }),
    );

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: `Add ${layer.name}`,
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            historyState.layers = historyState.layers.filter((l) => l.id !== layer.id);
            if (historyState.activeLayerId === layer.id) {
              historyState.activeLayerId = historyState.layers.at(-1)?.id ?? null;
            }
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            historyState.layers.push(layer);
            historyState.activeLayerId = layer.id;
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  addImageLayer: (imageCanvas, name, kind = 'image') => {
    const document = get().document;
    const layer = createLayer(name ?? 'Image Layer', kind, imageCanvas);
    if (document) {
      layer.transform = {
        ...layer.transform,
        x: (document.width - imageCanvas.width) / 2,
        y: (document.height - imageCanvas.height) / 2,
      };
    }
    set(
      produce((state: EditorStore) => {
        state.layers.push(layer);
        state.activeLayerId = layer.id;
        state.revision += 1;
      }),
    );

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: `Add ${layer.name}`,
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            historyState.layers = historyState.layers.filter((l) => l.id !== layer.id);
            if (historyState.activeLayerId === layer.id) {
              historyState.activeLayerId = historyState.layers.at(-1)?.id ?? null;
            }
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            historyState.layers.push(layer);
            historyState.activeLayerId = layer.id;
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  duplicateLayer: (layerId) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer) return;
    const duplicatedCanvas = imageToCanvas(layer.canvas);
    const duplicate = createLayer(`${layer.name} Copy`, layer.kind, duplicatedCanvas, {
      blendMode: layer.blendMode,
      opacity: layer.opacity,
      adjustments: { ...layer.adjustments },
      transform: { ...layer.transform },
    });

    set(
      produce((state: EditorStore) => {
        const index = state.layers.findIndex((l) => l.id === layerId);
        state.layers.splice(index + 1, 0, duplicate);
        state.activeLayerId = duplicate.id;
        state.revision += 1;
      }),
    );

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: `Duplicate ${layer.name}`,
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            historyState.layers = historyState.layers.filter((l) => l.id !== duplicate.id);
            historyState.activeLayerId = layerId;
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            const idx = historyState.layers.findIndex((l) => l.id === layerId);
            historyState.layers.splice(idx + 1, 0, duplicate);
            historyState.activeLayerId = duplicate.id;
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  removeLayer: (layerId) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer || layer.locked) return;
    set(
      produce((state: EditorStore) => {
        state.layers = state.layers.filter((l) => l.id !== layerId);
        if (state.activeLayerId === layerId) {
          state.activeLayerId = state.layers.at(-1)?.id ?? null;
        }
        state.revision += 1;
      }),
    );

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: `Delete ${layer.name}`,
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            const backgroundIndex = layer.kind === 'background' ? 0 : historyState.layers.length;
            historyState.layers.splice(backgroundIndex, 0, layer);
            historyState.activeLayerId = layer.id;
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            historyState.layers = historyState.layers.filter((l) => l.id !== layer.id);
            if (historyState.activeLayerId === layer.id) {
              historyState.activeLayerId = historyState.layers.at(-1)?.id ?? null;
            }
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  reorderLayer: (layerId, direction) => {
    set(
      produce((state: EditorStore) => {
        const index = state.layers.findIndex((l) => l.id === layerId);
        if (index <= 0 && direction === 'down') return;
        if (index === state.layers.length - 1 && direction === 'up') return;
        const [layer] = state.layers.splice(index, 1);
        const newIndex = direction === 'up' ? index + 1 : index - 1;
        state.layers.splice(newIndex, 0, layer);
        state.revision += 1;
      }),
    );
  },

  setActiveLayer: (layerId) => {
    set(
      produce((state: EditorStore) => {
        state.activeLayerId = layerId;
      }),
    );
  },

  toggleLayerVisibility: (layerId) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer) return;
    const previous = layer.visible;
    set(
      produce((state: EditorStore) => {
        const found = state.layers.find((l) => l.id === layerId);
        if (!found) return;
        found.visible = !found.visible;
        state.revision += 1;
      }),
    );
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: `${previous ? 'Hide' : 'Show'} ${layer.name}`,
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.visible = previous;
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.visible = !previous;
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  setLayerOpacity: (layerId, opacity) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer) return;
    const nextOpacity = clamp(opacity, 0, 1);
    if (Math.abs(layer.opacity - nextOpacity) < 0.0001) return;
    const previousOpacity = layer.opacity;
    set(
      produce((state: EditorStore) => {
        const target = state.layers.find((l) => l.id === layerId);
        if (!target) return;
        target.opacity = nextOpacity;
        state.revision += 1;
      }),
    );
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: `Opacity ${layer.name}`,
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.opacity = previousOpacity;
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.opacity = nextOpacity;
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  setLayerBlendMode: (layerId, blendMode) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer) return;
    if (layer.blendMode === blendMode) return;
    const previousMode = layer.blendMode;
    set(
      produce((state: EditorStore) => {
        const target = state.layers.find((l) => l.id === layerId);
        if (!target) return;
        target.blendMode = blendMode;
        state.revision += 1;
      }),
    );
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: `Blend mode ${layer.name}`,
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.blendMode = previousMode;
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.blendMode = blendMode;
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  updateLayerTransform: (layerId, transform) => {
    set(
      produce((state: EditorStore) => {
        const layer = state.layers.find((l) => l.id === layerId);
        if (!layer) return;
        layer.transform = { ...layer.transform, ...transform };
        state.revision += 1;
      }),
    );
  },

  updateLayerAdjustments: (layerId, adjustments) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer) return;
    const previous = { ...layer.adjustments };
    const next = { ...layer.adjustments, ...adjustments };
    const isDifferent = Object.entries(adjustments).some(([key, value]) => previous[key as keyof typeof previous] !== value);
    if (!isDifferent) return;
    set(
      produce((state: EditorStore) => {
        const target = state.layers.find((l) => l.id === layerId);
        if (!target) return;
        target.adjustments = next;
        state.revision += 1;
      }),
    );
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: `Adjust ${layer.name}`,
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.adjustments = { ...previous };
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.adjustments = { ...next };
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  renameLayer: (layerId, name) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer || layer.locked) return;
    const previous = layer.name;
    if (previous === name) return;
    set(
      produce((state: EditorStore) => {
        const target = state.layers.find((l) => l.id === layerId);
        if (!target || target.locked) return;
        target.name = name;
        state.revision += 1;
      }),
    );
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: `Rename layer`,
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.name = previous;
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            const target = historyState.layers.find((l) => l.id === layerId);
            if (!target) return;
            target.name = name;
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  setActiveTool: (tool) => {
    set(
      produce((state: EditorStore) => {
        state.activeTool = tool;
        if (tool !== 'marquee') {
          state.selection = null;
        }
        if (tool !== 'crop') {
          state.crop.isActive = false;
        }
      }),
    );
  },

  setSelection: (selection) => {
    set(
      produce((state: EditorStore) => {
        state.selection = selection;
      }),
    );
  },

  clearSelection: () => {
    set(
      produce((state: EditorStore) => {
        state.selection = null;
      }),
    );
  },

  setWorkspaceZoom: (zoom) => {
    set(
      produce((state: EditorStore) => {
        state.workspace.zoom = clamp(zoom, 0.1, 6);
      }),
    );
  },

  setWorkspaceOffset: (offsetX, offsetY) => {
    set(
      produce((state: EditorStore) => {
        state.workspace.offsetX = offsetX;
        state.workspace.offsetY = offsetY;
      }),
    );
  },

  setToolSettings: (settings: ToolSettingsPatch) => {
    set(
      produce((state: EditorStore) => {
        state.toolSettings = {
          ...state.toolSettings,
          ...settings,
          brush: {
            ...state.toolSettings.brush,
            ...(settings.brush ?? {}),
          },
          eraser: {
            ...state.toolSettings.eraser,
            ...(settings.eraser ?? {}),
          },
        };
      }),
    );
  },

  commitHistory: (entry) => {
    set(
      produce((state: EditorStore) => {
        state.history.past.push(entry);
        state.history.past = withHistoryLimit(state.history.past);
        state.history.future = [];
        state.history.canUndo = state.history.past.length > 0;
        state.history.canRedo = false;
      }),
    );
  },

  undo: () => {
    const { history } = get();
    if (!history.past.length) return;
    const entry = history.past[history.past.length - 1];
    entry.undo();
    set(
      produce((state: EditorStore) => {
        state.history.past.pop();
        state.history.future.push(entry);
        state.history.canUndo = state.history.past.length > 0;
        state.history.canRedo = true;
        state.revision += 1;
      }),
    );
  },

  redo: () => {
    const { history } = get();
    if (!history.future.length) return;
    const entry = history.future[history.future.length - 1];
    entry.redo();
    set(
      produce((state: EditorStore) => {
        state.history.future.pop();
        state.history.past.push(entry);
        state.history.past = withHistoryLimit(state.history.past);
        state.history.canUndo = true;
        state.history.canRedo = state.history.future.length > 0;
        state.revision += 1;
      }),
    );
  },

  applyBrushStroke: (layerId, points, isErasing = false) => {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer) return;
    const toolSettings = get().toolSettings;
    const brush = isErasing
      ? {
          size: toolSettings.eraser.size,
          hardness: toolSettings.eraser.hardness,
          flow: 1,
          color: '#000000',
        }
      : {
          size: toolSettings.brush.size,
          hardness: toolSettings.brush.hardness,
          flow: toolSettings.brush.flow,
          color: toolSettings.brush.color,
        };
    const rect = getBoundingBox(points);
    const padding = brush.size * 1.2;
    const captureRect = clampRectToCanvas(
      {
        x: Math.floor(rect.x - padding),
        y: Math.floor(rect.y - padding),
        width: Math.ceil(rect.width + padding * 2),
        height: Math.ceil(rect.height + padding * 2),
        feather: 0,
      },
      layer.canvas,
    );

    const before = captureRegion(layer.canvas, captureRect);
    drawBrushStroke(layer.canvas, points, {
      size: brush.size,
      color: brush.color,
      hardness: brush.hardness,
      flow: brush.flow,
      mode: isErasing ? 'erase' : 'draw',
    });
    const after = captureRegion(layer.canvas, captureRect);

    set(
      produce((state: EditorStore) => {
        state.revision += 1;
      }),
    );

    if (!before || !after) return;

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: isErasing ? 'Eraser stroke' : 'Brush stroke',
      timestamp: Date.now(),
      undo: () => {
        restoreRegion(layer.canvas, captureRect, before);
        set(
          produce((historyState: EditorStore) => {
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        restoreRegion(layer.canvas, captureRect, after);
        set(
          produce((historyState: EditorStore) => {
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },

  setCropRect: (rect) => {
    set(
      produce((state: EditorStore) => {
        state.crop.rect = rect;
      }),
    );
  },

  toggleCropMode: (isActive) => {
    set(
      produce((state: EditorStore) => {
        state.crop.isActive = isActive;
        if (!isActive) {
          state.crop.rect = null;
        }
      }),
    );
  },

  commitCrop: () => {
    const { crop, document } = get();
    if (!crop.rect || !document) return;
    const beforeDocument = { ...document };
    const beforeLayers = get().layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      canvas: cloneCanvas(layer.canvas),
      transform: { ...layer.transform },
    }));
    const rect = {
      x: Math.max(0, Math.floor(crop.rect.x)),
      y: Math.max(0, Math.floor(crop.rect.y)),
      width: Math.min(document.width - crop.rect.x, Math.floor(crop.rect.width)),
      height: Math.min(document.height - crop.rect.y, Math.floor(crop.rect.height)),
    };
    if (rect.width <= 0 || rect.height <= 0) return;

    set(
      produce((state: EditorStore) => {
        state.layers = state.layers.map((layer) => ({
          ...layer,
          canvas: cropCanvas(layer.canvas, rect),
          transform: { ...layer.transform, x: 0, y: 0 },
        }));
        state.document = {
          ...state.document!,
          width: rect.width,
          height: rect.height,
        };
        state.crop = { isActive: false, rect: null };
        state.revision += 1;
      }),
    );

    const afterDocument = {
      ...beforeDocument,
      width: rect.width,
      height: rect.height,
    };
    const afterLayers = get().layers.map((layer) => ({
      id: layer.id,
      canvas: cloneCanvas(layer.canvas),
      transform: { ...layer.transform },
    }));

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label: 'Crop',
      timestamp: Date.now(),
      undo: () => {
        set(
          produce((historyState: EditorStore) => {
            historyState.document = { ...beforeDocument };
            historyState.layers.forEach((layer) => {
              const beforeLayer = beforeLayers.find((item) => item.id === layer.id);
              if (!beforeLayer) return;
              layer.canvas = cloneCanvas(beforeLayer.canvas);
              layer.transform = { ...beforeLayer.transform };
            });
            historyState.revision += 1;
          }),
        );
      },
      redo: () => {
        set(
          produce((historyState: EditorStore) => {
            historyState.document = { ...afterDocument };
            historyState.layers.forEach((layer) => {
              const afterLayer = afterLayers.find((item) => item.id === layer.id);
              if (!afterLayer) return;
              layer.canvas = cloneCanvas(afterLayer.canvas);
              layer.transform = { ...afterLayer.transform };
            });
            historyState.revision += 1;
          }),
        );
      },
    };
    get().commitHistory(entry);
  },
}));

export const getEditorState = () => useEditorStore.getState();
