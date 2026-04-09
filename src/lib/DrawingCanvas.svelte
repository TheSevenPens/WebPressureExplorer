<script>
  import { onMount } from 'svelte';
  import { applyPressureCurve } from './curveMath';
  import DrawingCanvasHeader from './DrawingCanvasHeader.svelte';

  const MAX_BRUSH_SIZE = 40;
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
      const processedSize = Math.max(1, processedPressure.outputPressure * MAX_BRUSH_SIZE);
      drawSegment(processedCtx, lastPos, currentPos, processedSize);
    }

    const rawSize = Math.max(1, rawPressure * MAX_BRUSH_SIZE);
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
  <DrawingCanvasHeader bind:el={toolbarEl} {info} onClear={clearDrawCanvases} />

  <div class="split-canvas-wrap">
    <div class="split-canvas-label">
      <span>Pressure processing: ON</span>
      <label class="zero-pressure-toggle">
        <input type="checkbox" bind:checked={drawZeroPressure} />
        Draw at zero effective pressure
      </label>
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

    <div class="split-canvas-label">Pressure processing: OFF</div>
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
    font-size: 13px;
    color: #000;
    padding: 2px 6px;
    background: #f5f5f0;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
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
