<template>
  <div class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-6">
    <!-- 题目数字：点一次即禁用，回退后恢复 -->
    <div class="flex justify-center gap-4 mb-6">
      <button
        v-for="(num, idx) in numbers"
        :key="idx"
        @click="inputNumber(num, idx)"
        :disabled="isNumberDisabled(idx) || locked"
        data-testid="number-btn"
        :class="[
          'w-16 h-16 rounded-2xl text-3xl font-bold transition-all select-none border-2',
          isNumberDisabled(idx) || locked
            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
            : 'bg-white text-sky-600 border-sky-200 hover:bg-sky-50 hover:border-sky-300 hover:scale-105 cursor-pointer shadow-sm',
        ]"
      >
        {{ num }}
      </button>
    </div>

    <!-- 算式显示：独占一行，尽量宽，方便核对 -->
    <div
      data-testid="expression-box"
      class="bg-slate-50 ring-1 ring-slate-200 rounded-2xl px-4 py-3 text-xl font-mono text-slate-700 min-h-[52px] mb-3 flex items-center overflow-x-auto whitespace-nowrap"
    >
      <span v-if="expression">{{ expression }}</span>
      <span v-else class="text-slate-400 text-base">点击下面的数字和符号组成算式</span>
    </div>

    <!-- 清除 / 回退 单独一行，不占用算式框的宽度 -->
    <div class="flex justify-end gap-2 mb-4">
      <button
        @click="clearExpression"
        :disabled="locked"
        data-testid="clear-btn"
        class="px-5 py-2 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        title="全部清除"
      >
        ✋ 清除
      </button>
      <button
        @click="backspace"
        :disabled="locked || !expression"
        data-testid="backspace-btn"
        class="px-5 py-2 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        title="回退一步"
      >
        ⌫ 回退
      </button>
    </div>

    <!-- 参考答案（点击“查看正确答案”后显示） -->
    <div
      v-if="revealed && solution"
      class="mb-4 p-3 rounded-2xl text-center bg-violet-50 text-violet-700 ring-1 ring-violet-100"
    >
      参考答案：{{ displaySolution }} = 24
    </div>

    <!-- 运算符面板：乘除用 × ÷；括号对所有年级开放（题目本身都能不用括号解出） -->
    <div class="grid grid-cols-6 gap-2 mb-6">
      <button
        v-for="op in operators"
        :key="op"
        @click="inputOperator(op)"
        :disabled="locked"
        data-testid="op-btn"
        class="py-3 rounded-2xl text-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {{ op }}
      </button>
    </div>

    <!-- 判题反馈 -->
    <div
      v-if="feedback"
      data-testid="feedback-box"
      class="mb-4 p-3 rounded-2xl text-center leading-relaxed ring-1"
      :class="
        feedback.valid
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
          : 'bg-rose-50 text-rose-600 ring-rose-100'
      "
    >
      {{ feedback.message }}
    </div>

    <!-- 操作按钮：查看答案 / 提交 / 下一题 都放在这一行，避免挤占算式框 -->
    <div class="flex flex-wrap gap-3">
      <button
        v-if="showPrev"
        @click="$emit('prev')"
        data-testid="prev-btn"
        class="flex-1 py-3 px-4 rounded-2xl text-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap transition-all"
      >
        ← 上一题
      </button>
      <button
        v-if="showSolutionButton"
        @click="revealed = !revealed"
        data-testid="solution-btn"
        class="flex-1 py-3 px-4 rounded-2xl text-lg font-medium bg-white text-violet-600 ring-1 ring-violet-200 hover:bg-violet-50 whitespace-nowrap transition-all"
      >
        {{ revealed ? '收起答案' : '查看正确答案' }}
      </button>
      <!-- 题题练：答对后隐藏提交、显示下一题（答错不给下一题）；竞赛：不显示提交 -->
      <button
        v-if="showSubmit && !locked"
        @click="submitAnswer"
        :disabled="!expression"
        data-testid="submit-btn"
        class="flex-1 py-3 px-4 rounded-2xl text-lg font-medium bg-sky-500 text-white hover:bg-sky-600 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        提交
      </button>
      <button
        v-if="showNext"
        @click="$emit('next')"
        data-testid="next-btn"
        class="flex-1 py-3 px-4 rounded-2xl text-lg font-medium bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-sm whitespace-nowrap transition-all"
      >
        下一题 →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { validateAnswer, toDisplayExpression } from '../utils/game.js';
import {
  tokensToExpression,
  usedIndexes,
  appendNumber,
  appendOperator,
  popToken,
  normalizeTokens,
  parseExpression,
} from '../utils/tokens.js';

const props = defineProps({
  // 题目给出的 4 个数字
  numbers: {
    type: Array,
    required: true,
  },
  // 已判分：锁定输入（答完的题不再改动）
  locked: {
    type: Boolean,
    default: false,
  },
  // 切题时回填的算式（无 token 信息时的兜底）
  initialExpression: {
    type: String,
    default: '',
  },
  // 切题时回填的 token 栈（优先使用，能精确还原每个数字按钮的占用状态）
  initialTokens: {
    type: Array,
    default: null,
  },
  // 切题时回填的判题结果 { valid, message }
  initialFeedback: {
    type: Object,
    default: null,
  },
  // 参考答案（配合 showSolutionButton 使用）
  solution: {
    type: String,
    default: '',
  },
  // 是否显示“查看正确答案”（题题练用）
  showSolutionButton: {
    type: Boolean,
    default: false,
  },
  showSubmit: { type: Boolean, default: true },
  showPrev: { type: Boolean, default: false },
  showNext: { type: Boolean, default: false },
});

const emit = defineEmits(['submit', 'prev', 'next', 'change']);

// 乘除用数学符号 × ÷ 展示（内部判题会自动换算成 * /）
// 括号对所有年级开放；3年级题目本身都保证能不用括号解出
const operators = ['+', '-', '×', '÷', '(', ')'];

// 输入采用 token 栈（详见 utils/tokens.js）
const tokens = ref([]);
const feedback = ref(null);
const revealed = ref(false);

const expression = computed(() => tokensToExpression(tokens.value));

// 参考答案展示成 × ÷ 的写法
const displaySolution = computed(() => toDisplayExpression(props.solution));

// 已被占用的数字按钮下标
const occupied = computed(() => usedIndexes(tokens.value));

function isNumberDisabled(idx) {
  return occupied.value.has(idx);
}

// 回填：优先用保存的 token（无损），否则从算式字符串解析
function restore() {
  const fromTokens = normalizeTokens(props.initialTokens, props.numbers);
  tokens.value = fromTokens || parseExpression(props.initialExpression, props.numbers);
  feedback.value = props.initialFeedback || null;
  revealed.value = false; // 换题时收起参考答案
}

// 只在“换题”时回填：同一题内部输入变化的回传不覆盖本地编辑
// （否则 1 后接 3 拼成的 "13" 会被误当两位数而清空）
let restoredFor = null;

watch(
  () => props.numbers,
  (nums) => {
    if (restoredFor === nums) return;
    restoredFor = nums;
    restore();
  },
  { immediate: true }
);

// 输入变化实时上报，父组件据此标记“已输入未提交”（题号导航橙色）
// 上报 token 栈而非纯字符串，避免 1+3 与 13 的歧义
watch(expression, () => {
  emit('change', {
    tokens: tokens.value.map((t) => ({ ...t })),
    expression: expression.value,
  });
});

function inputNumber(num, idx) {
  if (props.locked || isNumberDisabled(idx)) return;
  tokens.value = appendNumber(tokens.value, num, idx);
  feedback.value = null;
}

function inputOperator(op) {
  if (props.locked) return;
  tokens.value = appendOperator(tokens.value, op);
  feedback.value = null;
}

function clearExpression() {
  if (props.locked) return;
  tokens.value = [];
  feedback.value = null;
}

function backspace() {
  if (props.locked || tokens.value.length === 0) return;
  tokens.value = popToken(tokens.value);
  feedback.value = null;
}

function submitAnswer() {
  if (props.locked || !expression.value) return;
  const result = validateAnswer(props.numbers, expression.value);
  feedback.value = result;
  emit('submit', {
    expression: expression.value,
    tokens: tokens.value.map((t) => ({ ...t })),
    correct: result.valid,
    message: result.message,
  });
}
</script>
