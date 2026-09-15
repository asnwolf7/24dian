<template>
  <div class="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-6">
        <!-- 标题 + 当前头像（点一下换头像） -->
        <div class="flex items-start justify-between mb-4">
          <span class="w-14"></span>
          <div class="text-center flex-1">
            <h1 class="text-3xl font-bold text-slate-800 mb-1">🎴 24点游戏</h1>
            <p class="text-slate-400 text-sm">算24点，挑战你的数学思维！</p>
          </div>
          <button
            @click="showPicker = true"
            data-testid="avatar-trigger"
            class="flex flex-col items-center gap-0.5"
            title="换头像"
          >
            <PlayerAvatar :avatar-id="avatarId" :size="48" />
            <span class="text-[10px] text-slate-400">换头像</span>
          </button>
        </div>

        <!-- 第一步：选择年级（选中的年级决定下面两个模式入口的年级） -->
        <h2 class="text-sm font-semibold text-slate-400 mb-2">第一步 · 选择年级</h2>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <button
            v-for="item in grades"
            :key="item.value"
            @click="selectGrade(item.value)"
            data-testid="grade-option"
            :class="[
              'rounded-2xl border-2 p-3 text-left transition-all',
              selectedGrade === item.value ? item.activeClass : item.idleClass,
            ]"
          >
            <div class="text-lg font-bold text-slate-800">{{ item.title }}</div>
            <div class="text-xs text-slate-400 leading-snug">{{ item.hint }}</div>
          </button>
        </div>

        <!-- 第二步：选择模式，年级跟随上面选中的卡片 -->
        <h2 class="text-sm font-semibold text-slate-400 mb-2">第二步 · 选择模式</h2>
        <div class="flex flex-col gap-3 mb-5">
          <button
            @click="go('/practice')"
            data-testid="mode-practice"
            class="rounded-2xl py-3 px-4 bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all flex flex-col items-center"
          >
            <span class="text-lg font-medium">📚 题题练</span>
            <span class="text-xs opacity-90">每道题都要算对才能进入下一题</span>
          </button>
          <button
            @click="go('/contest')"
            data-testid="mode-contest"
            class="rounded-2xl py-3 px-4 bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-sm transition-all flex flex-col items-center"
          >
            <span class="text-lg font-medium">⏱️ 竞赛</span>
            <span class="text-xs opacity-80">
              10分钟 · {{ selectedOption.contestCount }}题，可自由跳题
            </span>
          </button>
        </div>

        <!-- 错题本入口：显示未清除的错题条数 -->
        <button
          @click="go('/mistakes')"
          data-testid="mistakes-entry"
          class="w-full flex items-center justify-between rounded-2xl bg-rose-50 ring-1 ring-rose-100 px-4 py-3 hover:bg-rose-100 transition-all"
        >
          <span class="font-medium text-slate-700">📕 错题本</span>
          <span v-if="mistakeTotal" class="px-2 py-0.5 rounded-full bg-rose-400 text-white text-xs">
            {{ mistakeTotal }} 条
          </span>
          <span v-else class="text-xs text-slate-400">暂无错题</span>
        </button>
      </div>
    </div>

    <!-- 头像选择弹层：用 v-show，SSR 也会把 12 个选项渲染出来 -->
    <div
      v-show="showPicker"
      @click.self="showPicker = false"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-6 w-full max-w-sm">
        <h3 class="text-lg font-bold text-slate-800 text-center mb-1">选一个你的Q版头像</h3>
        <p class="text-xs text-slate-400 text-center mb-4">选好后会记在这台设备上</p>
        <AvatarPicker v-model="avatarId" />
        <button
          @click="showPicker = false"
          class="mt-5 w-full py-3 rounded-2xl bg-sky-500 text-white font-medium hover:bg-sky-600 shadow-sm transition-all"
        >
          完成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import AvatarPicker from '../components/AvatarPicker.vue';
import { loadLastGrade, saveLastGrade } from '../utils/storage.js';
import { countMistakes } from '../utils/mistakeBook.js';
import { loadAvatar, saveAvatar } from '../utils/avatars.js';

const route = useRoute();
const router = useRouter();

// 年级配置：卡片颜色写成完整类名，Tailwind 才能正确打包
const grades = [
  {
    value: 3,
    title: '3年级',
    hint: '数字 1-9，每道都能不用括号算出来',
    contestCount: 10,
    activeClass: 'border-sky-300 bg-sky-50 ring-2 ring-sky-200',
    idleClass: 'border-slate-100 bg-white hover:border-sky-200',
  },
  {
    value: 45,
    title: '4-5年级',
    hint: '数字 1-13，可以使用括号',
    contestCount: 20,
    activeClass: 'border-violet-300 bg-violet-50 ring-2 ring-violet-200',
    idleClass: 'border-slate-100 bg-white hover:border-violet-200',
  },
];

/** 初始年级优先级：URL 参数 → 上次选择 → 默认 3年级 */
function resolveInitialGrade() {
  const fromQuery = Number(route.query.grade);
  if (fromQuery === 45 || fromQuery === 3) return fromQuery;
  return loadLastGrade(3);
}

const selectedGrade = ref(resolveInitialGrade());

const selectedOption = computed(
  () => grades.find((item) => item.value === selectedGrade.value) || grades[0]
);

// 错题条数：每次回到首页都重新读一次
const mistakeTotal = ref(countMistakes());

// Q版头像：选完立刻存本机
const avatarId = ref(loadAvatar());
const showPicker = ref(false);

watch(avatarId, (id) => saveAvatar(id));

function selectGrade(value) {
  selectedGrade.value = value;
  saveLastGrade(value); // 记住选择，从练习页返回时保持高亮
}

// 模式入口统一带上当前选中的年级
function go(path) {
  router.push({ path, query: { grade: selectedGrade.value } });
}
</script>
