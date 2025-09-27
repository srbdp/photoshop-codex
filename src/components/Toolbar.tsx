import { useEditorStore } from '../state/editorStore';
import type { ToolId } from '../state/types';

const TOOLS: Array<{ id: ToolId; label: string; shortcut: string }> = [
  { id: 'move', label: 'Move', shortcut: 'V' },
  { id: 'brush', label: 'Brush', shortcut: 'B' },
  { id: 'eraser', label: 'Erase', shortcut: 'E' },
  { id: 'marquee', label: 'Select', shortcut: 'M' },
  { id: 'crop', label: 'Crop', shortcut: 'C' },
];

export function Toolbar() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  return (
    <aside className="toolbar">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={tool.id === activeTool ? 'toolbar__button toolbar__button--active' : 'toolbar__button'}
          onClick={() => setActiveTool(tool.id)}
          title={`${tool.label} (${tool.shortcut})`}
        >
          {tool.label.slice(0, 1)}
        </button>
      ))}
    </aside>
  );
}
