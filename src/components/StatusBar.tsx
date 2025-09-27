import { useEditorStore } from '../state/editorStore';

export function StatusBar() {
  const zoom = useEditorStore((state) => state.workspace.zoom);
  const activeTool = useEditorStore((state) => state.activeTool);
  const selection = useEditorStore((state) => state.selection);
  const document = useEditorStore((state) => state.document);

  return (
    <div className="status-bar">
      <span>Tool: {activeTool}</span>
      <span>Zoom: {Math.round(zoom * 100)}%</span>
      {selection ? (
        <span>
          Selection: {selection.width}×{selection.height}
        </span>
      ) : (
        <span>No selection</span>
      )}
      {document ? (
        <span>
          Canvas: {document.width}×{document.height}
        </span>
      ) : null}
    </div>
  );
}
