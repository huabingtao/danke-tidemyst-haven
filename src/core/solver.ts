import { neighbors, type Board, type SolveResult } from "./models";

interface Constraint {
  vars: number[];
  target: number;
  sources: number[];
}
interface Component {
  vars: number[];
  constraints: Constraint[];
}
interface Counts {
  ways: bigint[];
  hits: Map<number, bigint[]>;
}
export interface SolveOptions {
  maxNodes?: number;
  maxMs?: number;
}
export function choose(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  k = Math.min(k, n - k);
  let count = 1n;
  for (let i = 1; i <= k; i++) count = (count * BigInt(n - i + 1)) / BigInt(i);
  return count;
}
function convolve(a: bigint[], b: bigint[], cap: number): bigint[] {
  const result = Array<bigint>(Math.min(cap + 1, a.length + b.length - 1)).fill(
    0n,
  );
  for (let i = 0; i < a.length; i++)
    if (a[i])
      for (let j = 0; j < b.length && i + j <= cap; j++)
        if (b[j]) result[i + j] += a[i] * b[j];
  return result;
}
function ratio(a: bigint, b: bigint): number {
  if (a === 0n) return 0;
  if (a === b) return 1;
  // Preserve strict 0/1 certainty even when decimal display precision is exhausted.
  return Math.max(
    Number.EPSILON,
    Math.min(
      1 - Number.EPSILON,
      Number((a * 1000000000000000n) / b) / 1000000000000000,
    ),
  );
}

/** Uniform prior over all layouts satisfying eight-neighbor clues and global total. Flags are ignored. */
export function solveBoard(
  board: Board,
  options: SolveOptions = {},
): SolveResult {
  const started = performance.now();
  const { size, cells, totalGems } = board;
  const probabilities: (number | null)[] = cells.map((c) =>
    c.observed === "gem" ? 1 : c.observed === "unknown" ? null : 0,
  );
  const found = cells.filter((c) => c.observed === "gem").length;
  const remaining = totalGems - found;
  let nodes = 0;
  const result = (
    status: SolveResult["status"],
    message: string,
    conflictCells: number[] = [],
    layouts = "0",
  ): SolveResult => ({
    status,
    message,
    conflictCells,
    probabilities:
      status === "exact" ? probabilities : Array(cells.length).fill(null),
    remaining,
    layouts,
    nodes,
    elapsedMs: performance.now() - started,
  });
  if (
    !Number.isInteger(size) ||
    size < 1 ||
    cells.length !== size * size ||
    !Number.isInteger(totalGems) ||
    totalGems < 0 ||
    totalGems > cells.length
  )
    return result("conflict", "棋盘尺寸或宝石总数无效");
  const unknown = cells.flatMap((c, i) =>
    c.observed === "unknown" ? [i] : [],
  );
  if (remaining < 0 || remaining > unknown.length)
    return result(
      "conflict",
      "宝石总数与已发现宝石、可用未知格子数量矛盾",
      cells.flatMap((c, i) => (c.observed === "gem" ? [i] : [])),
    );
  let constraints: Constraint[] = [];
  for (let i = 0; i < cells.length; i++) {
    const o = cells[i].observed;
    if (typeof o !== "number") continue;
    const ns = neighbors(i, size);
    constraints.push({
      vars: ns.filter((n) => cells[n].observed === "unknown"),
      target: o - ns.filter((n) => cells[n].observed === "gem").length,
      sources: [i],
    });
  }
  const fixed = new Map<number, number>();
  const canonical = (list: Constraint[]): Constraint[] | number[] => {
    const seen = new Map<string, Constraint>();
    for (const c of list) {
      const vars = c.vars.filter((v) => !fixed.has(v)).sort((a, b) => a - b);
      const target =
        c.target - c.vars.reduce((sum, v) => sum + (fixed.get(v) ?? 0), 0);
      if (target < 0 || target > vars.length) return c.sources;
      if (!vars.length) continue;
      const key = vars.join(",");
      const previous = seen.get(key);
      if (previous && previous.target !== target)
        return [...previous.sources, ...c.sources];
      seen.set(key, { vars, target, sources: c.sources });
    }
    return [...seen.values()];
  };
  // Propagate empty/full sets and subset differences before component enumeration.
  for (let iteration = 0; iteration < cells.length + 1; iteration++) {
    const normalized = canonical(constraints);
    if (normalized.length && typeof normalized[0] === "number")
      return result(
        "conflict",
        "相邻数字或宝石标记互相矛盾",
        normalized as number[],
      );
    constraints = normalized as Constraint[];
    let changed = false;
    for (const c of constraints)
      if (c.target === 0 || c.target === c.vars.length) {
        for (const v of c.vars) {
          fixed.set(v, c.target === 0 ? 0 : 1);
          changed = true;
        }
      }
    const left = remaining - [...fixed.values()].reduce((a, b) => a + b, 0);
    const free = unknown.filter((v) => !fixed.has(v));
    if (left < 0 || left > free.length)
      return result(
        "conflict",
        "局部线索与全局宝石总数矛盾",
        constraints.flatMap((c) => c.sources),
      );
    if (free.length && (left === 0 || left === free.length)) {
      for (const v of free) fixed.set(v, left === 0 ? 0 : 1);
      changed = true;
    }
    if (changed) continue;
    const additions: Constraint[] = [];
    const keys = new Set(constraints.map((c) => c.vars.join(",")));
    for (const a of constraints)
      for (const b of constraints)
        if (
          a.vars.length < b.vars.length &&
          a.vars.every((v) => b.vars.includes(v))
        ) {
          const vars = b.vars.filter((v) => !a.vars.includes(v)),
            target = b.target - a.target;
          if (target < 0 || target > vars.length)
            return result("conflict", "共享数字线索无法同时成立", [
              ...a.sources,
              ...b.sources,
            ]);
          const key = vars.join(",");
          if (!keys.has(key)) {
            additions.push({
              vars,
              target,
              sources: [...a.sources, ...b.sources],
            });
            keys.add(key);
          }
        }
    if (!additions.length) break;
    constraints.push(...additions);
  }
  const reduced = canonical(constraints);
  if (reduced.length && typeof reduced[0] === "number")
    return result("conflict", "线索冲突", reduced as number[]);
  constraints = reduced as Constraint[];
  for (const [v, p] of fixed) probabilities[v] = p;
  const left = remaining - [...fixed.values()].reduce((a, b) => a + b, 0);
  const active = unknown.filter((v) => !fixed.has(v));
  const frontier = new Set(constraints.flatMap((c) => c.vars));
  const outside = active.filter((v) => !frontier.has(v));
  const memberships = new Map<number, Constraint[]>();
  for (const c of constraints)
    for (const v of c.vars)
      memberships.set(v, [...(memberships.get(v) ?? []), c]);
  const components: Component[] = [];
  const visited = new Set<number>();
  for (const v of frontier)
    if (!visited.has(v)) {
      const queue = [v],
        vars: number[] = [],
        cs = new Set<Constraint>();
      visited.add(v);
      for (let q = 0; q < queue.length; q++) {
        const n = queue[q];
        vars.push(n);
        for (const c of memberships.get(n) ?? []) {
          cs.add(c);
          for (const next of c.vars)
            if (!visited.has(next)) {
              visited.add(next);
              queue.push(next);
            }
        }
      }
      components.push({ vars, constraints: [...cs] });
    }
  const maxNodes = options.maxNodes ?? 2000000,
    maxMs = options.maxMs ?? 5000;
  class BudgetExceeded extends Error {}
  function enumerate(component: Component): Counts {
    // Cells with identical constraint memberships are exchangeable. Enumerate
    // their gem count once, retaining C(n,k) layouts rather than visiting each
    // binary permutation. A representative cell occurs in C(n-1,k-1) layouts.
    const cs = component.constraints;
    const groupsByRefs = new Map<string, { vars: number[]; refs: number[] }>();
    for (const v of component.vars) {
      const refs = cs.flatMap((c, i) => (c.vars.includes(v) ? [i] : []));
      const key = refs.join(",");
      const group = groupsByRefs.get(key);
      if (group) group.vars.push(v);
      else groupsByRefs.set(key, { vars: [v], refs });
    }
    const groups = [...groupsByRefs.values()].sort(
      (a, b) => b.refs.length - a.refs.length || b.vars.length - a.vars.length,
    );
    const ways = Array<bigint>(component.vars.length + 1).fill(0n);
    const groupHits = groups.map(() => Array<bigint>(ways.length).fill(0n));
    const choices = groups.map((group) =>
      Array.from({ length: group.vars.length + 1 }, (_, k) =>
        choose(group.vars.length, k),
      ),
    );
    const assigned = groups.map(() => 0);
    const sums = cs.map(() => 0);
    const unassigned = cs.map((c) => c.vars.length);
    function visit(depth: number, count: number, weight: bigint) {
      nodes++;
      if (
        nodes > maxNodes ||
        (nodes % 512 === 0 && performance.now() - started > maxMs)
      )
        throw new BudgetExceeded();
      if (count > left) return;
      if (depth === groups.length) {
        ways[count] += weight;
        groups.forEach((group, i) => {
          if (assigned[i])
            groupHits[i][count] +=
              (weight * BigInt(assigned[i])) / BigInt(group.vars.length);
        });
        return;
      }
      const group = groups[depth];
      const n = group.vars.length;
      let minimum = 0,
        maximum = Math.min(n, left - count);
      for (const ci of group.refs) {
        minimum = Math.max(
          minimum,
          cs[ci].target - sums[ci] - (unassigned[ci] - n),
        );
        maximum = Math.min(maximum, cs[ci].target - sums[ci]);
      }
      for (let k = minimum; k <= maximum; k++) {
        for (const ci of group.refs) {
          sums[ci] += k;
          unassigned[ci] -= n;
        }
        assigned[depth] = k;
        visit(depth + 1, count + k, weight * choices[depth][k]);
        for (const ci of group.refs) {
          sums[ci] -= k;
          unassigned[ci] += n;
        }
      }
      assigned[depth] = 0;
    }
    visit(0, 0, 1n);
    const hits = new Map<number, bigint[]>();
    groups.forEach((group, i) => {
      for (const v of group.vars) hits.set(v, groupHits[i]);
    });
    return { ways, hits };
  }
  let counts: Counts[];
  try {
    counts = components.map(enumerate);
  } catch (e) {
    if (e instanceof BudgetExceeded)
      return result(
        "limited",
        "精确枚举超出计算预算；请补充线索后重算。未输出截断概率。",
      );
    throw e;
  }
  const freeWays = Array.from(
    { length: Math.min(outside.length, left) + 1 },
    (_, k) => choose(outside.length, k),
  );
  const prefix: bigint[][] = [[1n]];
  for (const c of counts) prefix.push(convolve(prefix.at(-1)!, c.ways, left));
  const suffix: bigint[][] = Array(counts.length + 1);
  suffix[counts.length] = freeWays;
  for (let i = counts.length - 1; i >= 0; i--)
    suffix[i] = convolve(counts[i].ways, suffix[i + 1], left);
  const layouts = convolve(prefix[counts.length], freeWays, left)[left] ?? 0n;
  if (!layouts)
    return result(
      "conflict",
      "不存在同时满足数字线索和宝石总数的布局",
      constraints.flatMap((c) => c.sources),
    );
  for (let i = 0; i < counts.length; i++) {
    const other = convolve(prefix[i], suffix[i + 1], left);
    for (const [v, hits] of counts[i].hits) {
      let numerator = 0n;
      for (let k = 0; k < hits.length; k++)
        numerator += hits[k] * (other[left - k] ?? 0n);
      probabilities[v] = ratio(numerator, layouts);
    }
  }
  if (outside.length) {
    let numerator = 0n;
    for (let k = 0; k < prefix[counts.length].length; k++)
      numerator +=
        prefix[counts.length][k] * choose(outside.length - 1, left - k - 1);
    for (const v of outside) probabilities[v] = ratio(numerator, layouts);
  }
  return result("exact", "已按全部合法布局精确计算", [], layouts.toString());
}
