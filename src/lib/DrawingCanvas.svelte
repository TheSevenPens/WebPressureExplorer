<script>
  import { onMount } from 'svelte';
  import { applyPressureCurve } from './curveMath';
  import DrawingCanvasHeader from './DrawingCanvasHeader.svelte';

  const CANVAS_BG = '#f5f5f0';
  const DIVIDER_HEIGHT = 1;

  const initialInfo = {
    type: '---',
    pressureRaw: '---',
    pressureCurved: '---',
    pressureSmoothed: '---',
    pressureOutput: '---',
    smoothingOrder: 'smooth-then-curve',
    tiltX: '---',
    tiltY: '---',
    azimuth: '---',
    altitude: '---',
  };

  export let params;
  export let livePressure = null;
  export let liveRawPressure = null;

  let info = { ...initialInfo };

  let drawPanelEl;
  let toolbarEl;
  let processedCanvasEl;
  let rawCanvasEl;
  let processedCtx;
  let rawCtx;
  let resizeObserver;
  let resizeRafId = 0;
  let lastDeviceWidth = 0;
  let lastDeviceHeight = 0;
  let isDrawing = false;
  let lastPos = null;
  let smoothedPressure = null;
  let smoothedPos = null;
  let drawZeroPressure = false;
  let brushSize = 40;

  function getSmoothedPressure(rawPressure) {
    const smoothing = Math.min(0.99, Math.max(0, Number(params.emaSmoothing ?? 0)));

    if (smoothing <= 0) {
      smoothedPressure = rawPressure;
      return rawPressure;
    }

    if (smoothedPressure === null) {
      smoothedPressure = rawPressure;
      return rawPressure;
    }

    const alpha = 1 - smoothing;
    smoothedPressure = smoothedPressure + alpha * (rawPressure - smoothedPressure);
    return smoothedPressure;
  }

  function processPressure(rawPressure) {
    const order = params.smoothingOrder ?? 'smooth-then-curve';

    if (order === 'curve-then-smooth') {
      const curved = applyPressureCurve(rawPressure, params);
      const smoothed = getSmoothedPressure(curved);
      return {
        order,
        preCurvePressure: rawPressure,
        curvedPressure: curved,
        smoothedPressure: smoothed,
        outputPressure: smoothed,
      };
    }

    const smoothed = getSmoothedPressure(rawPressure);
    const curved = applyPressureCurve(smoothed, params);
    return {
      order: 'smooth-then-curve',
      preCurvePressure: smoothed,
      curvedPressure: curved,
      smoothedPressure: smoothed,
      outputPressure: curved,
    };
  }

  function pointerToCanvasPos(pointerEvent, canvasEl) {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvasEl.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvasEl.height / rect.height : 1;
    return {
      x: (pointerEvent.clientX - rect.left) * scaleX,
      y: (pointerEvent.clientY - rect.top) * scaleY,
    };
  }

  function getSmoothedPos(rawPos) {
    const smoothing = Math.min(0.99, Math.max(0, Number(params.positionEmaSmoothing ?? 0)));

    if (smoothing <= 0) {
      smoothedPos = rawPos;
      return rawPos;
    }

    if (smoothedPos === null) {
      smoothedPos = rawPos;
      return rawPos;
    }

    const alpha = 1 - smoothing;
    smoothedPos = {
      x: smoothedPos.x + alpha * (rawPos.x - smoothedPos.x),
      y: smoothedPos.y + alpha * (rawPos.y - smoothedPos.y),
    };
    return smoothedPos;
  }

  function scheduleResize() {
    if (resizeRafId) return;
    resizeRafId = requestAnimationFrame(() => {
      resizeRafId = 0;
      resizeDrawCanvases();
    });
  }

  function resizeDrawCanvases() {
    if (!processedCanvasEl || !processedCtx || !rawCanvasEl || !rawCtx || !drawPanelEl || !toolbarEl) return;

    const cssWidth = Math.max(1, drawPanelEl.clientWidth);
    const canvasHeight = Math.max(1, processedCanvasEl.clientHeight);

    if (cssWidth === lastDeviceWidth && canvasHeight === lastDeviceHeight) {
      return;
    }

    lastDeviceWidth = cssWidth;
    lastDeviceHeight = canvasHeight;

    for (const canvasEl of [processedCanvasEl, rawCanvasEl]) {
      canvasEl.width = cssWidth;
      canvasEl.height = canvasHeight;
    }

    processedCtx.setTransform(1, 0, 0, 1, 0, 0);
    rawCtx.setTransform(1, 0, 0, 1, 0, 0);
    clearDrawCanvases();
  }

  function clearDrawCanvases() {
    for (const [ctx, canvasEl] of [[processedCtx, processedCanvasEl], [rawCtx, rawCanvasEl]]) {
      if (!ctx || !canvasEl) continue;
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    }
  }

  function drawSegment(ctx, from, to, size) {
    ctx.lineWidth = size;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function updateInfo(pointerEvent, rawPressure, processedPressure) {
    const toDegrees = (radians) => (radians * 180 / Math.PI).toFixed(1);

    info = {
      type: pointerEvent.pointerType || '---',
      pressureRaw: rawPressure.toFixed(3),
      pressureCurved: processedPressure.curvedPressure.toFixed(3),
      pressureSmoothed: processedPressure.smoothedPressure.toFixed(3),
      pressureOutput: processedPressure.outputPressure.toFixed(3),
      smoothingOrder: processedPressure.order,
      tiltX: `${Number(pointerEvent.tiltX ?? 0).toFixed(1)}°`,
      tiltY: `${Number(pointerEvent.tiltY ?? 0).toFixed(1)}°`,
      azimuth: `${toDegrees(Number(pointerEvent.azimuthAngle ?? 0))}°`,
      altitude: `${toDegrees(Number(pointerEvent.altitudeAngle ?? 0))}°`,
    };
  }

  function resetInfo() {
    info = { ...initialInfo };
  }

  function handlePointerDown(event, sourceCanvas) {
    isDrawing = true;
    lastPos = getSmoothedPos(pointerToCanvasPos(event, sourceCanvas));
    const rawPressure = Number(event.pressure ?? 0);
    const processedPressure = processPressure(rawPressure);
    liveRawPressure = rawPressure;
    livePressure = processedPressure.preCurvePressure;
    updateInfo(event, rawPressure, processedPressure);

    if (sourceCanvas?.setPointerCapture) {
      sourceCanvas.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event, sourceCanvas) {
    const rawPressure = Number(event.pressure ?? 0);
    const processedPressure = processPressure(rawPressure);
    liveRawPressure = rawPressure;
    livePressure = processedPressure.preCurvePressure;
    updateInfo(event, rawPressure, processedPressure);

    if (!isDrawing) return;

    const currentPos = getSmoothedPos(pointerToCanvasPos(event, sourceCanvas));

    if (drawZeroPressure || processedPressure.outputPressure > 0) {
      const processedSize = Math.max(1, processedPressure.outputPressure * brushSize);
      drawSegment(processedCtx, lastPos, currentPos, processedSize);
    }

    const rawSize = Math.max(1, rawPressure * brushSize);
    drawSegment(rawCtx, lastPos, currentPos, rawSize);

    lastPos = currentPos;
  }

  function stopDrawing() {
    isDrawing = false;
    lastPos = null;
    smoothedPressure = null;
    smoothedPos = null;
    liveRawPressure = null;
    livePressure = null;
    resetInfo();
  }

  async function copyCanvas(canvasEl) {
    canvasEl.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } catch (error) {
        console.error('Clipboard write failed:', error);
      }
    }, 'image/png');
  }

  function saveCanvas(canvasEl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvasEl.toDataURL('image/png');
    link.click();
  }

  function onKeyDown(event) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      clearDrawCanvases();
    }
  }

  onMount(() => {
    processedCtx = processedCanvasEl.getContext('2d');
    rawCtx = rawCanvasEl.getContext('2d');
    scheduleResize();

    resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(drawPanelEl);

    window.addEventListener('resize', scheduleResize);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      if (resizeRafId) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleResize);
      document.removeEventListener('keydown', onKeyDown);
    };
  });
</script>

<div id="draw-panel" bind:this={drawPanelEl}>
  <DrawingCanvasHeader bind:el={toolbarEl} {info} onClear={clearDrawCanvases} {brushSize} onBrushSizeChange={(v) => brushSize = v} />

  <div class="split-canvas-wrap">
    <div class="split-canvas-label">
      <span>Pressure processing: ON</span>
      <label class="zero-pressure-toggle">
        <input type="checkbox" bind:checked={drawZeroPressure} />
        Draw at zero effective pressure
      </label>
      <span class="canvas-export-buttons">
        <button type="button" class="canvas-export-btn" on:click={() => copyCanvas(processedCanvasEl)}>Copy</button>
        <button type="button" class="canvas-export-btn" on:click={() => saveCanvas(processedCanvasEl, 'processed.png')}>Save</button>
      </span>
    </div>
    <canvas
      class="draw-canvas"
      bind:this={processedCanvasEl}
      on:pointerdown={(e) => handlePointerDown(e, processedCanvasEl)}
      on:pointermove={(e) => handlePointerMove(e, processedCanvasEl)}
      on:pointerup={stopDrawing}
      on:pointerleave={stopDrawing}
    ></canvas>

    <div class="split-canvas-divider"></div>

    <div class="split-canvas-label">
      <span>Pressure processing: OFF</span>
      <span class="canvas-export-buttons">
        <button type="button" class="canvas-export-btn" on:click={() => copyCanvas(rawCanvasEl)}>Copy</button>
        <button type="button" class="canvas-export-btn" on:click={() => saveCanvas(rawCanvasEl, 'unprocessed.png')}>Save</button>
      </span>
    </div>
    <canvas
      class="draw-canvas"
      bind:this={rawCanvasEl}
      on:pointerdown={(e) => handlePointerDown(e, rawCanvasEl)}
      on:pointermove={(e) => handlePointerMove(e, rawCanvasEl)}
      on:pointerup={stopDrawing}
      on:pointerleave={stopDrawing}
    ></canvas>
  </div>
</div>

<style>
  .split-canvas-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
  }

  .split-canvas-label {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    padding: 4px 8px;
    background: #e8e8e2;
    border-bottom: 1px solid #d0d0c8;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .canvas-export-buttons {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }

  .canvas-export-btn {
    font-size: 11px;
    padding: 1px 8px;
    cursor: pointer;
    border: 1px solid #bbb;
    border-radius: 3px;
    background: #f5f5f0;
  }

  .canvas-export-btn:hover {
    background: #ddd;
  }

  .zero-pressure-toggle {
    font-size: 11px;
    color: #666;
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
  }

  .draw-canvas {
    flex: 1 1 0;
    min-height: 0;
    width: 100%;
    display: block;
    touch-action: none;
    overscroll-behavior: none;
    cursor: crosshair;
  }

  .split-canvas-divider {
    height: 1px;
    background: #ccc;
    flex-shrink: 0;
  }
</style>
