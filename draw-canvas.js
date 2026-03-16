// ── Drawing Canvas (right panel) ─────────────────────────────
// Draw canvas setup, stroke rendering, pointer event info display,
// and all pointer event handlers for the drawing surface.
// Reads: params, applyPressureCurve (curve-math.js),
//        drawCurveCanvas, livePressure (curve-editor.js).


// ── Canvas setup ──────────────────────────────────────────────

const drawCanvas = document.getElementById('draw-canvas');
const drawCtx    = drawCanvas.getContext('2d');

const CANVAS_BG      = '#f5f5f0';
const MAX_BRUSH_SIZE = 40;

function resizeDrawCanvas() {
  drawCanvas.width  = drawCanvas.offsetWidth;
  drawCanvas.height = drawCanvas.offsetHeight;
  clearDrawCanvas();
}

function clearDrawCanvas() {
  drawCtx.fillStyle = CANVAS_BG;
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
}

function drawSegment(from, to, size) {
  drawCtx.lineWidth   = size;
  drawCtx.strokeStyle = '#1a1a2e';
  drawCtx.lineCap     = 'round';
  drawCtx.lineJoin    = 'round';
  drawCtx.beginPath();
  drawCtx.moveTo(from.x, from.y);
  drawCtx.lineTo(to.x, to.y);
  drawCtx.stroke();
}


// ── Info display ──────────────────────────────────────────────

const infoEls = {
  type:           document.getElementById('val-type'),
  pressureRaw:    document.getElementById('val-pressure-raw'),
  pressureMapped: document.getElementById('val-pressure-mapped'),
  tiltX:          document.getElementById('val-tiltX'),
  tiltY:          document.getElementById('val-tiltY'),
  azimuth:        document.getElementById('val-azimuth'),
  altitude:       document.getElementById('val-altitude'),
};

function updateInfo(e) {
  const toDeg = r => (r * 180 / Math.PI).toFixed(1);
  const mapped = applyPressureCurve(e.pressure);
  infoEls.type.textContent           = e.pointerType || '---';
  infoEls.pressureRaw.textContent    = e.pressure.toFixed(3);
  infoEls.pressureMapped.textContent = mapped.toFixed(3);
  infoEls.tiltX.textContent          = e.tiltX.toFixed(1) + '°';
  infoEls.tiltY.textContent          = e.tiltY.toFixed(1) + '°';
  infoEls.azimuth.textContent        = toDeg(e.azimuthAngle) + '°';
  infoEls.altitude.textContent       = toDeg(e.altitudeAngle) + '°';
}


// ── Pointer event state ───────────────────────────────────────

let isDrawing = false;
let lastPos   = null;


// ── Pointer event handlers ────────────────────────────────────

drawCanvas.addEventListener('pointerdown', (e) => {
  isDrawing    = true;
  lastPos      = { x: e.offsetX, y: e.offsetY };
  livePressure = e.pressure;
  updateInfo(e);
  drawCurveCanvas();
});

drawCanvas.addEventListener('pointermove', (e) => {
  livePressure = e.pressure;
  updateInfo(e);
  drawCurveCanvas();

  if (!isDrawing) return;

  const pos    = { x: e.offsetX, y: e.offsetY };
  const mapped = applyPressureCurve(e.pressure);
  const size   = Math.max(1, mapped * MAX_BRUSH_SIZE);

  drawSegment(lastPos, pos, size);
  lastPos = pos;
});

drawCanvas.addEventListener('pointerup', () => {
  isDrawing    = false;
  lastPos      = null;
  livePressure = null;
  drawCurveCanvas();
});

drawCanvas.addEventListener('pointerleave', () => {
  isDrawing    = false;
  lastPos      = null;
  livePressure = null;
  drawCurveCanvas();
});
