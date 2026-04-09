# WebPressureExplorer Overview

WebPressureExplorer is a browser-based tool for exploring, configuring, and testing pressure curves used in digital drawing applications. It targets artists, pen tablet users, and developers who want to understand or fine-tune how physical pen pressure maps to brush output.

## What it does

The app provides two side-by-side panels:

- **Pressure Curve Editor** (left) — An interactive chart where users select a curve type (basic, sigmoid, bezier, flat, or null-effect), adjust parameters via sliders and draggable control nodes, and see the resulting pressure mapping function in real time.

- **Drawing Canvas** (right) — A split drawing surface with two halves. The top half ("Pressure processing: ON") applies the full pressure pipeline (smoothing + curve). The bottom half ("Pressure processing: OFF") uses raw unprocessed pen pressure. Drawing in either half mirrors the stroke to the other, making it easy to compare the effect of pressure processing side by side.

## Key features

- **Five curve types** with distinct mathematical models (power law, sigmoid, cubic bezier, flat constant, and identity pass-through)
- **Draggable control nodes** on the chart for basic/sigmoid curves to set input/output ranges visually
- **Full bezier editor** with up to 16 anchor points, adjustable handles, mirrored/broken handle modes, and right-click context menu
- **EMA smoothing** for both pressure and cursor position, with configurable application order (smooth-then-curve or curve-then-smooth)
- **Min approach modes** (clamp vs cut) controlling how the curve behaves below the input minimum
- **Live pressure indicators** on the chart showing raw (purple) and effective (green) pressure positions in real time
- **Pressure response data** — load pen hardware measurement data (physical grams-force vs logical pressure %) from bundled samples or uploaded JSON files, with optional curve overlay
- **Export** — copy the chart to clipboard as PNG or save as JPEG (full chart or plot area only)
- **Split canvas comparison** — draw once, see the stroke rendered with and without pressure processing simultaneously
- **Direct value editing** — click any slider value to type an exact number; right-click sliders for min/max/reset

## Tech stack

- **Svelte 5** — component framework
- **Vite 6** — build tool and dev server
- **Canvas 2D API** — all chart and drawing rendering
- **No external UI libraries** — pure CSS styling, zero runtime dependencies

## Running the app

```bash
npm install
npm run dev      # Start dev server (default: http://localhost:5173)
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Project structure

```
src/
  App.svelte                    Root component, state owner
  main.js                       Entry point
  app.css                       Global styles
  lib/
    PressureChart.svelte        Curve chart + interaction + export
    PressureChartFormat.svelte  Display toggle checkboxes
    PressureCurveControls.svelte  Curve type selector + parameter sliders
    PressureResponseChart.svelte  Pen hardware response data chart
    PressureResponsePanel.svelte  Load/select response data
    PressureSmoothingControls.svelte  Pressure EMA + order controls
    PositionControls.svelte     Position EMA slider
    NamedSlider.svelte          Reusable slider with edit mode + context menu
    DrawingCanvas.svelte        Pressure-sensitive drawing surface
    DrawingCanvasHeader.svelte  Toolbar with live pointer info
    curveMath.js                Pure math: curve evaluation + bezier
    canvasConstants.js          Shared canvas padding/spacing constants
    canvasUtils.js              Shared canvas drawing utilities
    emaConstants.js             Shared EMA smoothing constants
sample-pressure-response/       Bundled pen hardware measurement JSON files
docs/                           Documentation
```
