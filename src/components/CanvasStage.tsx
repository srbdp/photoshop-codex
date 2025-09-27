import { useEffect, useMemo, useRef } from 'react';
import { renderDocument } from '../canvas/composer';
import { useEditorStore, getEditorState } from '../state/editorStore';
import type { Layer, HistoryEntry } from '../state/types';
import { cloneCanvas, drawBrushStroke, getCanvasPointFromEvent } from '../utils/canvas';

interface PointerSession {
  isPointerDown: boolean;
  startPoint: { x: number; y: number } | null;
  currentLayer: Layer | null;
  layerSnapshot: HTMLCanvasElement | null;
  points: Array<{ x: number; y: number }>;
  initialTransform: Layer['transform'] | null;
  mode: 'move' | 'brush' | 'erase' | 'marquee' | 'crop';
}

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerSessionRef = useRef<PointerSession>({
    isPointerDown: false,
    startPoint: null,
    currentLayer: null,
    layerSnapshot: null,
    points: [],
    initialTransform: null,
    mode: 'move',
  });

  const document = useEditorStore((state) => state.document);
  const layers = useEditorStore((state) => state.layers);
  const workspace = useEditorStore((state) => state.workspace);
  const selection = useEditorStore((state) => state.selection);
  const crop = useEditorStore((state) => state.crop);
  const activeTool = useEditorStore((state) => state.activeTool);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const setSelection = useEditorStore((state) => state.setSelection);
  const setCropRect = useEditorStore((state) => state.setCropRect);
  const toggleCropMode = useEditorStore((state) => state.toggleCropMode);
  const updateLayerTransform = useEditorStore((state) => state.updateLayerTransform);
  const applyBrushStroke = useEditorStore((state) => state.applyBrushStroke);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
  const toolSettings = useEditorStore((state) => state.toolSettings);
  const revision = useEditorStore((state) => state.revision);

  const activeLayer = useMemo(
    () => layers.find((layer) => layer.id === activeLayerId) ?? null,
    [layers, activeLayerId],
  );

  useEffect(() => {
    if (!document || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    const zoom = workspace.zoom;
    canvas.width = document.width * ratio * zoom;
    canvas.height = document.height * ratio * zoom;
    canvas.style.width = `${document.width * zoom}px`;
    canvas.style.height = `${document.height * zoom}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderDocument(ctx, layers, {
      background: document.background,
      width: document.width,
      height: document.height,
      zoom: ratio * zoom,
      offsetX: 0,
      offsetY: 0,
      selection,
      drawSelectionOverlay: activeTool === 'marquee',
    });
  }, [document, layers, selection, activeTool, revision, workspace.zoom]);

  useEffect(() => {
    if (activeTool === 'crop') {
      toggleCropMode(true);
    }
  }, [activeTool, toggleCropMode]);

  if (!document) {
    return <div className="canvas-stage" ref={containerRef} />;
  }

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPointFromEvent(event.nativeEvent, canvas, workspace.zoom, 0, 0);

    pointerSessionRef.current = {
      isPointerDown: true,
      startPoint: point,
      currentLayer: activeLayer,
      layerSnapshot: null,
      points: [point],
      initialTransform: activeLayer ? { ...activeLayer.transform } : null,
      mode: activeTool === 'eraser' ? 'erase' : activeTool,
    };

    if (activeTool === 'brush' || activeTool === 'eraser') {
      if (!activeLayer || activeLayer.locked) return;
      pointerSessionRef.current.layerSnapshot = cloneCanvas(activeLayer.canvas);
    }

    if (activeTool === 'marquee') {
      setSelection({ x: point.x, y: point.y, width: 0, height: 0, feather: 0 });
    }

    if (activeTool === 'crop') {
      setCropRect({ x: point.x, y: point.y, width: 0, height: 0, feather: 0 });
    }
  };

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    event.preventDefault();
    const session = pointerSessionRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPointFromEvent(event.nativeEvent, canvas, workspace.zoom, 0, 0);

    if (!session.isPointerDown) {
      return;
    }

    if (session.mode === 'move' && session.currentLayer && session.initialTransform) {
      const deltaX = point.x - (session.startPoint?.x ?? 0);
      const deltaY = point.y - (session.startPoint?.y ?? 0);
      updateLayerTransform(session.currentLayer.id, {
        x: session.initialTransform.x + deltaX,
        y: session.initialTransform.y + deltaY,
      });
      return;
    }

    if ((session.mode === 'brush' || session.mode === 'erase') && session.currentLayer) {
      session.points.push(point);
      if (!session.layerSnapshot) {
        session.layerSnapshot = cloneCanvas(session.currentLayer.canvas);
      }
      drawBrushStroke(session.currentLayer.canvas, session.points.slice(-2), {
        size: session.mode === 'erase' ? toolSettings.eraser.size : toolSettings.brush.size,
        color: toolSettings.brush.color,
        hardness: session.mode === 'erase' ? toolSettings.eraser.hardness : toolSettings.brush.hardness,
        flow: session.mode === 'erase' ? 1 : toolSettings.brush.flow,
        mode: session.mode === 'erase' ? 'erase' : 'draw',
      });
      return;
    }

    if (session.mode === 'marquee' && session.startPoint) {
      const width = point.x - session.startPoint.x;
      const height = point.y - session.startPoint.y;
      setSelection({
        x: width >= 0 ? session.startPoint.x : point.x,
        y: height >= 0 ? session.startPoint.y : point.y,
        width: Math.abs(width),
        height: Math.abs(height),
        feather: 0,
      });
      return;
    }

    if (session.mode === 'crop' && session.startPoint) {
      const width = point.x - session.startPoint.x;
      const height = point.y - session.startPoint.y;
      setCropRect({
        x: width >= 0 ? session.startPoint.x : point.x,
        y: height >= 0 ? session.startPoint.y : point.y,
        width: Math.abs(width),
        height: Math.abs(height),
        feather: 0,
      });
    }
  };

  const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    event.preventDefault();
    const session = pointerSessionRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (session.mode === 'brush' || session.mode === 'erase') {
      if (session.currentLayer && session.points.length > 1) {
        if (session.layerSnapshot) {
          const ctx = session.currentLayer.canvas.getContext('2d');
          ctx?.clearRect(0, 0, session.currentLayer.canvas.width, session.currentLayer.canvas.height);
          ctx?.drawImage(session.layerSnapshot, 0, 0);
        }
        applyBrushStroke(session.currentLayer.id, session.points, session.mode === 'erase');
      }
    }

    if (session.mode === 'move' && session.currentLayer && session.initialTransform) {
      setActiveLayer(session.currentLayer.id);
      const store = getEditorState();
      const layer = store.layers.find((l) => l.id === session.currentLayer?.id);
      if (layer) {
        const before = session.initialTransform;
        const after = { ...layer.transform };
        if (before.x !== after.x || before.y !== after.y || before.rotation !== after.rotation) {
          const entry: HistoryEntry = {
            id: crypto.randomUUID(),
            label: `Move ${layer.name}`,
            timestamp: Date.now(),
            undo: () => {
              const { updateLayerTransform: applyTransform } = getEditorState();
              applyTransform(layer.id, before);
            },
            redo: () => {
              const { updateLayerTransform: applyTransform } = getEditorState();
              applyTransform(layer.id, after);
            },
          };
          store.commitHistory(entry);
        }
      }
    }

    pointerSessionRef.current = {
      isPointerDown: false,
      startPoint: null,
      currentLayer: null,
      layerSnapshot: null,
      points: [],
      initialTransform: null,
      mode: 'move',
    };

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="canvas-stage" ref={containerRef}>
      <div className="canvas-stage__inner">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {crop.isActive && crop.rect ? (
          <div
            className="crop-overlay"
            style={{
              left: `${crop.rect.x}px`,
              top: `${crop.rect.y}px`,
              width: `${crop.rect.width}px`,
              height: `${crop.rect.height}px`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
