/**
 * 本地存储的安全封装
 * 所有 localStorage 访问都从这里走：
 * - SSR（没有 window）时降级为内存存储
 * - 隐私模式 / 配额满导致读写抛错时静默吞掉，绝不影响答题
 */

let memoryFallback = null;
let resolved = null; // 探测结果缓存，避免每次读写都探测一遍

/** 内存兜底存储：与 localStorage 接口保持一致 */
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

/**
 * 取可用的存储对象：优先 localStorage，不可用时用内存兜底（同一进程内保持一份）
 * 要求同时存在 window，保证在 Node（SSR / 测试）里不会误用类似接口的全局对象
 */
export function getStorage() {
  if (resolved) return resolved;

  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage) {
      // 探测一次；隐私模式或禁用存储时会在这里抛错
      const probe = '__24dian__probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      resolved = localStorage;
      return resolved;
    }
  } catch (e) {
    // 忽略，降级到内存
  }

  if (!memoryFallback) memoryFallback = createMemoryStorage();
  resolved = memoryFallback;
  return resolved;
}

/** 读取 JSON：解析失败或读到脏数据时返回 fallback */
export function readJSON(key, fallback = null, storage = getStorage()) {
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

/** 写入 JSON：失败（如配额满）返回 false，不向上抛异常 */
export function writeJSON(key, value, storage = getStorage()) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/** 删除某个键：失败也静默 */
export function removeKey(key, storage = getStorage()) {
  try {
    storage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

// ==================== 年级记忆 ====================

// 记住上次选的年级，返回首页时高亮保持
export const GRADE_KEY = 'dsh-24dian:grade';

/** 读取上次选择的年级：只接受 3 / 45，其它一律回落到默认值 */
export function loadLastGrade(defaultGrade = 3, storage) {
  const raw = readJSON(GRADE_KEY, null, storage);
  const grade = Number(raw);
  return grade === 45 || grade === 3 ? grade : defaultGrade;
}

/** 保存选择的年级 */
export function saveLastGrade(grade, storage) {
  const value = Number(grade) === 45 ? 45 : 3;
  return writeJSON(GRADE_KEY, value, storage);
}
