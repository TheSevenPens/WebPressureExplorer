<script>
  import NamedSlider from './NamedSlider.svelte';

  export let params;

  const EMA_MAX = 0.99;
  const EMA_MID_TARGET = 0.8;
  const EMA_CURVE_EXPONENT = Math.log(EMA_MID_TARGET / EMA_MAX) / Math.log(0.5);

  function patchParams(nextValues) {
    params = { ...params, ...nextValues };
  }

  function handlePositionEmaChange(nextValue) {
    patchParams({ positionEmaSmoothing: nextValue });
  }
</script>

<div class="param-group">
  <div class="param-group-title">Position Smoothing</div>
  <NamedSlider
    name="Position EMA"
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
