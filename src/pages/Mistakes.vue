<template>
  <div class="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 p-4">
    <div class="max-w-2xl mx-auto">
      <!-- 顶部：返回 / 标题 / 清空 -->
      <div class="flex items-center justify-between mb-4">
        <button
          @click="goHome"
          class="px-4 py-2 bg-white text-slate-600 rounded-2xl ring-1 ring-slate-900/5 shadow-sm hover:bg-slate-50 transition-all"
        >
          ← 返回
        </button>
        <h2 class="text-xl font-bold text-slate-800">📕 错题本</h2>
        <button
          v-if="mistakes.length"
          @click="clearAll"
          class="px-4 py-2 bg-white text-slate-600 rounded-2xl ring-1 ring-slate-900/5 shadow-sm hover:bg-slate-50 transition-all"
        >
          清空全部
        </button>
        <span v-else class="w-20"></span>
      </div>

      <!-- 空态：SSR 与首次进入都会走这里 -->
      <div
        v-if="!mistakes.length"
        class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-8 text-center"
      >
        <div class="text-5xl mb-3">🎉</div>
        <p class="text-slate-500 mb-6">还没有错题，去练一练吧～</p>
        <button
          @click="goHome"
          class="w-full py-3 px-6 rounded-2xl text-lg font-medium bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all"
        >
          返回首页
        </button>
      </div>

      <template v-else>
        <!-- 年级筛选 -->
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="tab in tabs"
            :key="String(tab.value)"
            @click="filterBy(tab.value)"
            :class="[
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              activeGrade === tab.value
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white text-slate-500 ring-1 ring-slate-900/5 hover:bg-slate-50',
            ]"
          >
            {{ tab.label }}（{{ countOf(tab.value) }}）
          </button>
        </div>

        <!-- 错题列表：只回顾，不就地重做 -->
        <div class="flex flex-col gap-3">
          <div
            v-for="item in visibleMistakes"
            :key="item.id"
            data-testid="mistake-card"
            class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-4"
          >
            <div class="flex items-center justify-between mb-3 text-xs">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                  {{ item.source === 'contest' ? '竞赛' : '题题练' }}
                </span>
                <span
                  v-if="item.kind === 'unanswered'"
                  class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100"
                >
                  未作答
                </span>
                <span class="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                  {{ item.grade === 45 ? '4-5年级' : '3年级' }}
                </span>
              </div>
              <span class="text-slate-400">{{ formatTime(item.lastTime) }}</span>
            </div>

            <!-- 题目数字（静态展示，回顾用） -->
            <div class="flex justify-center gap-3 mb-3">
              <div
                v-for="(num, idx) in item.numbers"
                :key="idx"
                data-testid="mistake-number"
                class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-slate-100 text-xl font-bold flex items-center justify-center"
              >
                {{ num }}
              </div>
            </div>

            <div class="text-sm text-center mb-1 text-rose-500">
              你的答案：{{ item.expression ? display(item.expression) : '未作答' }}
            </div>
            <div class="text-sm text-center mb-3 text-emerald-600">
              正确答案：{{ display(item.solution) }} = 24
            </div>

            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-400">错 {{ item.wrongCount }} 次</span>
              <button
                @click="remove(item.id)"
                data-testid="mistake-remove"
                class="px-4 py-1.5 rounded-2xl text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              >
                移除
              </button>
            </div>
          </div>
        </div>

        <!-- 该年级暂时没有错题 -->
        <div
          v-if="!visibleMistakes.length"
          class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-6 text-center text-sm text-slate-400"
        >
          这个年级还没有错题
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { toDisplayExpression } from '../utils/game.js';
import { loadMistakes, removeMistake, clearMistakes } from '../utils/mistakeBook.js';

const router = useRouter();

// setup 阶段同步读取，避免首帧空白（SSR 下走内存兜底，得到空列表）
const mistakes = ref(loadMistakes());

// null 表示"全部"
const activeGrade = ref(null);

const tabs = [
  { value: null, label: '全部' },
  { value: 3, label: '3年级' },
  { value: 45, label: '4-5年级' },
];

function countOf(grade) {
  if (grade === null) return mistakes.value.length;
  return mistakes.value.filter((item) => item.grade === grade).length;
}

const visibleMistakes = computed(() => {
  if (activeGrade.value === null) return mistakes.value;
  return mistakes.value.filter((item) => item.grade === activeGrade.value);
});

// 乘除显示成 × ÷，与答题页保持一致
function display(expression) {
  return toDisplayExpression(expression);
}

/** 时间格式化：不依赖 toLocaleString，保证各环境一致 */
function formatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function refresh() {
  mistakes.value = loadMistakes();
}

/** 切换年级筛选：null 表示全部 */
function filterBy(grade) {
  activeGrade.value = grade;
}

function remove(id) {
  removeMistake(id);
  refresh();
}

function clearAll() {
  if (typeof window !== 'undefined' && !window.confirm('确定要清空错题本吗？清空后无法恢复')) {
    return;
  }
  clearMistakes();
  refresh();
}

function goHome() {
  router.push('/');
}
</script>
