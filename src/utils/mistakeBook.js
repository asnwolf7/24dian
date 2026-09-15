/**
 * 错题本数据层（与视图分离）
 * 只负责：生成去重键、读写本地存储、增删改查
 * 视图见 src/pages/Mistakes.vue，记录入口见 Practice.vue / Contest.vue
 */
import { readJSON, writeJSON, removeKey } from './storage.js';

export const MISTAKES_KEY = 'dsh-24dian:mistakes';

// 最多保留的错题条数，超出后淘汰最久没出错的那条
export const MAX_MISTAKES = 200;

/** 统一年级取值：只认 3 / 45 */
function normalizeGrade(grade) {
  return Number(grade) === 45 ? 45 : 3;
}

/**
 * 去重键：年级 + 4 个数字升序
 * 同一道题（数字顺序不同也算同一道）在错题本里只保留一条记录
 */
export function makeMistakeId(grade, numbers) {
  const sorted = [...(numbers || [])].map(Number).sort((a, b) => a - b);
  return `${normalizeGrade(grade)}-${sorted.join('-')}`;
}

/** 字段校验：手工改坏的本地数据一律丢弃 */
export function isValidMistake(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (item.grade !== 3 && item.grade !== 45) return false;
  if (!Array.isArray(item.numbers) || item.numbers.length !== 4) return false;
  if (!item.numbers.every((n) => typeof n === 'number' && isFinite(n))) return false;
  if (typeof item.solution !== 'string') return false;
  if (typeof item.expression !== 'string') return false;
  if (typeof item.wrongCount !== 'number' || item.wrongCount < 1) return false;
  if (typeof item.firstTime !== 'number' || typeof item.lastTime !== 'number') return false;
  return true;
}

/** 读取错题列表：脏数据丢弃，按最后出错时间倒序（最新在前） */
export function loadMistakes(storage) {
  const raw = readJSON(MISTAKES_KEY, [], storage);
  const items = Array.isArray(raw) ? raw : [];
  return items.filter(isValidMistake).sort((a, b) => b.lastTime - a.lastTime);
}

/** 落盘：排序 + 封顶，返回真正写入的列表 */
export function saveMistakes(items, storage) {
  const list = [...(items || [])].filter(isValidMistake).sort((a, b) => b.lastTime - a.lastTime);
  const capped = list.slice(0, MAX_MISTAKES);
  writeJSON(MISTAKES_KEY, capped, storage);
  return capped;
}

/**
 * 记录一道错题
 * @param {object} payload { grade, numbers, solution, expression, source, kind }
 *   - expression 为空字符串表示"未作答"
 *   - source: 'practice' | 'contest'
 *   - kind: 'wrong' | 'unanswered'
 * @returns {Array} 最新错题列表
 */
export function recordMistake(payload = {}, storage) {
  const numbers = (payload.numbers || []).map(Number);
  const id = makeMistakeId(payload.grade, numbers);
  const now = Date.now();

  const list = loadMistakes(storage);
  const prev = list.find((item) => item.id === id);

  const item = {
    id,
    grade: normalizeGrade(payload.grade),
    numbers,
    solution: String(payload.solution || ''),
    expression: String(payload.expression || ''),
    source: payload.source === 'contest' ? 'contest' : 'practice',
    kind: payload.kind === 'unanswered' ? 'unanswered' : 'wrong',
    // 同一题反复答错只累加次数，不产生重复卡片
    wrongCount: (prev ? prev.wrongCount : 0) + 1,
    firstTime: prev ? prev.firstTime : now,
    lastTime: now,
  };

  return saveMistakes([item, ...list.filter((it) => it.id !== id)], storage);
}

/** 移除一条错题 */
export function removeMistake(id, storage) {
  const list = loadMistakes(storage).filter((item) => item.id !== id);
  return saveMistakes(list, storage);
}

/** 清空错题本 */
export function clearMistakes(storage) {
  removeKey(MISTAKES_KEY, storage);
  return [];
}

/** 错题条数（首页徽标用） */
export function countMistakes(storage) {
  return loadMistakes(storage).length;
}
