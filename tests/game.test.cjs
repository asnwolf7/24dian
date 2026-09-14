/**
 * 24点游戏 - 单元测试
 * 运行: node tests/game.test.js
 */

// 只测试纯函数（页面渲染测试见 scripts/sit-test.mjs）
const {
  hasSolution,
  validateAnswer,
  getRandomQuestions,
  solve24,
  solveFlat24,
  isBlank,
  toDisplayExpression,
  formatResultMessage,
  GRADE3_QUESTIONS,
  GRADE45_QUESTIONS,
} = require('../src/utils/game.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

console.log('=== 24点游戏 单元测试 ===\n');

// 测试 hasSolution
console.log('--- hasSolution 测试 ---');

test('3,3,8,8 应该有解', () => {
  assertEqual(hasSolution([3,3,8,8]), true, '3,3,8,8');
});

test('5,5,5,1 应该有解', () => {
  assertEqual(hasSolution([5,5,5,1]), true, '5,5,5,1');
});

test('1,1,1,1 应该无解', () => {
  assertEqual(hasSolution([1,1,1,1]), false, '1,1,1,1');
});

test('4,4,4,4 应该有解 (4*4+4+4=24)', () => {
  assertEqual(hasSolution([4,4,4,4]), true, '4,4,4,4');
});

// 测试 validateAnswer
console.log('\n--- validateAnswer 测试 ---');

test('正确表达式 4*6*1*1=24', () => {
  const result = validateAnswer([4,6,1,1], '4*6*1*1');
  assertEqual(result.valid, true, 'result.valid');
});

test('错误表达式 4*6*1*2 不等于24', () => {
  const result = validateAnswer([4,6,1,1], '4*6*1*2');
  assertEqual(result.valid, false, 'result.valid');
});

test('使用了部分数字应该报错', () => {
  const result = validateAnswer([4,6,1,1], '4*6');
  assertEqual(result.valid, false, 'result.valid');
});

test('使用了错误的数字应该报错', () => {
  const result = validateAnswer([4,6,1,1], '4*6*2*2');
  assertEqual(result.valid, false, 'result.valid');
});

test('空表达式应该报错', () => {
  const result = validateAnswer([4,6,1,1], '');
  assertEqual(result.valid, false, 'result.valid');
});

test('括号表达式 (4+2)*4*1=24', () => {
  const result = validateAnswer([4,2,4,1], '(4+2)*4*1');
  assertEqual(result.valid, true, 'result.valid');
});

test('乘除按钮的数学符号 × ÷ 也能判对', () => {
  assertEqual(validateAnswer([1,2,6,8], '1×6÷2×8').valid, true, '× ÷ 判题');
  assertEqual(validateAnswer([4,6,1,1], '4×6×1×1').valid, true, '× 判题');
});

test('空白算式识别为空', () => {
  assertEqual(isBlank(''), true, '空串');
  assertEqual(isBlank('   '), true, '纯空格');
  assertEqual(isBlank(' 4 + 6 '), false, '有内容');
});

test('展示用算式把 * / 换成 × ÷', () => {
  assertEqual(toDisplayExpression('1*6/2*8'), '1×6÷2×8', '展示格式');
});

test('题题练失败提示以“计算失败”开头', () => {
  const wrong = validateAnswer([4, 6, 1, 1], '4*6*1+2');
  const msg = formatResultMessage(wrong);
  if (!msg.startsWith('计算失败：')) throw new Error(`提示不对: ${msg}`);
});

test('题题练答对时不用“计算失败”提示', () => {
  const right = validateAnswer([4, 6, 1, 1], '4*6*1*1');
  const msg = formatResultMessage(right);
  if (msg.includes('计算失败')) throw new Error(`提示不对: ${msg}`);
});

// 测试题库
console.log('\n--- 题库测试 ---');

test('3年级题库数量正确', () => {
  const questions = getRandomQuestions(3, 100);
  // 验证生成100道不重复的题
  assertEqual(questions.length, 100, 'questions.length');
  console.log(`    3年级题库: 生成100道题验证通过`);
});

test('4-5年级题库数量正确', () => {
  const questions = getRandomQuestions(45, 100);
  assertEqual(questions.length, 100, 'questions.length');
  console.log(`    4-5年级题库: 生成100道题验证通过`);
});

test('getRandomQuestions 生成题目格式正确', () => {
  const questions = getRandomQuestions(3, 10);
  assertEqual(questions.length, 10, 'questions.length');
  assertEqual(questions[0].hasOwnProperty('id'), true, 'has id');
  assertEqual(questions[0].hasOwnProperty('numbers'), true, 'has numbers');
  assertEqual(questions[0].numbers.length, 4, 'numbers.length');
});

// 全量校验题库（不是抽样，是每一道）
test('3年级题库 195 道（已剔除必须用括号的题目）', () => {
  assertEqual(GRADE3_QUESTIONS.length, 195, '3年级题量');
});

test('4-5年级题库 1362 道，且每道都有解', () => {
  assertEqual(GRADE45_QUESTIONS.length, 1362, '4-5年级题量');
  const bad = GRADE45_QUESTIONS.filter((item) => !hasSolution(item.n));
  assertEqual(bad.length, 0, `无解题: ${JSON.stringify(bad.slice(0, 5))}`);
});

test('3年级题目不超纲（数字 1-9）', () => {
  const bad = GRADE3_QUESTIONS.filter((item) => item.n.some((n) => n < 1 || n > 9));
  assertEqual(bad.length, 0, `超纲题: ${JSON.stringify(bad.slice(0, 5))}`);
});

test('3年级每道题都能用“不含括号”的算式解出', () => {
  const bad = GRADE3_QUESTIONS.filter((item) => !solveFlat24(item.n));
  assertEqual(bad.length, 0, `必须用括号的题: ${JSON.stringify(bad.slice(0, 5).map((i) => i.n))}`);
});

test('3年级参考答案不含括号', () => {
  const bad = GRADE3_QUESTIONS.filter((item) => /[()]/.test(item.s));
  assertEqual(bad.length, 0, `含括号的参考答案: ${JSON.stringify(bad.slice(0, 5))}`);
});

test('3年级参考答案的计算过程不出现分数、不出现负数', () => {
  for (const { n, s } of GRADE3_QUESTIONS) {
    const seq = s.match(/\d+/g).map(Number);
    const ops = s.match(/[+\-*/]/g);
    let total = 0;
    let sign = 1;
    let cur = seq[0];
    const terms = [];
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '*') cur *= seq[i + 1];
      else if (ops[i] === '/') {
        if (cur % seq[i + 1] !== 0) throw new Error(`${s} 出现分数`);
        cur /= seq[i + 1];
      } else {
        terms.push({ sign, value: cur });
        sign = ops[i] === '+' ? 1 : -1;
        cur = seq[i + 1];
      }
    }
    terms.push({ sign, value: cur });
    for (const t of terms) {
      total += t.sign * t.value;
      if (!Number.isInteger(total) || total < 0) throw new Error(`${s} 过程出现分数或负数`);
    }
    if (total !== 24) throw new Error(`${s} 结果不是 24`);
  }
});

test('题库无重复组合', () => {
  for (const pool of [GRADE3_QUESTIONS, GRADE45_QUESTIONS]) {
    const keys = new Set(pool.map((item) => item.n.join(',')));
    assertEqual(keys.size, pool.length, '存在重复组合');
  }
});

test('每道题的参考答案都能算出 24，且只用了题目给的数字', () => {
  for (const { n, s } of [...GRADE3_QUESTIONS, ...GRADE45_QUESTIONS]) {
    const used = (s.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
    const want = [...n].sort((a, b) => a - b);
    if (used.join(',') !== want.join(',')) {
      throw new Error(`参考答案用了错误的数字: ${s} vs ${n}`);
    }
    // eslint-disable-next-line no-new-func
    const value = new Function(`return (${s});`)();
    if (Math.abs(value - 24) > 1e-6) throw new Error(`参考答案不等于 24: ${s}`);
  }
});

test('4-5年级参考答案尽量不出现分数（1346 道为整数过程）', () => {
  let integerOnly = 0;
  for (const { n } of GRADE45_QUESTIONS) {
    const steps = solve24(n, { integersOnly: true });
    if (steps) integerOnly++;
  }
  if (integerOnly < 1346) throw new Error(`整数过程解法数量偏少: ${integerOnly}`);
});

console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
