<script>
  import NamedSlider from './NamedSlider.svelte';
  import { EMA_MAX, EMA_CURVE_EXPONENT } from './emaConstants';
  import { SMOOTHING_ORDER } from './uiConstants';

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
  <NamedSlider
    name="Smoothing Amount"
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

  <div class="param">
    <span class="param-name">Smoothing Order</span>
    <label>
      <input
        type="radio"
        name="smoothingOrder"
        checked={params.smoothingOrder === SMOOTHING_ORDER.SMOOTH_THEN_CURVE}
        on:change={() => patchParams({ smoothingOrder: SMOOTHING_ORDER.SMOOTH_THEN_CURVE })}
      />
      Smooth then curve
    </label>
    <label>
      <input
        type="radio"
        name="smoothingOrder"
        checked={params.smoothingOrder === SMOOTHING_ORDER.CURVE_THEN_SMOOTH}
        on:change={() => patchParams({ smoothingOrder: SMOOTHING_ORDER.CURVE_THEN_SMOOTH })}
      />
      Curve then smooth
    </label>
  </div>
</div>
