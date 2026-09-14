/**
 * 24点游戏核心逻辑：出题与判题
 * 题库为构建期预生成（见 src/utils/questionBank.js），运行时不阻塞
 * 求解算法见 src/utils/solver.js
 */
import { GRADE3_QUESTIONS, GRADE45_QUESTIONS } from './questionBank.js';
import { solve24, solveFlat24, formatSolution, hasSolution } from './solver.js';

const EPS = 1e-6;

// ==================== 出题 ====================

/** 按年级取题库：3 或 45 */
function getQuestionPool(grade) {
  const g = Number(grade);
  return g === 45 || g === 4 || g === 5 ? GRADE45_QUESTIONS : GRADE3_QUESTIONS;
}

/** Fisher-Yates 洗牌，保证随机均匀 */
function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 随机抽题
 * @param {number} grade 3 或 45
 * @param {number} count 题目数量
 * @returns {{id:number, numbers:number[], solution:string}[]}
 */
function getRandomQuestions(grade, count) {
  const pool = getQuestionPool(grade);
  const size = Math.min(count, pool.length);
  return shuffle(pool)
    .slice(0, size)
    .map((item, idx) => ({
      id: idx + 1,
      numbers: [...item.n],
      solution: item.s,
    }));
}

// ==================== 判题 ====================

/** 把表达式拆成 token：数字（可多位）与运算符、括号 */
function tokenize(expression) {
  return expression.match(/\d+|[+\-*/()×÷]/g) || [];
}

/** 统一各种符号写法，转成可计算的形式 */
function toComputable(expression) {
  return String(expression || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s/g, '');
}

/** 转成适合展示给小学生的写法（× ÷ 而不是 * /） */
function toDisplayExpression(expression) {
  return String(expression || '').replace(/\*/g, '×').replace(/\//g, '÷');
}

/**
 * 题题练的判题提示：失败时统一以“计算失败”开头
 * @param {{valid:boolean, message:string}} result
 */
function formatResultMessage(result) {
  if (result.valid) return result.message;
  return `计算失败：${result.message}`;
}

/** 去掉空白后是否为空 */
function isBlank(expression) {
  return String(expression || '').replace(/\s/g, '') === '';
}

/**
 * 校验作答
 * @param {number[]} numbers 题目数字
 * @param {string} expression 学生输入的算式
 * @returns {{ valid: boolean, message: string }}
 */
function validateAnswer(numbers, expression) {
  const expr = toComputable(expression);

  if (!expr) {
    return { valid: false, message: '请输入算式' };
  }

  if (!/^[\d+\-*/()]+$/.test(expr)) {
    return { valid: false, message: '算式里有不认识的符号，请检查' };
  }

  // 括号必须匹配
  let depth = 0;
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return { valid: false, message: '括号不匹配，请检查' };
  }
  if (depth !== 0) {
    return { valid: false, message: '括号不匹配，请检查' };
  }

  // 运算符位置：不能以运算符开头、结尾，也不能两个运算符相连
  // 注意 )* 是合法写法，不能误判
  if (/^[+*/]/.test(expr) || /[+\-*/]$/.test(expr) || /[+\-*/]{2}/.test(expr)) {
    return { valid: false, message: '算式格式有误，请检查运算符位置' };
  }

  // 数字必须与题目完全一致（支持 10~13 这类两位数）
  const usedNumbers = tokenize(expr)
    .filter((t) => /^\d+$/.test(t))
    .map(Number)
    .sort((a, b) => a - b);
  const targetNumbers = [...numbers].sort((a, b) => a - b);

  if (
    usedNumbers.length !== targetNumbers.length ||
    usedNumbers.join(',') !== targetNumbers.join(',')
  ) {
    return {
      valid: false,
      message: `要用题目给的 ${targetNumbers.join('、')} 各用一次（当前用了 ${
        usedNumbers.join('、') || '无'
      }）`,
    };
  }

  // 计算结果
  let value;
  try {
    value = new Function(`"use strict";return (${expr});`)();
  } catch (e) {
    return { valid: false, message: '算式写得不完整，请检查' };
  }

  if (typeof value !== 'number' || !isFinite(value)) {
    return { valid: false, message: '算式算不出结果，请检查' };
  }

  if (Math.abs(value - 24) < EPS) {
    return { valid: true, message: '太棒了，正确！' };
  }

  const shown = Math.abs(value - Math.round(value)) < EPS ? Math.round(value) : value.toFixed(2);
  return { valid: false, message: `结果是 ${shown}，不是 24，再想想～` };
}

export {
  GRADE3_QUESTIONS,
  GRADE45_QUESTIONS,
  getQuestionPool,
  getRandomQuestions,
  validateAnswer,
  toDisplayExpression,
  formatResultMessage,
  isBlank,
  solve24,
  solveFlat24,
  formatSolution,
  hasSolution,
};
