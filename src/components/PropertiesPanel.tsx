import { useMemo } from 'react';
import { useEditorStore } from '../state/editorStore';
import type { ToolId } from '../state/types';

const BLEND_MODES: Array<{ id: GlobalCompositeOperation; label: string }> = [
  { id: 'source-over', label: 'Normal' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'screen', label: 'Screen' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'lighten', label: 'Lighten' },
  { id: 'darken', label: 'Darken' },
];

export function PropertiesPanel() {
  const layers = useEditorStore((state) => state.layers);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const setLayerOpacity = useEditorStore((state) => state.setLayerOpacity);
  const setLayerBlendMode = useEditorStore((state) => state.setLayerBlendMode);
  const updateLayerTransform = useEditorStore((state) => state.updateLayerTransform);
  const activeTool = useEditorStore((state) => state.activeTool);
  const toolSettings = useEditorStore((state) => state.toolSettings);
  const setToolSettings = useEditorStore((state) => state.setToolSettings);
  const crop = useEditorStore((state) => state.crop);
  const toggleCropMode = useEditorStore((state) => state.toggleCropMode);
  const commitCrop = useEditorStore((state) => state.commitCrop);

  const activeLayer = useMemo(
    () => layers.find((layer) => layer.id === activeLayerId) ?? null,
    [layers, activeLayerId],
  );

  const renderToolControls = (tool: ToolId) => {
    if (tool === 'brush') {
      return (
        <div className="panel__section">
          <header>Brush</header>
          <label className="panel__field">
            Size
            <input
              type="range"
              min={1}
              max={256}
              value={toolSettings.brush.size}
              onChange={(event) =>
                setToolSettings({ brush: { size: Number.parseFloat(event.target.value) } })
              }
            />
          </label>
          <label className="panel__field">
            Flow
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={toolSettings.brush.flow}
              onChange={(event) =>
                setToolSettings({ brush: { flow: Number.parseFloat(event.target.value) } })
              }
            />
          </label>
          <label className="panel__field">
            Color
            <input
              type="color"
              value={toolSettings.brush.color}
              onChange={(event) => setToolSettings({ brush: { color: event.target.value } })}
            />
          </label>
        </div>
      );
    }

    if (tool === 'crop') {
      return (
        <div className="panel__section">
          <header>Crop</header>
          <div className="panel__actions">
            <button type="button" onClick={commitCrop} disabled={!crop.rect}>
              Commit Crop
            </button>
            <button type="button" onClick={() => toggleCropMode(false)}>
              Cancel
            </button>
          </div>
          {crop.rect ? (
            <p className="panel__note">
              Crop to {Math.round(crop.rect.width)} × {Math.round(crop.rect.height)}
            </p>
          ) : (
            <p className="panel__note">Click and drag on the canvas to set a crop.</p>
          )}
        </div>
      );
    }

    if (tool === 'eraser') {
      return (
        <div className="panel__section">
          <header>Eraser</header>
          <label className="panel__field">
            Size
            <input
              type="range"
              min={1}
              max={256}
              value={toolSettings.eraser.size}
              onChange={(event) =>
                setToolSettings({ eraser: { size: Number.parseFloat(event.target.value) } })
              }
            />
          </label>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="panel">
      <header className="panel__header">Properties</header>
      <div className="panel__body">
        {activeLayer ? (
          <>
            <div className="panel__section">
              <header>Layer</header>
              <label className="panel__field">
                Opacity
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={activeLayer.opacity}
                  onChange={(event) =>
                    setLayerOpacity(activeLayer.id, Number.parseFloat(event.target.value))
                  }
                />
              </label>
              <label className="panel__field">
                Blend Mode
                <select
                  value={activeLayer.blendMode}
                  onChange={(event) =>
                    setLayerBlendMode(activeLayer.id, event.target.value as GlobalCompositeOperation)
                  }
                >
                  {BLEND_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="panel__section">
              <header>Transform</header>
              <div className="panel__grid">
                <label>
                  X
                  <input
                    type="number"
                    value={activeLayer.transform.x}
                    onChange={(event) =>
                      updateLayerTransform(activeLayer.id, {
                        x: Number.parseFloat(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={activeLayer.transform.y}
                    onChange={(event) =>
                      updateLayerTransform(activeLayer.id, {
                        y: Number.parseFloat(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Scale X
                  <input
                    type="number"
                    step={0.01}
                    value={activeLayer.transform.scaleX}
                    onChange={(event) =>
                      updateLayerTransform(activeLayer.id, {
                        scaleX: Number.parseFloat(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Scale Y
                  <input
                    type="number"
                    step={0.01}
                    value={activeLayer.transform.scaleY}
                    onChange={(event) =>
                      updateLayerTransform(activeLayer.id, {
                        scaleY: Number.parseFloat(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Rotation
                  <input
                    type="number"
                    value={Number((activeLayer.transform.rotation * (180 / Math.PI)).toFixed(2))}
                    onChange={(event) =>
                      updateLayerTransform(activeLayer.id, {
                        rotation: (Number.parseFloat(event.target.value) * Math.PI) / 180,
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </>
        ) : (
          <div className="panel__section">Select a layer to edit properties.</div>
        )}
        {renderToolControls(activeTool)}
      </div>
    </section>
  );
}
