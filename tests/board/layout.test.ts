import { it, expect } from "vitest";
import { boardLayout } from "../../src/utils/boardLayout";
it.each([8, 10, 12])(
  "fits every column of %i cells at narrow and wide container widths",
  (size) => {
    for (const width of [240, 280, 340, 390, 600, 1024]) {
      const layout = boardLayout(width, size);
      expect(layout.cell).toBeGreaterThan(0);
      expect(layout.cell).toBeLessThanOrEqual(52);
      expect(layout.width).toBeLessThanOrEqual(width);
      expect(layout.axis + size * (layout.cell + layout.gap)).toBeCloseTo(
        layout.width,
        8,
      );
    }
    expect(boardLayout(340, size).cell).toBeGreaterThan(
      boardLayout(280, size).cell,
    );
  },
);
