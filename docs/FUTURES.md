# Futures

Ideas, known issues, and potential directions for WebPressureExplorer.

## Known issues

- **Context menu positioning** — The bezier right-click context menu uses `clientX`/`clientY` and can overflow off-screen on small viewports.
- **No dark mode** — Colors are hardcoded for a light theme.
- **CRLF warnings** — Git reports LF/CRLF conversion warnings on some files. A `.gitattributes` could normalize this.

## Feature suggestions

- **Max approach mode** — Analogous to the min approach (clamp/cut), add configurable behavior for the segment above the max control node. Currently it always clamps to the maximum output value.
- **Curve presets** — Save/load named curve configurations (e.g., "light touch", "heavy pressure", "S-curve") for quick switching.
- **Undo/redo** — Track param changes and allow stepping back through history, especially useful during bezier editing.
- **Bezier import/export** — Copy/paste bezier point data as JSON for sharing or backup.
- **Pressure response overlay** — Show the response data curve overlaid directly on the main pressure curve chart, not just in a separate sub-chart.
- **Multiple response datasets** — Load and compare several pens' response data side by side.
- **Touch/mobile support** — Test and improve the UI for touch-only devices and smaller screens.
- **Keyboard shortcuts** — Add shortcuts for common actions (reset, toggle grid, undo).
- **URL state persistence** — Encode params in the URL hash so configurations can be shared via link.
- **LocalStorage persistence** — Remember the last-used params across browser sessions.

## Potential directions

- **Application-specific profiles** — Model pressure curves as used by specific drawing applications (Photoshop, Clip Studio Paint, Krita) to help users understand how their app's built-in curve interacts with tablet driver curves.
- **Curve comparison mode** — Show two curves overlaid to compare different settings visually.
- **Pressure recording and playback** — Record a stroke's pressure data over time and replay it through different curve settings to compare feel without re-drawing.
- **Expanded hardware data** — Build a larger library of bundled pen response datasets covering more brands and models.
- **API / embeddable widget** — Package the curve editor as a standalone component that other web apps could embed.

## Technical improvements

- **Unit tests for curveMath.js** — The math module is pure functions with no dependencies, ideal for unit testing. Cover edge cases like zero-range inputs, boundary values, and bezier segments with near-zero spans.
- **PressureChart.svelte decomposition** — Still the largest component (~900 lines after refactoring). The bezier editing logic (hit testing, dragging, context menu) could be extracted into a dedicated module or child component.
- **Accessibility** — Add ARIA labels to the canvas-based charts and ensure all controls are keyboard-navigable.
- **Responsive layout** — The current two-panel layout doesn't adapt well to narrow viewports. Consider a stacked layout for smaller screens.
