/**
 * Q版头像 - 单元测试
 * 运行: node tests/avatar.test.cjs
 * 只测数据与本地读写（SVG 渲染测试见 scripts/sit-test.mjs）
 */

const {
  AVATARS,
  AVATAR_KEY,
  DEFAULT_AVATAR_ID,
  getAvatar,
  loadAvatar,
  saveAvatar,
} = require('../src/utils/avatars.js');

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
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy, got falsy');
}

/** 内存假存储，接口与 localStorage 一致 */
function createFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

/** 写入必定失败的假存储，模拟配额满 / 隐私模式 */
function createBrokenStorage() {
  return {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => {
      throw new Error('SecurityError');
    },
  };
}

console.log('=== 24点游戏 Q版头像 单元测试 ===\n');

// ---------- 头像数据 ----------
console.log('--- 头像数据 ---');

test('一共 12 款 Q版头像', () => {
  assertEqual(AVATARS.length, 12, '头像数量');
});

test('头像 id 唯一', () => {
  const ids = AVATARS.map((item) => item.id);
  assertEqual(new Set(ids).size, ids.length, 'id 应互不相同');
});

test('每款头像字段齐全（名称、耳朵、三档配色）', () => {
  for (const item of AVATARS) {
    assertTrue(typeof item.name === 'string' && item.name.length > 0, `${item.id} 缺少名称`);
    assertTrue(
      ['pointy', 'round', 'long', 'floppy', 'small', 'none'].includes(item.ear),
      `${item.id} 耳朵类型不合法: ${item.ear}`
    );
    for (const key of ['fur', 'light', 'dark']) {
      assertTrue(/^#[0-9A-Fa-f]{6}$/.test(item[key]), `${item.id}.${key} 不是合法色值: ${item[key]}`);
    }
  }
});

test('默认头像存在且是第一个', () => {
  assertEqual(DEFAULT_AVATAR_ID, 'fox', '默认头像应为小狐狸');
  assertTrue(AVATARS.some((item) => item.id === DEFAULT_AVATAR_ID), '默认头像应在列表里');
});

test('getAvatar 按 id 取配置，未知 id 回落到小狐狸', () => {
  assertEqual(getAvatar('panda').name, '小熊猫', '应取到熊猫');
  assertEqual(getAvatar('不存在').id, DEFAULT_AVATAR_ID, '未知 id 应回落');
  assertEqual(getAvatar(undefined).id, DEFAULT_AVATAR_ID, '空值应回落');
});

test('每款头像的装饰都不是未知值', () => {
  const known = ['eyepatch', 'stripe', 'frog', 'beak', 'snout', 'mane', 'horn', undefined];
  for (const item of AVATARS) {
    assertTrue(known.includes(item.mark), `${item.id} 装饰不合法: ${item.mark}`);
  }
});

// ---------- 本地读写 ----------
console.log('\n--- 本地读写 ---');

test('空存储读到默认头像', () => {
  assertEqual(loadAvatar(createFakeStorage()), DEFAULT_AVATAR_ID, '空存储应返回默认');
});

test('保存后能读回（并真正落盘）', () => {
  const storage = createFakeStorage();
  assertEqual(saveAvatar('tiger', storage), 'tiger', 'saveAvatar 应返回保存的 id');
  assertEqual(loadAvatar(storage), 'tiger', '应读回小老虎');
  assertEqual(storage.getItem(AVATAR_KEY), '"tiger"', '应存在本地存储里');
});

test('存储里的非法头像 id 回落到默认值', () => {
  assertEqual(loadAvatar(createFakeStorage({ [AVATAR_KEY]: '"nobody"' })), DEFAULT_AVATAR_ID, '非法 id 应回落');
  assertEqual(loadAvatar(createFakeStorage({ [AVATAR_KEY]: '123' })), DEFAULT_AVATAR_ID, '非字符串应回落');
  assertEqual(loadAvatar(createFakeStorage({ [AVATAR_KEY]: '{{{' })), DEFAULT_AVATAR_ID, '坏 JSON 应回落');
});

test('保存非法 id 时存默认头像', () => {
  const storage = createFakeStorage();
  assertEqual(saveAvatar('不存在', storage), DEFAULT_AVATAR_ID, '应存默认 id');
  assertEqual(loadAvatar(storage), DEFAULT_AVATAR_ID, '读回默认');
});

test('12 款头像都能存取', () => {
  const storage = createFakeStorage();
  for (const item of AVATARS) {
    saveAvatar(item.id, storage);
    assertEqual(loadAvatar(storage), item.id, `${item.id} 存取失败`);
  }
});

test('存储写入失败时不抛异常', () => {
  try {
    saveAvatar('cat', createBrokenStorage());
  } catch (e) {
    throw new Error(`不应抛出异常，实际抛出: ${e.message}`);
  }
});

console.log(`\n=== 单元测试结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
