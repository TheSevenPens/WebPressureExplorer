<script>
  import NamedSlider from './NamedSlider.svelte';
  import { EMA_MAX, EMA_CURVE_EXPONENT } from './emaConstants';

  export let params;

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
  <div class="param-group-title">Pressure Smoothing</div>
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
    name="Pressure Smoothing"
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
