# Architecture

## Component hierarchy

```
App.svelte (root - state owner)
  PressureChart.svelte               (left panel: curve visualization + interaction)
    PressureChartFormat.svelte       (display toggles: grid, labels, nodes, indicators)
    PressureResponseChart.svelte     (pen hardware response data chart)
    PressureCurveControls.svelte     (curve type selector + parameter sliders)
      PositionControls.svelte        (position EMA smoothing)
        NamedSlider.svelte
      PressureSmoothingControls.svelte (pressure EMA + order)
        NamedSlider.svelte
      NamedSlider.svelte             (multiple instances for curve params)
      PressureResponsePanel.svelte   (load/select pen response data)
  DrawingCanvas.svelte               (right panel: drawing area)
    DrawingCanvasHeader.svelte       (toolbar: live info + clear button)
```

## Component roles

### App.svelte
Single source of truth. Owns the `params` object, `livePressure`, and `liveRawPressure`. Passes `params` down to both panels; receives live pressure values back from DrawingCanvas via bindings. Disables browser context menu globally.

### PressureChart.svelte
Largest component. Renders the pressure curve chart on a Canvas 2D element. Handles:
- Drawing the curve path for all curve types (null-effect, flat, basic/sigmoid, bezier)
- Draggable min/max control nodes for basic/sigmoid curves
- Full bezier point editing (drag anchors and handles, add/remove points via buttons or context menu)
- Live pressure indicators (raw = purple, effective = green) with dashed crosshair guides
- Chart export (copy PNG to clipboard, save JPEG)
- Hosting format toggles, curve controls, and the response chart

### PressureChartFormat.svelte
Six checkboxes controlling chart display: grid, labels, nodes, node guides, raw indicator, effective indicator. Node-related toggles are disabled when no editable curve is active.

### PressureCurveControls.svelte
Curve type dropdown and conditional parameter sliders. Shows different controls depending on the active curve type:
- **null-effect**: no controls
- **flat**: height slider
- **basic/sigmoid**: CurveAmount, InputMin, InputMax, OutputMin, OutputMax, min approach radio buttons
- **bezier**: add/remove point buttons

Also hosts smoothing controls and the response data panel. Provides a "Reset curve" button.

### PositionControls.svelte / PressureSmoothingControls.svelte
Thin wrappers around NamedSlider for position EMA and pressure EMA respectively. PressureSmoothingControls also includes a smoothing order dropdown (smooth-then-curve vs curve-then-smooth).

### PressureResponsePanel.svelte
Collapsible panel for loading pen hardware pressure response data. Offers three bundled Wacom KP-504E samples and a JSON file upload. Includes a "Show effect of curve" checkbox. Fires callbacks to PressureChart when data or checkbox state changes.

### PressureResponseChart.svelte
Standalone canvas chart rendering a pen's physical pressure response (grams-force vs logical %). When "show effect of curve" is enabled, applies the current pressure curve to the Y values. Draws live indicators on the response curve matching the main chart's indicators.

### NamedSlider.svelte
Reusable labeled slider component. Features: click-to-edit value display, right-click context menu (min/max/reset), optional non-linear (power-law curved) slider response, configurable display formatting.

### DrawingCanvas.svelte
Pressure-sensitive drawing surface using Canvas 2D. Processes pointer events through the full pressure pipeline: raw pressure -> EMA smoothing -> curve application (order configurable) -> position smoothing -> brush rendering. Displays live info via DrawingCanvasHeader. Clear via Delete/Backspace or button.

### DrawingCanvasHeader.svelte
Toolbar showing pointer type, pressure flow values (raw -> intermediate -> output), tilt angles, azimuth, altitude, and a clear button.

## Shared utilities

| Module | Purpose |
|---|---|
| `curveMath.js` | Pure math: curve evaluation, bezier normalization, Hermite interpolation |
| `canvasConstants.js` | Shared padding/spacing values for canvas charts |
| `canvasUtils.js` | Shared canvas drawing: background, grid, axis labels, indicator dots |
| `emaConstants.js` | EMA smoothing constants (max, midpoint target, curve exponent) |

## State management

All application state flows through a single `params` object owned by App.svelte:

```
App.svelte (params, livePressure, liveRawPressure)
  |
  |-- bind:params --> PressureChart --> PressureCurveControls (sliders modify params)
  |
  |-- params (read) --> DrawingCanvas
  |     |
  |     |-- bind:livePressure --> App
  |     |-- bind:liveRawPressure --> App
```

Components update params via `patchParams({ key: value })` which spreads into a new object, triggering Svelte reactivity. The chart re-renders whenever params, live pressure values, or display toggles change.

## Data model

The `params` object:

| Field | Type | Range | Purpose |
|---|---|---|---|
| `curveType` | string | `'null-effect'`, `'flat'`, `'basic'`, `'sigmoid'`, `'bezier'` | Active curve algorithm |
| `softness` | number | -0.9 to 0.9 | Curve shape (power exponent / sigmoid steepness) |
| `inputMinimum` | number | 0-1 | Start of input pressure range |
| `inputMaximum` | number | 0-1 | End of input pressure range |
| `minimum` | number | 0-1 | Start of output pressure range |
| `maximum` | number | 0-1 | End of output pressure range |
| `minApproach` | string | `'clamp'`, `'cut'` | Behavior below input minimum |
| `flatLevel` | number | 0-1 | Constant output for flat curve |
| `transitionWidth` | number | 0-0.5 | Hermite transition smoothing width |
| `bezierPoints` | array | 2-16 points | Bezier curve control points |
| `emaSmoothing` | number | 0-0.99 | Pressure EMA smoothing amount |
| `positionEmaSmoothing` | number | 0-0.99 | Cursor position EMA smoothing |
| `smoothingOrder` | string | `'smooth-then-curve'`, `'curve-then-smooth'` | Pipeline order |

## Pressure response data schema

JSON files loaded via PressureResponsePanel:

```json
{
  "brand": "WACOM",
  "pen": "KP-504E",
  "inventoryid": "WAP.0038",
  "date": "2025-11-10",
  "tablet": "PTH-870",
  "records": [
    [82.0, 51.41],
    ...
  ]
}
```

Each record: `[gramForce, logicalPressurePercent]`. Records sorted by ascending gram-force.

## Key design points

1. **No runtime dependencies** — Svelte 5 + Vite 6 only. All rendering uses Canvas 2D API directly.
2. **Single state owner** — App.svelte owns params; child components either bind or receive read-only props.
3. **Pure math separation** — curveMath.js has no Svelte dependencies. It can be imported by any component or tested independently.
4. **Canvas-first rendering** — Both the curve chart and drawing surface use HTML Canvas for performance. No SVG or DOM-based charting.
5. **Shared canvas utilities** — Grid, background, labels, and indicator rendering are extracted to canvasUtils.js to avoid duplication between PressureChart and PressureResponseChart.
