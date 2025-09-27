import { useMemo } from 'react';
import { useEditorStore } from '../state/editorStore';

const SLIDERS: Array<{
  id: 'exposure' | 'contrast' | 'saturation' | 'temperature';
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { id: 'exposure', label: 'Exposure', min: -1, max: 1, step: 0.02 },
  { id: 'contrast', label: 'Contrast', min: -1, max: 1, step: 0.02 },
  { id: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.02 },
  { id: 'temperature', label: 'Temperature', min: -1, max: 1, step: 0.02 },
];

export function AdjustmentsPanel() {
  const layers = useEditorStore((state) => state.layers);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const updateLayerAdjustments = useEditorStore((state) => state.updateLayerAdjustments);

  const activeLayer = useMemo(
    () => layers.find((layer) => layer.id === activeLayerId) ?? null,
    [layers, activeLayerId],
  );

  if (!activeLayer) {
    return (
      <section className="panel">
        <header className="panel__header">Adjustments</header>
        <div className="panel__body">Select a layer to adjust.</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel__header">Adjustments</header>
      <div className="panel__body adjustments-panel">
        {SLIDERS.map((slider) => (
          <label key={slider.id} className="adjustments-panel__row">
            <span>{slider.label}</span>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={activeLayer.adjustments[slider.id]}
              onChange={(event) =>
                updateLayerAdjustments(activeLayer.id, {
                  [slider.id]: Number.parseFloat(event.target.value),
                })
              }
            />
            <span className="adjustments-panel__value">
              {activeLayer.adjustments[slider.id].toFixed(2)}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
