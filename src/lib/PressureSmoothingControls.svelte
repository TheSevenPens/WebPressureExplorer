<script>
  import NamedSlider from './NamedSlider.svelte';

  export let params;

  const EMA_MAX = 0.99;
  const EMA_MID_TARGET = 0.8;
  const EMA_CURVE_EXPONENT = Math.log(EMA_MID_TARGET / EMA_MAX) / Math.log(0.5);

  function patchParams(nextValues) {
    params = { ...params, ...nextValues };
  }

  function handleEmaChange(nextValue) {
    patchParams({ emaSmoothing: nextValue });
  }

  function handleOrderChange(event) {
    patchParams({ smoothingOrder: event.currentTarget.value });
  }
</script>

<div class="param-group">
  <div class="param-group-title">Input Smoothing</div>
  <div class="param">
    <div class="param-header">
      <span class="param-name">Smoothing Order</span>
    </div>
    <select value={params.smoothingOrder ?? 'smooth-then-curve'} on:change={handleOrderChange}>
      <option value="smooth-then-curve">Smooth then curve</option>
      <option value="curve-then-smooth">Curve then smooth</option>
    </select>
  </div>

  <NamedSlider
    name="Pressure EMA"
    value={params.emaSmoothing ?? 0}
    min={0}
    max={EMA_MAX}
    sliderMin={0}
    sliderMax={1}
    sliderStep={0.001}
    curved={true}
    curveExponent={EMA_CURVE_EXPONENT}
    valueDecimals={2}
    valuePrecision={3}
    onValueChange={handleEmaChange}
  />
</div>
