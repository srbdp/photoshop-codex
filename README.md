# Photoshop Codex MVP

Browser-based photo editor inspired by Photoshop, scoped to a focused MVP that runs entirely client-side with React + TypeScript + Vite.

## MVP Feature Set
- **Workspace shell** with top command bar, left tool palette, right-side layer/adjustment/history panels, and live status bar.
- **Image import** (`Open…`) for PNG/JPEG/WEBP, plus blank raster layer creation.
- **Layer stack** supporting visibility toggles, opacity, blend mode presets, duplication, reordering, renaming, and deletion (background is locked).
- **Tools**: move (drag layers on the stage), brush, eraser, rectangular marquee selection, and crop (drag region + commit/cancel).
- **Adjustments**: per-layer exposure, contrast, saturation, and temperature implemented as non-destructive filters.
- **History**: undo/redo stack covering layer ops, strokes, adjustments, renames, blending, opacity, visibility, and crops.
- **Export**: flatten to PNG via the `Export` button (sRGB, preserves canvas dimensions).

## Architecture Highlights
- **React + TypeScript + Vite** front-end with Zustand + Immer handling global editor state and history.
- **Raster engine** built on HTML canvas layers; each layer owns its own backing canvas so edits remain isolated until composited.
- **Compositor** renders to the viewport canvas on every revision using CSS-like filters for live adjustments.
- **Tool runtime** handled within `CanvasStage`, with pointer sessions routing to store actions (brush strokes, marquee, crop, transforms).
- **History manager** stores functional undo/redo commands, enabling reversible state changes even for raster strokes (local pixel snapshots of affected regions).
- **Filesystem IO** relies on browser APIs (`createImageBitmap`, `toBlob`) with no server dependency.

## Directory Layout
```
src/
  canvas/          # Compositing utilities
  components/      # UI widgets and layout pieces
  state/           # Zustand store + type definitions
  tools/           # (reserved for future tool implementations)
  utils/           # Canvas helpers, export helpers, file loaders
```

## Getting Started
```bash
npm install
npm run dev
```
Visit the printed local URL (default `http://localhost:5173`) to launch the editor.

## Usage Notes
- **Move tool** (`V`): drag the active layer. Numeric transform controls are available in the Properties panel for fine adjustments.
- **Brush/Eraser** (`B` / `E`): adjust size/flow/color in the Properties panel, then paint directly on raster layers.
- **Selection** (`M`): drag to define a rectangular marquee. Use it as a visualization cue—future iterations can gate edits to the selection.
- **Crop** (`C`): drag the desired frame and click `Commit Crop` in the Properties panel; undo is supported.
- **Export**: use the top-bar button to download a flattened PNG of the current canvas.

## Roadmap Ideas
1. Masking system (layer + vector masks, selection-constrained edits).
2. Transform handles with scaling/rotation gizmos and snapping.
3. Additional tools: gradient, clone stamp, dodge/burn, text, shapes.
4. Non-destructive adjustment layers and grouped layer effects.
5. GPU-accelerated filters via WebGL/WebGPU and WebAssembly-powered RAW support.
