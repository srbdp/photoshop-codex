export type ToolId = 'move' | 'brush' | 'eraser' | 'marquee' | 'crop';

export type BlendMode = GlobalCompositeOperation;

export type LayerKind = 'background' | 'image' | 'paint';

export interface LayerAdjustments {
  exposure: number; // range [-1, 1]
  contrast: number; // range [-1, 1]
  saturation: number; // range [-1, 1]
  temperature: number; // range [-1, 1]
}

export interface LayerTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // radians
}

export interface RasterLayer {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  adjustments: LayerAdjustments;
  transform: LayerTransform;
  locked: boolean;
  createdAt: number;
  canvas: HTMLCanvasElement;
}

export type Layer = RasterLayer;

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  feather: number;
}

export type Selection = SelectionRect | null;

export interface DocumentSettings {
  width: number;
  height: number;
  background: string;
  colorProfile: 'sRGB';
}

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
  undo: () => void;
  redo: () => void;
}

export interface WorkspaceState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  showGrid: boolean;
}

export interface BrushSettings {
  size: number;
  hardness: number;
  flow: number;
  color: string;
}

export interface EraserSettings {
  size: number;
  hardness: number;
}

export interface ToolSettings {
  brush: BrushSettings;
  eraser: EraserSettings;
}

export interface ToolSettingsPatch {
  brush?: Partial<BrushSettings>;
  eraser?: Partial<EraserSettings>;
}

export interface CropState {
  isActive: boolean;
  rect: SelectionRect | null;
}

export interface EditorState {
  document: DocumentSettings | null;
  layers: Layer[];
  activeLayerId: string | null;
  activeTool: ToolId;
  selection: Selection;
  crop: CropState;
  workspace: WorkspaceState;
  isDocumentReady: boolean;
  history: {
    past: HistoryEntry[];
    future: HistoryEntry[];
    canUndo: boolean;
    canRedo: boolean;
  };
  toolSettings: ToolSettings;
  revision: number;
}

export interface EditorActions {
  initializeDocument: (width: number, height: number, options?: Partial<DocumentSettings>) => void;
  resetDocument: () => void;
  addPaintLayer: (name?: string) => void;
  addImageLayer: (image: HTMLCanvasElement, name?: string, kind?: LayerKind) => void;
  duplicateLayer: (layerId: string) => void;
  removeLayer: (layerId: string) => void;
  reorderLayer: (layerId: string, direction: 'up' | 'down') => void;
  setActiveLayer: (layerId: string | null) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void;
  updateLayerTransform: (layerId: string, transform: Partial<LayerTransform>) => void;
  updateLayerAdjustments: (layerId: string, adjustments: Partial<LayerAdjustments>) => void;
  renameLayer: (layerId: string, name: string) => void;
  setActiveTool: (tool: ToolId) => void;
  setSelection: (selection: Selection) => void;
  clearSelection: () => void;
  setWorkspaceZoom: (zoom: number) => void;
  setWorkspaceOffset: (offsetX: number, offsetY: number) => void;
  setToolSettings: (settings: ToolSettingsPatch) => void;
  commitHistory: (entry: HistoryEntry) => void;
  undo: () => void;
  redo: () => void;
  applyBrushStroke: (layerId: string, points: Array<{ x: number; y: number }>, isErasing?: boolean) => void;
  setCropRect: (rect: SelectionRect | null) => void;
  toggleCropMode: (isActive: boolean) => void;
  commitCrop: () => void;
}

export type EditorStore = EditorState & EditorActions;
