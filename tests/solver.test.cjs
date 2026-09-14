/**
 * 求解器单元测试，重点验证三年级口径：
 *   - 不含括号也能解出
 *   - 计算过程不出现分数、不出现负数
 * 运行：node tests/solver.test.cjs
 */
const { solve24, solveFlat24, evalFlat, formatSolution } = require('../src/utils/solver.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}\n    ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || '断言失败');
}

function assertEqual(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg || ''} 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
  }
}

// 检查一个“不含括号算式”的计算过程是否合法（无分数、无负数）
function flatSteps(numbers, ops) {
  const terms = [];
  let sign = 1;
  let cur = numbers[0];
  const steps = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const n = numbers[i + 1];
    if (op === '*') cur = cur * n;
    else if (op === '/') {
      if (n === 0 || cur % n !== 0) return null;
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
    if (!Number.isInteger(total) || total < 0) return null;
    steps.push(total);
  }
  return steps;
}

console.log('=== 24点求解器 单元测试 ===\n');

console.log('--- 允许括号的一般解法 ---');

test('3,3,8,8 需要分数才有解（8/(3-8/3)）', () => {
  assert(solve24([3, 3, 8, 8]) !== null, '一般解法应找到');
});

test('3,3,8,8 在“过程无分数”口径下无解', () => {
  assertEqual(solve24([3, 3, 8, 8], { integersOnly: true }), null, '不应有整数解法');
});

test('1,1,1,1 无解', () => {
  assertEqual(solve24([1, 1, 1, 1]), null, '应无解');
});

console.log('\n--- 三年级口径：不含括号 + 无分数 ---');

test('1,1,3,8 可用 1-1+3*8 解出', () => {
  const s = solveFlat24([1, 1, 3, 8]);
  assert(s !== null, '应能找到不含括号的解法');
  assert(!/[()]/.test(s), `算式不应含括号：${s}`);
  assertEqual(evalFlat([1, 1, 3, 8], s.match(/[+\-*/]/g)), 24, '结果');
});

test('1,1,2,6 必须用括号，三年级口径下无解', () => {
  assertEqual(solveFlat24([1, 1, 2, 6]), null, '应被剔除');
});

test('不含括号解法中不会出现分数', () => {
  for (const nums of [[1, 1, 3, 8], [1, 2, 6, 8], [1, 1, 5, 5], [3, 8, 8, 1]]) {
    const s = solveFlat24(nums);
    if (!s) continue;
    const seq = s.match(/\d+/g).map(Number);
    const ops = s.match(/[+\-*/]/g);
    const steps = flatSteps(seq, ops);
    assert(steps !== null, `${s} 的过程出现了分数或负数`);
    assertEqual(steps[steps.length - 1], 24, `${s} 的结果`);
  }
});

test('除不尽时 evalFlat 返回 null（视为出现分数）', () => {
  assertEqual(evalFlat([1, 2], ['/']), null, '1/2 应被拒绝');
});

test('过程中出现负数时 evalFlat 返回 null', () => {
  assertEqual(evalFlat([1, 2], ['-']), null, '1-2 应被拒绝');
});

test('先乘除后加减：2+3*4+5 = 19', () => {
  assertEqual(evalFlat([2, 3, 4, 5], ['+', '*', '+']), 19, '运算顺序');
});

test('整除且非负时正常返回：8*3/1/1 = 24', () => {
  assertEqual(evalFlat([8, 3, 1, 1], ['*', '/', '/']), 24, '结果');
});

console.log('\n--- 答案格式化 ---');

test('去掉最外层多余括号', () => {
  assertEqual(formatSolution('((8*(1+1+1)))'), '8*(1+1+1)', '格式化');
});

test('保留必要的括号', () => {
  assertEqual(formatSolution('(8/(3-(8/3)))'), '8/(3-(8/3))', '格式化');
});

console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
