<script>
  export let name = 'Value';
  export let value = 0;
  export let min = 0;
  export let max = 1;
  export let step = 0.01;
  export let sliderMin = 0;
  export let sliderMax = 1;
  export let sliderStep = step;
  export let curved = false;
  export let curveExponent = 1;
  export let valueDecimals = 2;
  export let valuePrecision = null;
  export let onValueChange = () => {};

  function clamp(valueToClamp, minValue, maxValue) {
    return Math.min(maxValue, Math.max(minValue, valueToClamp));
  }

  function valueToSlider(currentValue) {
    const safeValue = clamp(Number(currentValue) || 0, min, max);

    if (!curved || curveExponent === 1) {
      return safeValue;
    }

    const valueRange = max - min;
    const sliderRange = sliderMax - sliderMin;
    if (valueRange <= 0 || sliderRange <= 0) return sliderMin;

    const normalized = (safeValue - min) / valueRange;
    const t = normalized <= 0 ? 0 : Math.pow(normalized, 1 / curveExponent);
    return sliderMin + t * sliderRange;
  }

  function sliderToValue(sliderValue) {
    const safeSlider = clamp(Number(sliderValue) || 0, sliderMin, sliderMax);

    if (!curved || curveExponent === 1) {
      return clamp(safeSlider, min, max);
    }

    const sliderRange = sliderMax - sliderMin;
    const valueRange = max - min;
    if (valueRange <= 0 || sliderRange <= 0) return min;

    const t = (safeSlider - sliderMin) / sliderRange;
    return min + Math.pow(t, curveExponent) * valueRange;
  }

  function formatValue(currentValue) {
    return Number(currentValue).toFixed(valueDecimals);
  }

  function handleInput(event) {
    let nextValue = sliderToValue(parseFloat(event.currentTarget.value));
    if (typeof valuePrecision === 'number' && Number.isFinite(valuePrecision)) {
      const scale = 10 ** valuePrecision;
      nextValue = Math.round(nextValue * scale) / scale;
    }
    onValueChange(nextValue);
  }
</script>

<div class="param">
  <div class="param-header">
    <span class="param-name">{name}</span>
    <span class="param-value">{formatValue(value)}</span>
  </div>
  <input
    type="range"
    min={sliderMin}
    max={sliderMax}
    step={sliderStep}
    value={valueToSlider(value)}
    on:input={handleInput}
  >
</div>
