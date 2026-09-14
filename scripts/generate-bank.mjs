/**
 * 题库生成脚本（构建期执行，浏览器运行时不再计算）
 * 运行：node scripts/generate-bank.mjs  或  pnpm gen:bank
 * 输出：src/utils/questionBank.js
 *
 * 出题口径：
 * - 3 年级：数字 1-9，必须能“不含括号、先乘除后加减”解出，
 *           且计算过程不出现分数、不出现负数（三年级不学括号与分数）
 * - 4-5 年级：数字 1-13，允许括号；优先给出过程为整数的参考答案
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { solve24, solveFlat24, formatSolution } from '../src/utils/solver.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** 生成 [min,max] 内全部组合（升序去重，数字可重复） */
function combos(min, max) {
  const out = [];
  for (let a = min; a <= max; a++)
    for (let b = a; b <= max; b++)
      for (let c = b; c <= max; c++)
        for (let d = c; d <= max; d++) out.push([a, b, c, d]);
  return out;
}

// ---------- 3 年级：不含括号 + 过程无分数 ----------
const grade3 = [];
for (const n of combos(1, 9)) {
  const s = solveFlat24(n);
  if (s) grade3.push({ n, s });
}

// ---------- 4-5 年级：允许括号 ----------
const grade45 = [];
let integerPreferred = 0;
for (const n of combos(1, 13)) {
  // 先找“过程全整数”的解法（参考答案更友好），没有再用一般解法
  const intExpr = solve24(n, { integersOnly: true });
  const expr = intExpr || solve24(n);
  if (!expr) continue;
  if (intExpr) integerPreferred++;
  grade45.push({ n, s: formatSolution(expr) });
}

const content = `// 本文件由 scripts/generate-bank.mjs 自动生成，请勿手动修改
// 3 年级（数字 1-9，可重复）：${grade3.length} 道
//   —— 均可用“不含括号”的算式解出，且计算过程不出现分数、不出现负数
// 4-5 年级（数字 1-13，可重复）：${grade45.length} 道（允许括号）
//   —— 其中 ${integerPreferred} 道的参考答案计算过程全为整数
// 每题格式：{ n: [4个数字], s: '参考答案' }

export const GRADE3_QUESTIONS = ${JSON.stringify(grade3)};

export const GRADE45_QUESTIONS = ${JSON.stringify(grade45)};
`;

const target = path.join(here, '..', 'src', 'utils', 'questionBank.js');
fs.writeFileSync(target, content, 'utf8');

console.log('题库已生成');
console.log(`  3 年级（不含括号、无分数）: ${grade3.length} 道`);
console.log(`  4-5 年级（允许括号）      : ${grade45.length} 道`);
console.log(`  其中过程全整数的参考答案  : ${integerPreferred} 道`);
console.log(`  输出文件: ${target}`);
console.log('');
console.log('3 年级示例：');
for (const q of grade3.slice(0, 8)) {
  console.log(`  ${q.n.join(',')}  →  ${q.s} = 24`);
}
