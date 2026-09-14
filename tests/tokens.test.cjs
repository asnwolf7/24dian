/**
 * 算式输入模型单元测试
 * 运行：node tests/tokens.test.cjs
 */
const {
  tokensToExpression,
  usedIndexes,
  appendNumber,
  appendOperator,
  popToken,
  normalizeTokens,
  parseExpression,
} = require('../src/utils/tokens.js');

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

function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg || ''} 期望 ${b}，实际 ${a}`);
}

console.log('=== 算式输入模型 单元测试 ===\n');

test('点击顺序拼成算式', () => {
  let t = [];
  t = appendNumber(t, 4, 0);
  t = appendOperator(t, '+');
  t = appendNumber(t, 6, 1);
  assertEqual(tokensToExpression(t), '4+6', '表达式');
});

test('数字用过后标记为已占用', () => {
  let t = [];
  t = appendNumber(t, 4, 0);
  t = appendNumber(t, 4, 2);
  assertEqual([...usedIndexes(t)].sort(), [0, 2], '占用下标');
});

test('回退后释放数字按钮', () => {
  let t = [];
  t = appendNumber(t, 4, 0);
  t = appendOperator(t, '*');
  t = popToken(t);
  t = popToken(t);
  assertEqual([...usedIndexes(t)], [], '占用下标');
});

test('重复数字分别占用不同按钮', () => {
  let t = [];
  t = appendNumber(t, 3, 0);
  t = appendNumber(t, 3, 1);
  assertEqual([...usedIndexes(t)].sort(), [0, 1], '占用下标');
  assertEqual(tokensToExpression(t), '33', '表达式');
});

// 这是白屏之外的另一个隐蔽 bug：题目含 1 和 3 时，先点 1 再点 3 得到 "13"
test('先点 1 再点 3：回填后仍是两个数字（不因 "13" 丢输入）', () => {
  const numbers = [1, 3, 4, 4];
  let t = [];
  t = appendNumber(t, 1, 0);
  t = appendNumber(t, 3, 1);
  assertEqual(tokensToExpression(t), '13', '表达式');

  const restored = normalizeTokens(t, numbers);
  assertEqual(restored, t, '回填后的 token');
  assertEqual([...usedIndexes(restored)].sort(), [0, 1], '回填后的占用下标');
});

test('两位数 13 正常占用一个按钮', () => {
  const numbers = [13, 2, 1, 1];
  let t = [];
  t = appendNumber(t, 13, 0);
  t = appendOperator(t, '*');
  t = appendNumber(t, 2, 1);
  const restored = normalizeTokens(t, numbers);
  assertEqual(restored, t, '回填后的 token');
  assertEqual(tokensToExpression(restored), '13*2', '表达式');
});

test('乘除按钮用 × ÷，回填时不丢失', () => {
  const numbers = [1, 2, 6, 8];
  let t = [];
  t = appendNumber(t, 1, 0);
  t = appendOperator(t, '×');
  t = appendNumber(t, 6, 2);
  t = appendOperator(t, '÷');
  t = appendNumber(t, 2, 1);
  t = appendOperator(t, '×');
  t = appendNumber(t, 8, 3);
  assertEqual(tokensToExpression(t), '1×6÷2×8', '表达式');
  assertEqual(normalizeTokens(t, numbers), t, '回填后的 token');
  assertEqual([...usedIndexes(t)].sort(), [0, 1, 2, 3], '占用下标');
});

test('兜底解析也认识 × ÷', () => {
  const numbers = [1, 2, 6, 8];
  const parsed = parseExpression('1×6÷2×8', numbers);
  assertEqual(tokensToExpression(parsed), '1×6÷2×8', '表达式');
});

test('token 与当前题目不匹配时被丢弃', () => {
  const numbers = [4, 6, 1, 1];
  const dirty = [
    { type: 'num', value: '9', idx: 0 },
    { type: 'num', value: '6', idx: 1 },
    { type: 'op', value: '@' },
    { type: 'op', value: '+' },
  ];
  const restored = normalizeTokens(dirty, numbers);
  assertEqual(restored, [{ type: 'num', value: '6', idx: 1 }, { type: 'op', value: '+' }], '过滤结果');
});

test('没有 token 时从算式字符串解析（兜底）', () => {
  const numbers = [4, 6, 1, 1];
  const parsed = parseExpression('(4+6-1)*1', numbers);
  assertEqual(tokensToExpression(parsed), '(4+6-1)*1', '表达式');
  assertEqual([...usedIndexes(parsed)].sort(), [0, 1, 2, 3], '占用下标');
});

test('兜底解析遇到无法匹配的数字会跳过而不是污染题目', () => {
  const numbers = [4, 6, 1, 1];
  const parsed = parseExpression('13+4', numbers);
  assertEqual(tokensToExpression(parsed), '4', '表达式');
});

console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
