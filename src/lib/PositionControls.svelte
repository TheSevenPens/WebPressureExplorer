<script>
  import NamedSlider from './NamedSlider.svelte';
  import { EMA_MAX, EMA_CURVE_EXPONENT } from './emaConstants';

  export let params;

  function patchParams(nextValues) {
    params = { ...params, ...nextValues };
  }

  function handlePositionEmaChange(nextValue) {
    patchParams({ positionEmaSmoothing: nextValue });
  }
</script>

<div class="param-group">
  <NamedSlider
    name="Smoothing Amount"
    value={params.positionEmaSmoothing ?? 0}
    min={0}
    max={EMA_MAX}
    sliderMin={0}
    sliderMax={1}
    sliderStep={0.001}
    curved={true}
    curveExponent={EMA_CURVE_EXPONENT}
    valueDecimals={2}
    valuePrecision={3}
    onValueChange={handlePositionEmaChange}
  />
</div>
