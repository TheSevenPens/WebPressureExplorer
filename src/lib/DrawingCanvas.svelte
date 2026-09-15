<script>
  import { onMount } from 'svelte';
  import { COLOR_MODE, PRESSURE_CONTROL } from './uiConstants';
  import { copyPngToClipboard, downloadCanvas } from './canvasExport';
  import { createPressureProcessor, readPointerSample, clearPointerSample, EMPTY_POINTER_INFO } from './pressurePipeline';

  const CANVAS_BG = '#f5f5f0';
  // PointerEvent.buttons: the tip is bit 0, the eraser end is bit 5.
  const TIP_BUTTON_BIT = 1;
  const ERASER_BUTTON_BIT = 32;
  const STROKE_PALETTE = [
    '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
    '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
    '#dcbeff', '#9a6324', '#800000', '#aaffc3', '#808000',
    '#000075',
  ];

  export let params;
  export let livePressure = null;
  export let liveRawPressure = null;
  export let liveOutputPressure = null;
  export let info = { ...EMPTY_POINTER_INFO };
  // Brush controls live in the view toolbar above, outside this component.
  export let brushSize = 40;
  export let colorMode = COLOR_MODE.BLACK;
  export let pressureControls = PRESSURE_CONTROL.SIZE;

  const processor = createPressureProcessor();

  let drawPanelEl;
  let processedCanvasEl;
  let rawCanvasEl;
  let processedCtx;
  let rawCtx;
  let resizeObserver;
  let resizeRafId = 0;
  // Exact device-pixel content box per canvas, reported by ResizeObserver.
  const devicePixelBoxes = new WeakMap();
  // Backing size last applied to each canvas, so a change to either one is seen.
  const appliedBacking = new WeakMap();
  let isDrawing = false;
  let lastPos = null;
  // Which pointer the stroke belongs to, and the canvas it started on, or null when
  // nothing is being drawn. A tablet reports a palm resting on the glass as a second
  // contact, and without an owner that contact is written straight into the same
  // stroke -- a streak across the canvas to wherever the hand landed, and the stroke
  // ending when the hand lifts.
  let activePointerId = null;
  let activeCanvas = null;
  // The last pressures actually drawn with, for the closing segment. A release reports
  // no pressure at all, and ending the stroke at zero would put a hairline on it.
  let lastPressures = null;
  let drawZeroPressure = false;
  let strokeColor = '#1a1a2e';
  let lastColorIndex = -1;

  function pickStrokeColor() {
    if (colorMode === COLOR_MODE.BLACK) {
      strokeColor = '#1a1a2e';
      return;
    }
    let index;
    do {
      index = Math.floor(Math.random() * STROKE_PALETTE.length);
    } while (index === lastColorIndex);
    lastColorIndex = index;
    strokeColor = STROKE_PALETTE[index];
  }

  // Whether the pen, mouse or finger is actually touching.
  //
  // Not the same question as "did a pointerdown arrive". A pen's barrel button sends
  // one while the tip is still in the air, and holding that button while lifting the
  // tip sends no pointerup -- so a stroke would begin on a button press and carry on
  // after the pen had left the tablet. Contact is the tip, or the eraser end.
  function isContact(pointerEvent) {
    return (pointerEvent.buttons & (TIP_BUTTON_BIT | ERASER_BUTTON_BIT)) !== 0;
  }

  // Whether an event concerns the stroke in progress. Anything is welcome when none is
  // running -- that is hovering, and the readouts should follow it.
  function ownsStroke(pointerEvent) {
    return activePointerId === null || pointerEvent.pointerId === activePointerId;
  }

  // Every position the pen reported since the last frame, rather than the single one
  // the event carries.
  //
  // A pointermove is delivered about once per screen refresh however fast the tablet
  // reports, and the rest of the readings are inside it waiting to be asked for. On a
  // 200Hz tablet at 60Hz that is two readings in three thrown away -- readings this
  // app exists to show the treatment of, and which the smoothing filter needs if its
  // window is to mean what it says.
  //
  // An untrusted event has an empty list by definition, so anything dispatched from
  // script falls back to the event itself.
  function positionsIn(pointerEvent) {
    if (typeof pointerEvent.getCoalescedEvents !== 'function') return [pointerEvent];

    const merged = pointerEvent.getCoalescedEvents();
    return merged.length > 0 ? merged : [pointerEvent];
  }

  // Forget the stroke in progress. Called wherever one can end, which is more places
  // than a pointerup: a release, the pointer leaving, a cancellation, and Clear.
  function resetStroke() {
    if (activePointerId !== null && activeCanvas?.hasPointerCapture?.(activePointerId)) {
      activeCanvas.releasePointerCapture(activePointerId);
    }
    isDrawing = false;
    lastPos = null;
    activePointerId = null;
    activeCanvas = null;
    lastPressures = null;
  }

  function pointerToCanvasPos(pointerEvent, canvasEl) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: pointerEvent.clientX - rect.left,
      y: pointerEvent.clientY - rect.top,
    };
  }

  function scheduleResize() {
    if (resizeRafId) return;
    resizeRafId = requestAnimationFrame(() => {
      resizeRafId = 0;
      resizeDrawCanvases();
    });
  }

  // Size of the canvas backing store in real screen pixels. ResizeObserver's
  // device-pixel content box is exact; the getBoundingClientRect fallback is
  // for browsers that do not report it.
  function backingSizeFor(canvasEl) {
    const exact = devicePixelBoxes.get(canvasEl);
    if (exact && exact.width > 0 && exact.height > 0) return exact;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(rect.width * dpr)),
      height: Math.max(1, Math.round(rect.height * dpr)),
    };
  }

  function resizeDrawCanvases() {
    if (!processedCanvasEl || !processedCtx || !rawCanvasEl || !rawCtx || !drawPanelEl) return;
    // Hidden while the other view is active: keep the current backing store so
    // the strokes survive, exactly as when the left panels are collapsed.
    if (drawPanelEl.clientWidth === 0) return;

    // Draw in CSS pixels while the backing store holds one texel per screen
    // pixel, so strokes are rasterised at full display resolution instead of
    // being upscaled by the compositor.
    //
    // Each canvas is measured and sized from its own box. The two are
    // equal-flex so they normally match, but their device-pixel boxes can
    // still differ by a pixel — flex rounding, or the top label wrapping
    // because of its extra checkbox — and stamping one canvas's size onto the
    // other would leave that one with a non-dpr scale, undoing the HiDPI work.
    for (const [ctx, canvasEl] of [[processedCtx, processedCanvasEl], [rawCtx, rawCanvasEl]]) {
      const { width: backingWidth, height: backingHeight } = backingSizeFor(canvasEl);
      const applied = appliedBacking.get(canvasEl);

      if (applied && applied.width === backingWidth && applied.height === backingHeight) continue;

      appliedBacking.set(canvasEl, { width: backingWidth, height: backingHeight });

      const rect = canvasEl.getBoundingClientRect();
      const previous = snapshotCanvas(canvasEl);

      canvasEl.width = backingWidth;
      canvasEl.height = backingHeight;

      // Setting width/height resets the context, so repaint the background and
      // restore existing strokes at 1:1 before reapplying the scale transform.
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, backingWidth, backingHeight);
      if (previous) ctx.drawImage(previous, 0, 0);

      ctx.setTransform(
        rect.width > 0 ? backingWidth / rect.width : 1, 0,
        0, rect.height > 0 ? backingHeight / rect.height : 1,
        0, 0,
      );
    }
  }

  // Copy of the current backing store, used to carry strokes across a resize.
  function snapshotCanvas(canvasEl) {
    if (canvasEl.width === 0 || canvasEl.height === 0) return null;
    const copy = document.createElement('canvas');
    copy.width = canvasEl.width;
    copy.height = canvasEl.height;
    copy.getContext('2d').drawImage(canvasEl, 0, 0);
    return copy;
  }

  export function clear() {
    clearDrawCanvases();
  }

  // Wipes both pictures *and* abandons the stroke in progress. Clearing only the
  // pixels left the last position behind, so carrying on drawing struck a line across
  // the cleared canvas from wherever the pen had been.
  function clearDrawCanvases() {
    resetStroke();

    for (const [ctx, canvasEl] of [[processedCtx, processedCanvasEl], [rawCtx, rawCanvasEl]]) {
      if (!ctx || !canvasEl) continue;
      const transform = ctx.getTransform();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.setTransform(transform);
    }
  }

  function drawSegment(ctx, from, to, size, opacity) {
    ctx.lineWidth = size;
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // One step of the stroke, on both canvases: the processed pressure on one and the
  // raw pressure on the other, which is the comparison this whole app is for.
  //
  // From wherever the ink last reached to `currentPos`, so a step of no distance is a
  // dot -- the line cap is round, which is what lets a tap leave a mark.
  function paintTo(currentPos, outputPressure, rawPressure) {
    if (drawZeroPressure || outputPressure > 0) {
      const pSize = pressureControls === PRESSURE_CONTROL.OPACITY ? brushSize : Math.max(1, outputPressure * brushSize);
      const pOpacity = pressureControls === PRESSURE_CONTROL.OPACITY ? Math.max(0.02, outputPressure) : 1;
      drawSegment(processedCtx, lastPos, currentPos, pSize, pOpacity);
    }

    const rSize = pressureControls === PRESSURE_CONTROL.OPACITY ? brushSize : Math.max(1, rawPressure * brushSize);
    const rOpacity = pressureControls === PRESSURE_CONTROL.OPACITY ? Math.max(0.02, rawPressure) : 1;
    drawSegment(rawCtx, lastPos, currentPos, rSize, rOpacity);

    lastPos = currentPos;
    lastPressures = { output: outputPressure, raw: rawPressure };
  }

  function handlePointerDown(event, sourceCanvas) {
    // A contact arriving while another is already drawing is a palm, a second finger,
    // or the pen touching the other canvas. The stroke keeps the pointer it started
    // with.
    if (!ownsStroke(event)) return;

    const sample = readPointerSample(processor, event, params);
    ({ liveRawPressure, livePressure, liveOutputPressure, info } = sample);

    // A barrel button in mid-air also sends a pointerdown. Only contact draws.
    if (!isContact(event)) return;

    resetStroke();
    pickStrokeColor();
    isDrawing = true;
    activePointerId = event.pointerId;
    activeCanvas = sourceCanvas;
    lastPos = pointerToCanvasPos(event, sourceCanvas);

    if (sourceCanvas?.setPointerCapture) {
      try {
        sourceCanvas.setPointerCapture(event.pointerId);
      } catch {
        // No capture available. The stroke still works; it just ends at the edge.
      }
    }

    // Mark the point of contact, so that a tap leaves something behind. Without it a
    // press and release with no movement drew nothing at all, on either canvas, and
    // tapping is the first thing anyone does to check a pen works.
    paintTo(lastPos, sample.processed.outputPressure, sample.liveRawPressure);
  }

  function handlePointerMove(event, sourceCanvas) {
    if (!ownsStroke(event)) return;

    // Contact can end without a pointerup: lifting the tip while the barrel button is
    // still held sends a move with the button bit and no contact bit.
    if (isDrawing && !isContact(event)) {
      stopDrawing(event);
      return;
    }

    // While a stroke is running the positions belong to the canvas it started on, even
    // if capture is delivering the events from somewhere else.
    const canvasEl = activeCanvas ?? sourceCanvas;

    for (const position of positionsIn(event)) {
      const sample = readPointerSample(processor, position, params);
      ({ liveRawPressure, livePressure, liveOutputPressure, info } = sample);

      if (!isDrawing) continue;

      paintTo(pointerToCanvasPos(position, canvasEl), sample.processed.outputPressure, sample.liveRawPressure);
    }
  }

  function stopDrawing(event) {
    if (event && !ownsStroke(event)) return;

    // Finish at the position the pen was actually lifted from. The release was being
    // discarded, so the ink stopped at the last move -- short of where the pen left,
    // by however far it travelled in the last frame.
    //
    // At the pressures of the last reading that had any, because a released pointer
    // reports none: drawn at zero the closing segment would be a hairline on the end
    // of the stroke rather than a finish to it.
    if (isDrawing && event && lastPos && lastPressures && activeCanvas) {
      paintTo(pointerToCanvasPos(event, activeCanvas), lastPressures.output, lastPressures.raw);
    }

    resetStroke();
    ({ liveRawPressure, livePressure, liveOutputPressure, info } =
      clearPointerSample(processor));
  }

  function copyCanvas(canvasEl) {
    copyPngToClipboard(canvasEl);
  }

  function saveCanvas(canvasEl, baseName) {
    downloadCanvas(canvasEl, baseName, 'image/png');
  }

  function onKeyDown(event) {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;

    // Hidden behind the other view: the shortcut would silently wipe a drawing
    // the user cannot even see.
    if (!drawPanelEl || drawPanelEl.clientWidth === 0) return;

    // Backspace belongs to whatever field has focus, such as NamedSlider's
    // click-to-edit value.
    const target = event.target;
    if (target instanceof HTMLElement
      && (target.isContentEditable
        || target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT')) {
      return;
    }

    event.preventDefault();
    clearDrawCanvases();
  }

  onMount(() => {
    processedCtx = processedCanvasEl.getContext('2d');
    rawCtx = rawCanvasEl.getContext('2d');
    scheduleResize();

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.devicePixelContentBoxSize?.[0];
        if (box) {
          devicePixelBoxes.set(entry.target, { width: box.inlineSize, height: box.blockSize });
        }
      }
      scheduleResize();
    });
    resizeObserver.observe(drawPanelEl);
    for (const canvasEl of [processedCanvasEl, rawCanvasEl]) {
      try {
        resizeObserver.observe(canvasEl, { box: 'device-pixel-content-box' });
      } catch {
        resizeObserver.observe(canvasEl);
      }
    }

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
  <div class="split-canvas-wrap">
    <div class="split-canvas-label">
      <span>Pressure processing: ON</span>
      <label class="zero-pressure-toggle">
        <input type="checkbox" bind:checked={drawZeroPressure} />
        Draw at zero effective pressure
      </label>
      <span class="canvas-export-buttons">
        <button type="button" class="canvas-export-btn" on:click={() => copyCanvas(processedCanvasEl)}>Copy</button>
        <button type="button" class="canvas-export-btn" on:click={() => saveCanvas(processedCanvasEl, 'processed')}>Save</button>
      </span>
    </div>
    <canvas
      class="draw-canvas"
      bind:this={processedCanvasEl}
      on:pointerdown={(e) => handlePointerDown(e, processedCanvasEl)}
      on:pointermove={(e) => handlePointerMove(e, processedCanvasEl)}
      on:pointerup={stopDrawing}
      on:pointercancel={stopDrawing}
      on:pointerleave={stopDrawing}
    ></canvas>

    <div class="split-canvas-divider"></div>

    <div class="split-canvas-label">
      <span>Pressure processing: OFF</span>
      <span class="canvas-export-buttons">
        <button type="button" class="canvas-export-btn" on:click={() => copyCanvas(rawCanvasEl)}>Copy</button>
        <button type="button" class="canvas-export-btn" on:click={() => saveCanvas(rawCanvasEl, 'unprocessed')}>Save</button>
      </span>
    </div>
    <canvas
      class="draw-canvas"
      bind:this={rawCanvasEl}
      on:pointerdown={(e) => handlePointerDown(e, rawCanvasEl)}
      on:pointermove={(e) => handlePointerMove(e, rawCanvasEl)}
      on:pointerup={stopDrawing}
      on:pointercancel={stopDrawing}
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
    font-size: 12px;
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
    font-size: 12px;
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
    font-size: 12px;
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
