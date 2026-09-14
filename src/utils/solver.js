/**
 * 24点求解器（构建期与运行期共用）
 *
 * 提供两种解法口径：
 * 1. solve24        —— 允许任意括号，用于 4-5 年级
 * 2. solveFlat24    —— 不含括号、先乘除后加减，且过程不出现分数，用于 3 年级
 */

const EPS = 1e-6;

const OPS = [
  { s: '+', f: (a, b) => a + b },
  { s: '-', f: (a, b) => a - b },
  { s: '*', f: (a, b) => a * b },
  { s: '/', f: (a, b) => (b === 0 ? null : a / b) },
];

/** 全排列 */
function permute(arr) {
  if (arr.length === 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permute(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

/**
 * 递归合并搜索 24 点（覆盖所有括号形态）
 * @param {number[]} numbers
 * @param {{integersOnly?: boolean}} options integersOnly=true 时要求每一步都是整数（不出现分数）
 * @returns {string|null} 全括号算式
 */
export function solve24(numbers, options = {}) {
  const { integersOnly = false } = options;
  const start = numbers.map((n) => ({ v: n, e: String(n) }));

  function go(list) {
    if (list.length === 1) {
      return Math.abs(list[0].v - 24) < EPS ? list[0].e : null;
    }
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const a = list[i];
        const b = list[j];
        const rest = list.filter((_, k) => k !== i && k !== j);
        for (const op of OPS) {
          const v = op.f(a.v, b.v);
          if (v === null || !isFinite(v)) continue;
          if (integersOnly && !Number.isInteger(v)) continue; // 出现分数
          const found = go([...rest, { v, e: `(${a.e}${op.s}${b.e})` }]);
          if (found) return found;
        }
      }
    }
    return null;
  }

  return go(start);
}

/** 是否存在解 */
export function hasSolution(numbers) {
  return solve24(numbers) !== null;
}

/**
 * 按“先乘除后加减、从左到右”计算不含括号的算式
 * @returns {number|null} 结果；若出现分数、负数或除不尽则返回 null
 */
export function evalFlat(numbers, ops) {
  const terms = []; // { sign, value }
  let sign = 1;
  let cur = numbers[0];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const n = numbers[i + 1];

    if (op === '*') {
      cur = cur * n;
    } else if (op === '/') {
      if (n === 0 || cur % n !== 0) return null; // 除不尽 → 出现分数
      cur = cur / n;
    } else {
      terms.push({ sign, value: cur });
      sign = op === '+' ? 1 : -1;
      cur = n;
    }
  }
  terms.push({ sign, value: cur });

  let total = 0;
  for (const t of terms) {
    total += t.sign * t.value;
    // 三年级没有学负数，过程中也不能出现分数
    if (!Number.isInteger(total) || total < 0) return null;
  }
  return total;
}

/**
 * 求“不含括号”的解法（三年级口径）
 * 中间过程必须都是非负整数，除法必须整除
 * @returns {string|null} 例如 "1-1+3*8"
 */
export function solveFlat24(numbers) {
  const OPS_CHARS = ['+', '-', '*', '/'];
  for (const perm of permute(numbers)) {
    for (const o1 of OPS_CHARS) {
      for (const o2 of OPS_CHARS) {
        for (const o3 of OPS_CHARS) {
          const ops = [o1, o2, o3];
          if (evalFlat(perm, ops) === 24) {
            return `${perm[0]}${o1}${perm[1]}${o2}${perm[2]}${o3}${perm[3]}`;
          }
        }
      }
    }
  }
  return null;
}

/** 括号是否自平衡 */
function balancedInside(s) {
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/** 去掉最外层多余括号，便于展示 */
export function formatSolution(expression) {
  if (!expression) return '';
  let s = expression;
  while (s.startsWith('(') && s.endsWith(')') && balancedInside(s.slice(1, -1))) {
    s = s.slice(1, -1);
  }
  return s;
}
