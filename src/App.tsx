import { useEffect } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { LayersPanel } from './components/LayersPanel';
import { AdjustmentsPanel } from './components/AdjustmentsPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { StatusBar } from './components/StatusBar';
import { useEditorStore } from './state/editorStore';

export default function App() {
  const initializeDocument = useEditorStore((state) => state.initializeDocument);
  const isReady = useEditorStore((state) => state.isDocumentReady);

  useEffect(() => {
    if (!isReady) {
      initializeDocument(1280, 720);
    }
  }, [isReady, initializeDocument]);

  if (!isReady) {
    return null;
  }

  return (
    <div className="app-root">
      <TopBar />
      <div className="workspace">
        <Toolbar />
        <CanvasStage />
        <div className="side-panels">
          <LayersPanel />
          <AdjustmentsPanel />
          <PropertiesPanel />
          <HistoryPanel />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
