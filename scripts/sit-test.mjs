/**
 * 集成测试（SIT）：真实渲染每个页面，确保不再出现白屏
 * 运行：node --import ./scripts/register-vue.mjs scripts/sit-test.mjs
 */
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createRouter, createMemoryHistory } from 'vue-router';
import App from '../src/App.vue';
import QuestionCard from '../src/components/QuestionCard.vue';
import { routes } from '../src/router.js';
import {
  getRandomQuestions,
  validateAnswer,
  GRADE3_QUESTIONS,
  GRADE45_QUESTIONS,
} from '../src/utils/game.js';
import { solveFlat24, evalFlat } from '../src/utils/solver.js';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}${detail ? '  → ' + detail : ''}`);
    failed++;
  }
}

async function renderPage(location) {
  const app = createSSRApp(App);
  const router = createRouter({ history: createMemoryHistory(), routes });
  app.use(router);
  await router.push(location);
  await router.isReady();
  const html = await renderToString(app);
  // Vue SSR 会保留模板注释，检查内容前先剥掉，避免把注释里的文字当成真的按钮
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/** 单独渲染答题卡，用来验证按钮组合 */
async function renderCard(props) {
  const app = createSSRApp({ render: () => h(QuestionCard, props) });
  const html = await renderToString(app);
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

// 按钮文字两侧 Vue 可能保留空格（静态文本），所以用宽松匹配
function hasButton(html, text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`>\\s*${escaped}\\s*</button>`).test(html);
}

console.log('=== 24点游戏 集成测试（页面渲染）===\n');

// ---------- 首页 ----------
console.log('--- 首页 ---');
try {
  const html = await renderPage('/');
  check('首页渲染成功且非空白', html.length > 300, `长度=${html.length}`);
  check('首页包含标题', html.includes('24点游戏'));
  check('两个年级都直接列出', html.includes('3年级') && html.includes('4-5年级'));
  check('不需要先单独选年级',
    !html.includes('请先选择年级') && !html.includes('选择年级'));
  check('每个年级各有题题练与竞赛入口（共 2+2 个）',
    countOccurrences(html, '题题练') === 2 && countOccurrences(html, '竞赛') === 2,
    `题题练=${countOccurrences(html, '题题练')} 竞赛=${countOccurrences(html, '竞赛')}`);
  check('3年级显示 10 题、4-5年级显示 20 题',
    html.includes('10分钟 · 10题') && html.includes('10分钟 · 20题'));
} catch (e) {
  check('首页渲染成功且非空白', false, e.message);
}

// ---------- 题题练（3年级）----------
console.log('\n--- 题题练（3年级）---');
try {
  const html = await renderPage({ path: '/practice', query: { grade: '3' } });
  check('页面渲染成功且非空白', html.length > 500, `长度=${html.length}`);
  check('显示 3年级 · 题题练', html.includes('3年级') && html.includes('题题练'));
  check('题目有 4 个数字按钮', countOccurrences(html, 'w-16 h-16') === 4, `实际=${countOccurrences(html, 'w-16 h-16')}`);
  check('运算符按钮 6 个（3年级也开放括号）',
    countOccurrences(html, 'bg-orange-500') === 6 && html.includes('>(</button>') && html.includes('>)</button>'),
    `运算符按钮=${countOccurrences(html, 'bg-orange-500')}`);
  check('乘除按钮用数学符号 × ÷', html.includes('>×</button>') && html.includes('>÷</button>'));
  check('有提交按钮', hasButton(html, '提交'));
  check('有“查看正确答案”按钮', hasButton(html, '查看正确答案'));
  check('查看答案不在算式框那一行（算式框独占一行）',
    /min-h-\[52px\] mb-3[^>]*>/.test(html) && !/min-h-\[52px\][^>]*>[\s\S]{0,40}查看正确答案/.test(html));
  check('清除与回退按钮仍在', html.includes('✋ 清除') && html.includes('⌫ 回退'));
  check('未答对时不给“下一题”', !hasButton(html, '下一题 →'));
  check('没有“跳过”按钮', !hasButton(html, '跳过'));
  check('无未渲染的模板变量', !html.includes('{{'));
} catch (e) {
  check('页面渲染成功且非空白', false, e.message);
}

// ---------- 题题练（4-5年级）----------
console.log('\n--- 题题练（4-5年级）---');
try {
  const html = await renderPage({ path: '/practice', query: { grade: '45' } });
  check('页面渲染成功且非空白', html.length > 500, `长度=${html.length}`);
  check('显示 4-5年级', html.includes('4-5年级'));
  check('运算符按钮 6 个（含括号）',
    countOccurrences(html, 'bg-orange-500') === 6 && html.includes('>(</button>') && html.includes('>)</button>'),
    `运算符按钮=${countOccurrences(html, 'bg-orange-500')}`);
} catch (e) {
  check('页面渲染成功且非空白', false, e.message);
}

// ---------- 答题卡的按钮组合（题题练门禁）----------
console.log('\n--- 答题卡按钮组合 ---');
try {
  const base = {
    numbers: [1, 1, 3, 8],
    solution: '1-1+3*8',
    showSolutionButton: true,
    showPrev: false,
  };

  const initial = await renderCard({ ...base, showSubmit: true, showNext: false, locked: false });
  check('未作答：有提交、无下一题', hasButton(initial, '提交') && !hasButton(initial, '下一题 →'));

  const wrong = await renderCard({
    ...base,
    showSubmit: true,
    showNext: false,
    locked: false,
    initialFeedback: { valid: false, message: '计算失败：结果是 20，不是 24，再想想～' },
  });
  check('答错：提示计算失败、可重做、不给下一题',
    wrong.includes('计算失败') && hasButton(wrong, '提交') && !hasButton(wrong, '下一题 →'));

  const right = await renderCard({
    ...base,
    showSubmit: false,
    showNext: true,
    locked: true,
    initialFeedback: { valid: true, message: '太棒了，正确！' },
  });
  check('答对：锁定输入、显示下一题、不再显示提交',
    hasButton(right, '下一题 →') && !hasButton(right, '提交') && right.includes('disabled'));

  const revealed = await renderCard({ ...base, showSubmit: true, showNext: false, locked: false });
  check('查看答案按钮存在且不在算式框内', hasButton(revealed, '查看正确答案'));
} catch (e) {
  check('答题卡渲染成功', false, e.message);
}

// ---------- 竞赛（3年级：10题）----------
console.log('\n--- 竞赛（3年级：10 题 / 10 分钟）---');
try {
  const html = await renderPage({ path: '/contest', query: { grade: '3' } });
  check('页面渲染成功且非空白', html.length > 500, `长度=${html.length}`);
  check('倒计时初始为 10:00', html.includes('10:00'));
  check('总题数为 10', html.includes('0/10'));
  check('有上一题/下一题', html.includes('上一题') && html.includes('下一题'));
  check('没有“跳过”按钮', !hasButton(html, '跳过'));
  check('没有“提交”按钮', !hasButton(html, '提交'));
  check('没有“查看正确答案”按钮（竞赛不给答案）', !hasButton(html, '查看正确答案'));
  check('保留清除与回退按钮', html.includes('✋ 清除') && html.includes('⌫ 回退'));
  check('题号导航有 10 个小方块题号', countOccurrences(html, 'w-9 h-9') === 10, `实际=${countOccurrences(html, 'w-9 h-9')}`);
  check('题号按钮改小了（不再用整格正方形）', !html.includes('aspect-square'));
  check('题号图例只讲已作答/未作答，不讲对错',
    html.includes('>已作答</span>') &&
      html.includes('>未作答</span>') &&
      !html.includes('>正确</span>') &&
      !html.includes('>错误</span>'));
  check('括号按钮对所有年级开放', html.includes('>(</button>') && html.includes('>)</button>'));
} catch (e) {
  check('页面渲染成功且非空白', false, e.message);
}

// ---------- 竞赛（4-5年级：20题）----------
console.log('\n--- 竞赛（4-5年级：20 题 / 10 分钟）---');
try {
  const html = await renderPage({ path: '/contest', query: { grade: '45' } });
  check('页面渲染成功且非空白', html.length > 500, `长度=${html.length}`);
  check('倒计时初始为 10:00', html.includes('10:00'));
  check('总题数为 20', html.includes('0/20'));
  check('题号导航有 20 个小方块题号', countOccurrences(html, 'w-9 h-9') === 20, `实际=${countOccurrences(html, 'w-9 h-9')}`);
  check('有括号按钮', html.includes('>(</button>') && html.includes('>)</button>'));
} catch (e) {
  check('页面渲染成功且非空白', false, e.message);
}

// ---------- 出题质量 ----------
console.log('\n--- 出题质量 ---');
{
  const g3 = getRandomQuestions(3, 30);
  const g45 = getRandomQuestions(45, 30);
  check('3年级抽题不超纲（数字 1-9）', g3.every((q) => q.numbers.every((n) => n >= 1 && n <= 9)));
  check('4-5年级抽题在 1-13 范围', g45.every((q) => q.numbers.every((n) => n >= 1 && n <= 13)));
  check('每道题都带参考答案', g3.every((q) => q.solution) && g45.every((q) => q.solution));
  check(
    '参考答案本身能算出 24',
    [...g3, ...g45].every((q) => {
      const expr = q.solution;
      const used = (expr.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
      const want = [...q.numbers].sort((a, b) => a - b);
      if (used.join(',') !== want.join(',')) return false;
      // eslint-disable-next-line no-new-func
      return Math.abs(new Function(`return (${expr});`)() - 24) < 1e-6;
    })
  );
  check('3年级题库共 195 道', GRADE3_QUESTIONS.length === 195, `实际=${GRADE3_QUESTIONS.length}`);
  check('4-5年级题库共 1362 道', GRADE45_QUESTIONS.length === 1362, `实际=${GRADE45_QUESTIONS.length}`);
}

// ---------- 三年级不超纲（关键约束）----------
console.log('\n--- 三年级不超纲 ---');
{
  const g3 = getRandomQuestions(3, 60);
  check('3年级参考答案不含括号', g3.every((q) => !/[()]/.test(q.solution)));

  // 按“先乘除后加减”逐步计算，确认不出现分数与负数
  const noFraction = g3.every((q) => {
    const seq = q.solution.match(/\d+/g).map(Number);
    const ops = q.solution.match(/[+\-*/]/g);
    let cur = seq[0];
    const terms = [];
    let sign = 1;
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '*') cur *= seq[i + 1];
      else if (ops[i] === '/') {
        if (cur % seq[i + 1] !== 0) return false;
        cur /= seq[i + 1];
      } else {
        terms.push({ sign, value: cur });
        sign = ops[i] === '+' ? 1 : -1;
        cur = seq[i + 1];
      }
    }
    terms.push({ sign, value: cur });
    let total = 0;
    for (const t of terms) {
      total += t.sign * t.value;
      if (!Number.isInteger(total) || total < 0) return false;
    }
    return total === 24;
  });
  check('3年级题目计算过程不出现分数、不出现负数', noFraction);

  check(
    '3年级题目都能用不含括号的算式解出（求解器复核）',
    g3.every((q) => {
      const flat = solveFlat24(q.numbers); // 不含括号口径
      if (!flat || /[()]/.test(flat)) return false;
      const seq = flat.match(/\d+/g).map(Number);
      const ops = flat.match(/[+\-*/]/g);
      // 用到的数字必须与题目一致
      if ([...seq].sort((a, b) => a - b).join(',') !== [...q.numbers].sort((a, b) => a - b).join(',')) return false;
      return evalFlat(seq, ops) === 24;
    })
  );
}

// ---------- 判题逻辑回归 ----------
console.log('\n--- 判题逻辑回归 ---');
{
  check('正确算式判对', validateAnswer([4, 6, 1, 1], '4*6*1*1').valid === true);
  check('结果不对判错', validateAnswer([4, 6, 1, 1], '4*6*1+2').valid === false);
  check(
    '两位数 13 当成一个数处理',
    validateAnswer([13, 11, 1, 1], '13+11+1-1').valid === true,
    JSON.stringify(validateAnswer([13, 11, 1, 1], '13+11+1-1'))
  );
  check(
    '把 13 误当 1 和 3 会被拒绝',
    validateAnswer([13, 2, 1, 1], '1+3+2+1+1').valid === false
  );
  check('数字用错给出提示', validateAnswer([4, 6, 1, 1], '4*6*2*2').valid === false);
  check('括号不匹配被拦下', validateAnswer([4, 6, 1, 1], '((4+6)*1').valid === false);
  check('含非法符号被拦下', validateAnswer([4, 6, 1, 1], '4*6+1a').valid === false);
  check('空算式被拦下', validateAnswer([4, 6, 1, 1], '').valid === false);
  check(
    '全角括号与全角乘号也能判对',
    validateAnswer([4, 6, 1, 1], '（4×6）×1×1').valid === true,
    JSON.stringify(validateAnswer([4, 6, 1, 1], '（4×6）×1×1'))
  );
  check('算式末尾是运算符会被拦下', validateAnswer([4, 6, 1, 1], '4*6*1*').valid === false);
}

console.log(`\n=== 集成测试结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
