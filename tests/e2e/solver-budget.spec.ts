import { expect, test } from "@playwright/test";
import { createBoard } from "../../src/core/models";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(readFileSync("tests/fixtures/solver/12x12-g11.json", "utf8")) as { rows: string[] };

test("12x12 screenshot keeps exact probabilities after recording G11 as 2", async ({
  page,
}) => {
  const board = createBoard(12, "4");
  board.id = "screenshot-budget-regression";
  board.roundId = board.id;
  board.cells = fixture.rows.flatMap((row) =>
    [...row].map((value) => ({
      observed:
        value === "."
          ? ("unknown" as const)
          : value === "g"
            ? ("gem" as const)
            : Number(value),
      flagged: false,
    })),
  );
  board.cells[126].observed = "unknown";
  await page.addInitScript((board) => {
    if (!localStorage.getItem("tidemyst-boards-v2"))
      localStorage.setItem(
        "tidemyst-boards-v2",
        JSON.stringify({
          version: 2,
          boards: [board],
          activeId: board.id,
          records: [],
        }),
      );
  }, board);
  await page.goto("/");
  await expect(page.locator(".solve-status")).toContainText("精确计算");
  const target = page.getByTestId("cell-126");
  await expect(target).toHaveAttribute("aria-label", /G11，宝石概率/);
  await target.click();
  await page.getByRole("button", { name: "记录数字 2", exact: true }).click();
  await expect(target).toHaveText("2");
  await expect(page.locator(".solve-status")).toContainText("精确计算");
  await expect(page.locator(".layout-details")).toContainText(
    "238236724977861960",
  );
  await expect(page.locator(".analysis-panel .error-callout")).toHaveCount(0);
  await expect(page.locator(".board-cell.best").first()).toBeVisible();
  await page.reload();
  await expect(target).toHaveText("2");
  await expect(page.locator(".solve-status")).toContainText("精确计算");
  await expect(page.locator(".layout-details")).toContainText(
    "238236724977861960",
  );
});
