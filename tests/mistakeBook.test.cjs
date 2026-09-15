/**
 * 错题本 - 单元测试
 * 运行: node tests/mistakeBook.test.cjs
 * 只测纯逻辑：存储用内存假对象注入，不依赖浏览器 localStorage
 */

const {
  makeMistakeId,
  isValidMistake,
  loadMistakes,
  saveMistakes,
  recordMistake,
  removeMistake,
  clearMistakes,
  countMistakes,
  MISTAKES_KEY,
  MAX_MISTAKES,
} = require('../src/utils/mistakeBook.js');

const { loadLastGrade, saveLastGrade, GRADE_KEY } = require('../src/utils/storage.js');

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

function assertDeepEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg}: expected ${b}, got ${a}`);
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
    dump: () => Object.fromEntries(map),
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

console.log('=== 24点游戏 错题本 单元测试 ===\n');

// ---------- 去重键 ----------
console.log('--- 去重键 ---');

test('去重键包含年级，且与数字顺序无关', () => {
  assertEqual(makeMistakeId(3, [3, 1, 8, 1]), '3-1-1-3-8', '顺序应被归一化');
  assertEqual(
    makeMistakeId(3, [1, 1, 3, 8]),
    makeMistakeId(3, [8, 3, 1, 1]),
    '同一道题不同顺序应得到同一个键'
  );
});

test('不同年级的同数字题目是不同的题', () => {
  assertTrue(makeMistakeId(3, [1, 1, 3, 8]) !== makeMistakeId(45, [1, 1, 3, 8]), '年级不同应不同');
});

// ---------- 读取 ----------
console.log('\n--- 读取 ---');

test('空存储读出空列表', () => {
  const storage = createFakeStorage();
  assertEqual(loadMistakes(storage).length, 0, '空存储应为空列表');
  assertEqual(countMistakes(storage), 0, '条数应为 0');
});

test('损坏的 JSON 不会抛异常，返回空列表', () => {
  const storage = createFakeStorage({ [MISTAKES_KEY]: '{{{ not json' });
  assertDeepEqual(loadMistakes(storage), [], '脏 JSON 应返回空列表');
});

test('不是数组的 JSON 返回空列表', () => {
  const storage = createFakeStorage({ [MISTAKES_KEY]: '{"a":1}' });
  assertDeepEqual(loadMistakes(storage), [], '对象应返回空列表');
});

test('字段不合法的条目被丢弃', () => {
  const good = {
    id: '3-1-1-3-8',
    grade: 3,
    numbers: [1, 1, 3, 8],
    solution: '1-1+3*8',
    expression: '1+1+3*8',
    source: 'practice',
    kind: 'wrong',
    wrongCount: 1,
    firstTime: 1,
    lastTime: 2,
  };
  const bad = [
    null,
    { ...good, id: undefined },
    { ...good, grade: 7 },
    { ...good, numbers: [1, 1, 3] },
    { ...good, numbers: [1, 1, 3, 'x'] },
    { ...good, solution: 123 },
    { ...good, wrongCount: 0 },
    { ...good, lastTime: 'yesterday' },
  ];
  const storage = createFakeStorage({ [MISTAKES_KEY]: JSON.stringify([good, ...bad]) });
  const list = loadMistakes(storage);
  assertEqual(list.length, 1, '只应保留 1 条合法记录');
  assertEqual(list[0].id, good.id, '保留的应是合法那条');
});

test('isValidMistake 对合法条目返回 true', () => {
  assertTrue(
    isValidMistake({
      id: '3-1-1-3-8',
      grade: 3,
      numbers: [1, 1, 3, 8],
      solution: '1-1+3*8',
      expression: '',
      wrongCount: 2,
      firstTime: 1,
      lastTime: 2,
    }),
    '合法条目应为 true'
  );
});

// ---------- 记录 ----------
console.log('\n--- 记录错题 ---');

test('记录一道答错的题', () => {
  const storage = createFakeStorage();
  const list = recordMistake(
    {
      grade: 3,
      numbers: [8, 1, 3, 1],
      solution: '1-1+3*8',
      expression: '1+1+3*8',
      source: 'practice',
      kind: 'wrong',
    },
    storage
  );

  assertEqual(list.length, 1, '应新增 1 条');
  const item = list[0];
  assertEqual(item.id, '3-1-1-3-8', 'id 应归一化');
  assertEqual(item.grade, 3, '年级应为 3');
  assertDeepEqual(item.numbers, [8, 1, 3, 1], '数字应保留题目顺序');
  assertEqual(item.solution, '1-1+3*8', '应保存参考答案');
  assertEqual(item.expression, '1+1+3*8', '应保存学生答案');
  assertEqual(item.source, 'practice', '来源应为题题练');
  assertEqual(item.kind, 'wrong', '类型应为答错');
  assertEqual(item.wrongCount, 1, '错误次数应为 1');
  assertEqual(item.firstTime, item.lastTime, '首次时间应等于最后时间');
  assertEqual(loadMistakes(storage).length, 1, '应真正落盘');
});

test('同一道题重复答错只保留一条，次数递增，答案更新为最后一次', () => {
  const storage = createFakeStorage();
  const payload = {
    grade: 3,
    numbers: [1, 1, 3, 8],
    solution: '1-1+3*8',
    source: 'practice',
    kind: 'wrong',
  };

  recordMistake({ ...payload, expression: '1+1+3*8' }, storage);
  const first = loadMistakes(storage)[0];
  const list = recordMistake({ ...payload, numbers: [3, 8, 1, 1], expression: '1+1+8*3' }, storage);

  assertEqual(list.length, 1, '重复答错不应新增卡片');
  assertEqual(list[0].wrongCount, 2, '错误次数应累加为 2');
  assertEqual(list[0].expression, '1+1+8*3', '应保留最后一次的答案');
  assertEqual(list[0].firstTime, first.firstTime, '首次出错时间应保持不变');
});

test('未作答的题记为 unanswered，学生答案为空字符串', () => {
  const storage = createFakeStorage();
  const list = recordMistake(
    {
      grade: 45,
      numbers: [13, 11, 1, 1],
      solution: '13+11+1-1',
      expression: '',
      source: 'contest',
      kind: 'unanswered',
    },
    storage
  );

  assertEqual(list.length, 1, '应新增 1 条');
  assertEqual(list[0].kind, 'unanswered', '类型应为未作答');
  assertEqual(list[0].expression, '', '未作答时答案为空字符串');
  assertEqual(list[0].source, 'contest', '来源应为竞赛');
  assertEqual(list[0].grade, 45, '年级应为 45');
});

test('不同年级的同数字题目分开记录', () => {
  const storage = createFakeStorage();
  recordMistake(
    { grade: 3, numbers: [1, 1, 3, 8], solution: '1-1+3*8', source: 'practice' },
    storage
  );
  const list = recordMistake(
    { grade: 45, numbers: [1, 1, 3, 8], solution: '(1+3)*8-1-1', source: 'practice' },
    storage
  );

  assertEqual(list.length, 2, '不同年级应各存一条');
});

test('列表按最后出错时间倒序，最新的在最前', () => {
  const storage = createFakeStorage();
  const base = {
    grade: 3,
    numbers: [1, 2, 3, 4],
    solution: '1*2*3*4',
    source: 'practice',
    kind: 'wrong',
  };
  saveMistakes(
    [
      { ...base, id: '3-1-2-3-4', numbers: [1, 2, 3, 4], expression: 'a', wrongCount: 1, firstTime: 10, lastTime: 10 },
      { ...base, id: '3-1-2-3-5', numbers: [1, 2, 3, 5], expression: 'b', wrongCount: 1, firstTime: 30, lastTime: 30 },
      { ...base, id: '3-1-2-3-6', numbers: [1, 2, 3, 6], expression: 'c', wrongCount: 1, firstTime: 20, lastTime: 20 },
    ],
    storage
  );

  assertDeepEqual(
    loadMistakes(storage).map((i) => i.id),
    ['3-1-2-3-5', '3-1-2-3-6', '3-1-2-3-4'],
    '应按 lastTime 倒序'
  );
});

test(`超过 ${MAX_MISTAKES} 条时封顶，淘汰最久没出错的一条`, () => {
  const storage = createFakeStorage();
  const extra = 5;

  for (let i = 0; i < MAX_MISTAKES + extra; i++) {
    // 用 [i+1, 1, 2, 3] 保证每道题的唯一性（排序后仍唯一）
    recordMistake(
      {
        grade: 3,
        numbers: [i + 1, 1, 2, 3],
        solution: '1*2*3*4',
        expression: '1+2+3+4',
        source: 'practice',
        kind: 'wrong',
      },
      storage
    );
  }

  const list = loadMistakes(storage);
  assertEqual(list.length, MAX_MISTAKES, `应封顶为 ${MAX_MISTAKES}`);
  // 最早写入的 5 道题（数字 1..5 那条）应被淘汰
  assertTrue(
    !list.some((item) => item.id === makeMistakeId(3, [1, 1, 2, 3])),
    '最旧的记录应被淘汰'
  );
  assertTrue(
    list.some((item) => item.id === makeMistakeId(3, [MAX_MISTAKES + extra, 1, 2, 3])),
    '最新的记录应保留'
  );
});

// ---------- 移除 / 清空 ----------
console.log('\n--- 移除与清空 ---');

test('移除单条错题', () => {
  const storage = createFakeStorage();
  recordMistake({ grade: 3, numbers: [1, 1, 3, 8], solution: '1-1+3*8', source: 'practice' }, storage);
  recordMistake({ grade: 3, numbers: [1, 2, 3, 4], solution: '1*2*3*4', source: 'practice' }, storage);
  assertEqual(loadMistakes(storage).length, 2, '应有 2 条');

  const list = removeMistake(makeMistakeId(3, [1, 2, 3, 4]), storage);
  assertEqual(list.length, 1, '移除后应剩 1 条');
  assertEqual(list[0].id, makeMistakeId(3, [1, 1, 3, 8]), '剩下的应是另一条');
  assertEqual(loadMistakes(storage).length, 1, '移除应落盘');
});

test('移除不存在的 id 不报错，也不影响现有数据', () => {
  const storage = createFakeStorage();
  recordMistake({ grade: 3, numbers: [1, 1, 3, 8], solution: '1-1+3*8', source: 'practice' }, storage);
  const list = removeMistake('不存在的-id', storage);
  assertEqual(list.length, 1, '数据应保持不变');
});

test('清空错题本', () => {
  const storage = createFakeStorage();
  recordMistake({ grade: 3, numbers: [1, 1, 3, 8], solution: '1-1+3*8', source: 'practice' }, storage);

  const list = clearMistakes(storage);
  assertDeepEqual(list, [], '清空后应返回空列表');
  assertEqual(countMistakes(storage), 0, '清空应落盘');
  assertEqual(storage.getItem(MISTAKES_KEY), null, '存储键应被删除');
});

// ---------- 存储异常降级 ----------
console.log('\n--- 存储异常降级 ---');

test('存储写入失败时不抛异常（配额满 / 隐私模式）', () => {
  const storage = createBrokenStorage();
  let list;
  try {
    list = recordMistake(
      { grade: 3, numbers: [1, 1, 3, 8], solution: '1-1+3*8', source: 'practice' },
      storage
    );
  } catch (e) {
    throw new Error(`不应抛出异常，实际抛出: ${e.message}`);
  }
  assertTrue(Array.isArray(list), '写入失败也应返回数组');
});

test('清空时删除失败不抛异常', () => {
  const storage = createBrokenStorage();
  try {
    clearMistakes(storage);
  } catch (e) {
    throw new Error(`不应抛出异常，实际抛出: ${e.message}`);
  }
});

// ---------- 年级记忆 ----------
console.log('\n--- 年级记忆 ---');

test('默认年级为 3年级', () => {
  assertEqual(loadLastGrade(3, createFakeStorage()), 3, '空存储应返回默认值');
});

test('保存并读回选择的年级', () => {
  const storage = createFakeStorage();
  saveLastGrade(45, storage);
  assertEqual(loadLastGrade(3, storage), 45, '应读回 45');
  saveLastGrade(3, storage);
  assertEqual(loadLastGrade(45, storage), 3, '应读回 3');
  assertEqual(storage.getItem(GRADE_KEY), '3', '应存在本地存储里');
});

test('存储里的非法年级回落到默认值', () => {
  const storage = createFakeStorage({ [GRADE_KEY]: '"四年级"' });
  assertEqual(loadLastGrade(3, storage), 3, '非法值应回落默认 3');
});

console.log(`\n=== 单元测试结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
