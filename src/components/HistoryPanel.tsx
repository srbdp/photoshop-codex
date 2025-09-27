import { useEditorStore } from '../state/editorStore';

export function HistoryPanel() {
  const history = useEditorStore((state) => state.history);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <section className="panel">
      <header className="panel__header">History</header>
      <div className="panel__body history-panel">
        <div className="history-panel__actions">
          <button type="button" onClick={undo} disabled={!history.canUndo}>
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!history.canRedo}>
            Redo
          </button>
        </div>
        <ol className="history-panel__list">
          {history.past
            .slice(-12)
            .reverse()
            .map((entry) => (
              <li key={entry.id}>{entry.label}</li>
            ))}
        </ol>
      </div>
    </section>
  );
}
