import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useEditorStore, getEditorState } from '../state/editorStore';
import { loadImageFileToCanvas } from '../utils/image';
import { exportDocument } from '../utils/export';

export function TopBar() {
  const resetDocument = useEditorStore((state) => state.resetDocument);
  const addPaintLayer = useEditorStore((state) => state.addPaintLayer);
  const addImageLayer = useEditorStore((state) => state.addImageLayer);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const history = useEditorStore((state) => state.history);
  const zoom = useEditorStore((state) => state.workspace.zoom);
  const setZoom = useEditorStore((state) => state.setWorkspaceZoom);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpen = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const canvas = await loadImageFileToCanvas(file);
      addImageLayer(canvas, file.name);
    } catch (error) {
      console.error('Failed to open file', error);
      alert('Could not open the selected file.');
    } finally {
      event.target.value = '';
    }
  };

  const handleExport = async () => {
    try {
      await exportDocument(getEditorState());
    } catch (error) {
      console.error('Export failed', error);
      alert('Export failed. See console for details.');
    }
  };

  const handleZoomChange = (delta: number) => {
    setZoom(zoom + delta);
  };

  return (
    <header className="top-bar">
      <div className="top-bar__group">
        <button type="button" onClick={resetDocument} title="New Document">
          New
        </button>
        <button type="button" onClick={handleOpen} title="Open Image">
          Open…
        </button>
        <button type="button" onClick={() => addPaintLayer()} title="Add blank layer">
          Add Layer
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileInput}
          hidden
        />
      </div>
      <div className="top-bar__group">
        <button type="button" onClick={undo} disabled={!history.canUndo} title="Undo">
          Undo
        </button>
        <button type="button" onClick={redo} disabled={!history.canRedo} title="Redo">
          Redo
        </button>
      </div>
      <div className="top-bar__group">
        <button type="button" onClick={() => handleZoomChange(-0.1)}>-</button>
        <span className="top-bar__label">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => handleZoomChange(0.1)}>+</button>
      </div>
      <div className="top-bar__group">
        <button type="button" onClick={handleExport} title="Export document">
          Export
        </button>
      </div>
    </header>
  );
}
