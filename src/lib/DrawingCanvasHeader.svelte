<script>
  export let info;
  export let onClear = () => {};
  export let el = undefined;
  export let brushSize = 40;
  export let onBrushSizeChange = () => {};
</script>

<div id="toolbar" bind:this={el}>
  <button id="btn-clear" on:click={onClear}>Clear</button>
  <span class="info-item brush-size-control">
    Brush:
    <input
      type="range"
      min="1"
      max="500"
      step="1"
      value={brushSize}
      on:input={(e) => onBrushSizeChange(parseInt(e.currentTarget.value, 10))}
    />
    <input
      type="number"
      class="brush-size-input"
      min="1"
      max="500"
      step="1"
      value={brushSize}
      on:change={(e) => {
        const v = Math.min(500, Math.max(1, parseInt(e.currentTarget.value, 10) || 40));
        onBrushSizeChange(v);
      }}
    />
  </span>
  <span class="info-item">Type: <span class="val">{info.type}</span></span>
  {#if info.smoothingOrder === 'curve-then-smooth'}
    <span class="info-item">
      Pressure: <span class="val">{info.pressureRaw}</span>
      <span class="arrow">→</span>
      <span class="val">{info.pressureCurved}</span>
      <span class="arrow">→</span>
      <span class="val mapped">{info.pressureOutput}</span>
    </span>
  {:else}
    <span class="info-item">
      Pressure: <span class="val">{info.pressureRaw}</span>
      <span class="arrow">→</span>
      <span class="val">{info.pressureSmoothed}</span>
      <span class="arrow">→</span>
      <span class="val mapped">{info.pressureOutput}</span>
    </span>
  {/if}
  <span class="info-item">Tilt X: <span class="val">{info.tiltX}</span></span>
  <span class="info-item">Tilt Y: <span class="val">{info.tiltY}</span></span>
  <span class="info-item">Azimuth: <span class="val">{info.azimuth}</span></span>
  <span class="info-item">Altitude: <span class="val">{info.altitude}</span></span>
</div>

<style>
  .brush-size-control {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .brush-size-control input[type="range"] {
    width: 80px;
  }

  .brush-size-input {
    width: 42px;
    font-size: 11px;
    padding: 1px 3px;
    text-align: right;
  }
</style>
