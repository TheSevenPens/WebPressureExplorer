export const EMA_MAX = 0.99;
export const EMA_MID_TARGET = 0.8;
export const EMA_CURVE_EXPONENT = Math.log(EMA_MID_TARGET / EMA_MAX) / Math.log(0.5);
