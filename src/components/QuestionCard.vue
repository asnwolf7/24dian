<template>
  <div class="bg-white rounded-2xl shadow-xl p-6">
    <!-- 题目数字：点一次即禁用，回退后恢复 -->
    <div class="flex justify-center gap-4 mb-6">
      <button
        v-for="(num, idx) in numbers"
        :key="idx"
        @click="inputNumber(num, idx)"
        :disabled="isNumberDisabled(idx) || locked"
        :class="[
          'w-16 h-16 rounded-xl text-3xl font-bold transition-all select-none',
          isNumberDisabled(idx) || locked
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 cursor-pointer shadow-lg',
        ]"
      >
        {{ num }}
      </button>
    </div>

    <!-- 算式显示：独占一行，尽量宽，方便核对 -->
    <div
      class="bg-gray-100 rounded-xl px-4 py-3 text-xl font-mono min-h-[52px] mb-3 flex items-center overflow-x-auto whitespace-nowrap"
    >
      <span v-if="expression">{{ expression }}</span>
      <span v-else class="text-gray-400 text-base">点击下面的数字和符号组成算式</span>
    </div>

    <!-- 清除 / 回退 单独一行，不占用算式框的宽度 -->
    <div class="flex justify-end gap-2 mb-4">
      <button
        @click="clearExpression"
        :disabled="locked"
        class="px-5 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        title="全部清除"
      >
        ✋ 清除
      </button>
      <button
        @click="backspace"
        :disabled="locked || !expression"
        class="px-5 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        title="回退一步"
      >
        ⌫ 回退
      </button>
    </div>

    <!-- 参考答案（点击“查看正确答案”后显示） -->
    <div
      v-if="revealed && solution"
      class="mb-4 p-3 rounded-xl text-center bg-sky-50 text-sky-700"
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
        class="py-3 rounded-xl text-xl font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {{ op }}
      </button>
    </div>

    <!-- 判题反馈 -->
    <div
      v-if="feedback"
      class="mb-4 p-3 rounded-xl text-center leading-relaxed"
      :class="feedback.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
    >
      {{ feedback.message }}
    </div>

    <!-- 操作按钮：查看答案 / 提交 / 下一题 都放在这一行，避免挤占算式框 -->
    <div class="flex flex-wrap gap-3">
      <button
        v-if="showPrev"
        @click="$emit('prev')"
        class="flex-1 py-3 px-4 rounded-xl text-lg font-medium bg-gray-500 text-white hover:bg-gray-600 whitespace-nowrap"
      >
        ← 上一题
      </button>
      <button
        v-if="showSolutionButton"
        @click="revealed = !revealed"
        class="flex-1 py-3 px-4 rounded-xl text-lg font-medium bg-sky-500 text-white hover:bg-sky-600 whitespace-nowrap"
      >
        {{ revealed ? '收起答案' : '查看正确答案' }}
      </button>
      <!-- 题题练：答对后隐藏提交、显示下一题（答错不给下一题）；竞赛：不显示提交 -->
      <button
        v-if="showSubmit && !locked"
        @click="submitAnswer"
        :disabled="!expression"
        class="flex-1 py-3 px-4 rounded-xl text-lg font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        提交
      </button>
      <button
        v-if="showNext"
        @click="$emit('next')"
        class="flex-1 py-3 px-4 rounded-xl text-lg font-medium bg-blue-500 text-white hover:bg-blue-600 whitespace-nowrap"
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
