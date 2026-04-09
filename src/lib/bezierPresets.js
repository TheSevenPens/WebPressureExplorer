export const BEZIER_PRESETS = [
  {
    name: 'Linear',
    points: [
      { x: 0, y: 0, inX: 0, inY: 0, outX: 0.33, outY: 0.33, handleMode: 'broken' },
      { x: 1, y: 1, inX: 0.67, inY: 0.67, outX: 1, outY: 1, handleMode: 'broken' },
    ],
  },
  {
    name: 'Soft',
    points: [
      { x: 0, y: 0, inX: 0, inY: 0, outX: 0.1, outY: 0.5, handleMode: 'broken' },
      { x: 1, y: 1, inX: 0.5, inY: 1, outX: 1, outY: 1, handleMode: 'broken' },
    ],
  },
  {
    name: 'Firm',
    points: [
      { x: 0, y: 0, inX: 0, inY: 0, outX: 0.5, outY: 0, handleMode: 'broken' },
      { x: 1, y: 1, inX: 0.9, inY: 0.5, outX: 1, outY: 1, handleMode: 'broken' },
    ],
  },
  {
    name: 'S-Curve',
    points: [
      { x: 0, y: 0, inX: 0, inY: 0, outX: 0.45, outY: 0, handleMode: 'broken' },
      { x: 1, y: 1, inX: 0.55, inY: 1, outX: 1, outY: 1, handleMode: 'broken' },
    ],
  },
  {
    name: 'Light Touch',
    points: [
      { x: 0, y: 0, inX: 0, inY: 0, outX: 0.05, outY: 0.7, handleMode: 'broken' },
      { x: 1, y: 1, inX: 0.3, inY: 1, outX: 1, outY: 1, handleMode: 'broken' },
    ],
  },
  {
    name: 'Heavy',
    points: [
      { x: 0, y: 0, inX: 0, inY: 0, outX: 0.7, outY: 0, handleMode: 'broken' },
      { x: 1, y: 1, inX: 0.95, inY: 0.3, outX: 1, outY: 1, handleMode: 'broken' },
    ],
  },
  {
    name: 'Step',
    points: [
      { x: 0, y: 0, inX: 0, inY: 0, outX: 0.15, outY: 0, handleMode: 'broken' },
      { x: 0.4, y: 0.05, inX: 0.3, inY: 0.05, outX: 0.45, outY: 0.05, handleMode: 'broken' },
      { x: 0.6, y: 0.95, inX: 0.55, inY: 0.95, outX: 0.7, outY: 0.95, handleMode: 'broken' },
      { x: 1, y: 1, inX: 0.85, inY: 1, outX: 1, outY: 1, handleMode: 'broken' },
    ],
  },
];
