/**
 * 算式输入模型
 * 用 token 栈记录学生的点击顺序：{ type:'num', value:'13', idx:0 } 或 { type:'op', value:'+' }
 * 好处：能精确知道哪个数字按钮已被占用（含重复数字），也不会把先点 1 再点 3 拼成的 "13" 误当两位数
 */

// 运算符与括号：乘除按钮显示为数学符号 × ÷，内部同时兼容 * /
const OP_RE = /^[+\-*/()×÷]$/;
const TOKEN_RE = /\d+|[+\-*/()×÷]/g;

/** 把 token 数组拼成算式字符串 */
export function tokensToExpression(tokens) {
  return (tokens || []).map((t) => t.value).join('');
}

/** 已被占用的数字下标集合 */
export function usedIndexes(tokens) {
  return new Set(
    (tokens || []).filter((t) => t.type === 'num').map((t) => Number(t.idx))
  );
}

/** 追加一个数字 */
export function appendNumber(tokens, num, idx) {
  return [...(tokens || []), { type: 'num', value: String(num), idx }];
}

/** 追加一个运算符或括号 */
export function appendOperator(tokens, op) {
  if (!OP_RE.test(String(op))) return [...(tokens || [])];
  return [...(tokens || []), { type: 'op', value: String(op) }];
}

/** 回退一步 */
export function popToken(tokens) {
  return (tokens || []).slice(0, -1);
}

/** 校验单个 token 是否与题目匹配，不匹配返回 null */
export function normalizeToken(token, numbers) {
  if (!token || typeof token !== 'object') return null;

  if (token.type === 'num') {
    const idx = Number(token.idx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= numbers.length) return null;
    if (String(numbers[idx]) !== String(token.value)) return null;
    return { type: 'num', value: String(token.value), idx };
  }

  if (token.type === 'op' && OP_RE.test(String(token.value))) {
    return { type: 'op', value: String(token.value) };
  }

  return null;
}

/**
 * 回填 token 栈（优先路径，无损）
 * @param {Array} tokens 保存的 token
 * @param {number[]} numbers 当前题目数字
 */
export function normalizeTokens(tokens, numbers) {
  if (!Array.isArray(tokens)) return null;
  return tokens.map((t) => normalizeToken(t, numbers)).filter(Boolean);
}

/**
 * 从算式字符串解析 token（兜底路径）
 * 注意：先点 1 再点 3 与直接点 13 都会得到 "13"，此路径会优先匹配题目里的多位数
 */
export function parseExpression(expression, numbers) {
  const parts = String(expression || '').match(TOKEN_RE) || [];
  const used = new Set();
  const out = [];

  // 运算符需要放在合法位置：二元运算符前面必须是数字或右括号
  const canTakeBinaryOp = () => {
    const last = out[out.length - 1];
    if (!last) return false;
    return last.type === 'num' || (last.type === 'op' && last.value === ')');
  };

  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const value = Number(part);
      const idx = numbers.findIndex((n, i) => n === value && !used.has(i));
      if (idx === -1) continue; // 对不上题目就丢弃，避免脏数据
      used.add(idx);
      out.push({ type: 'num', value: part, idx });
      continue;
    }

    if (!OP_RE.test(part)) continue;

    if (part === '(') {
      out.push({ type: 'op', value: part });
    } else if (part === ')') {
      const open = out.filter((t) => t.type === 'op' && t.value === '(').length;
      const close = out.filter((t) => t.type === 'op' && t.value === ')').length;
      if (open > close && canTakeBinaryOp()) out.push({ type: 'op', value: part });
    } else if (canTakeBinaryOp()) {
      out.push({ type: 'op', value: part });
    }
  }

  return out;
}
