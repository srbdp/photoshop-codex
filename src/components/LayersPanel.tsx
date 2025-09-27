import { useEditorStore } from '../state/editorStore';
import type { Layer } from '../state/types';

function LayerItem({ layer }: { layer: Layer }) {
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
  const toggleLayerVisibility = useEditorStore((state) => state.toggleLayerVisibility);
  const reorderLayer = useEditorStore((state) => state.reorderLayer);
  const duplicateLayer = useEditorStore((state) => state.duplicateLayer);
  const removeLayer = useEditorStore((state) => state.removeLayer);
  const renameLayer = useEditorStore((state) => state.renameLayer);

  const handleRename = () => {
    const name = window.prompt('Layer name', layer.name);
    if (name) renameLayer(layer.id, name);
  };

  return (
    <div
      className={
        layer.id === activeLayerId ? 'layers-panel__item layers-panel__item--active' : 'layers-panel__item'
      }
      onClick={() => setActiveLayer(layer.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          setActiveLayer(layer.id);
        }
      }}
    >
      <div className="layers-panel__item-left">
        <button
          type="button"
          className="layers-panel__visibility"
          onClick={(event) => {
            event.stopPropagation();
            toggleLayerVisibility(layer.id);
          }}
        >
          {layer.visible ? '👁' : '🚫'}
        </button>
        <span className="layers-panel__name" onDoubleClick={handleRename}>
          {layer.name}
        </span>
      </div>
      <div className="layers-panel__actions">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            reorderLayer(layer.id, 'up');
          }}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            reorderLayer(layer.id, 'down');
          }}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            duplicateLayer(layer.id);
          }}
        >
          ⧉
        </button>
        <button
          type="button"
          disabled={layer.locked}
          onClick={(event) => {
            event.stopPropagation();
            removeLayer(layer.id);
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

export function LayersPanel() {
  const layers = useEditorStore((state) => state.layers);

  return (
    <section className="panel">
      <header className="panel__header">Layers</header>
      <div className="layers-panel">
        {[...layers]
          .map((layer) => layer)
          .reverse()
          .map((layer) => (
            <LayerItem key={layer.id} layer={layer} />
          ))}
      </div>
    </section>
  );
}
