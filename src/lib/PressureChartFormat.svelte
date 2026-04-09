<script>
  export let showGrid = true;
  export let showLabels = true;
  export let showNodes = true;
  export let showNodeGuides = true;
  export let showRawIndicator = true;
  export let showEffectiveIndicator = true;
  export let curveActive = true;
  export let onToggle = () => {};
</script>

<div class="chart-format-grid">
  <label class="checkbox-row">
    <input type="checkbox" bind:checked={showGrid} on:change={onToggle}>
    <span class="param-name">Grid</span>
  </label>

  <label class="checkbox-row">
    <input type="checkbox" bind:checked={showLabels} on:change={onToggle}>
    <span class="param-name">Labels</span>
  </label>

  <label class="checkbox-row" class:disabled={!curveActive}>
    <input type="checkbox" bind:checked={showNodes} disabled={!curveActive} on:change={onToggle}>
    <span class="param-name">Nodes</span>
  </label>

  <label class="checkbox-row" class:disabled={!curveActive}>
    <input type="checkbox" bind:checked={showNodeGuides} disabled={!curveActive} on:change={onToggle}>
    <span class="param-name">Guides</span>
  </label>

  <label class="checkbox-row">
    <input type="checkbox" bind:checked={showRawIndicator} on:change={onToggle}>
    <span class="param-name">Raw</span>
  </label>

  <label class="checkbox-row">
    <input type="checkbox" bind:checked={showEffectiveIndicator} on:change={onToggle}>
    <span class="param-name">Effective</span>
  </label>
</div>

<style>
  .chart-format-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4px 8px;
  }
</style>
