/** Fit every column inside the actual container. All dimensions are CSS pixels. */
export function boardLayout(containerWidth: number, size: number) {
  const available = Math.max(
    0,
    Number.isFinite(containerWidth) ? containerWidth : 0,
  );
  const axis = available < 300 ? 12 : available < 360 ? 14 : 22;
  const gap = available < 300 ? 1.5 : available < 480 ? 2 : 5;
  const width = Math.min(available, axis + size * (52 + gap));
  const cell = Math.max(0, (width - axis - size * gap) / size);
  return {
    width,
    axis,
    gap,
    cell,
    numberFont: Math.min(22, cell * 0.48),
    probabilityFont: Math.min(12, Math.max(9, cell * 0.3)),
  };
}
