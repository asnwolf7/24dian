<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl shadow-2xl p-6">
        <h1 class="text-3xl font-bold text-center text-gray-800 mb-1">🎴 24点游戏</h1>
        <p class="text-center text-gray-500 mb-6 text-sm">算24点，挑战你的数学思维！</p>

        <!-- 两个年级的入口直接列出来，不用先单独选年级 -->
        <div class="flex flex-col gap-4">
          <section
            v-for="item in grades"
            :key="item.value"
            class="rounded-xl border-2 p-4"
            :class="item.cardClass"
          >
            <div class="flex items-center justify-between mb-1">
              <h2 class="text-xl font-bold text-gray-800">{{ item.title }}</h2>
              <span class="text-xs px-2 py-1 rounded-full" :class="item.chipClass">
                10分钟 · {{ item.contestCount }}题
              </span>
            </div>
            <p class="text-xs text-gray-500 mb-3">{{ item.hint }}</p>

            <div class="flex gap-3">
              <button
                @click="go('/practice', item.value)"
                class="flex-1 py-3 px-4 rounded-xl text-base font-medium bg-green-500 text-white hover:bg-green-600 transition-all shadow"
              >
                📚 题题练
              </button>
              <button
                @click="go('/contest', item.value)"
                class="flex-1 py-3 px-4 rounded-xl text-base font-medium bg-orange-500 text-white hover:bg-orange-600 transition-all shadow"
              >
                ⏱️ 竞赛
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

// 年级入口配置：卡片颜色写成完整类名，Tailwind 才能正确打包
const grades = [
  {
    value: 3,
    title: '3年级',
    hint: '数字 1-9，每题都能不用括号算出来，过程不出现分数',
    contestCount: 10,
    cardClass: 'border-blue-200 bg-blue-50/50',
    chipClass: 'bg-blue-500 text-white',
  },
  {
    value: 45,
    title: '4-5年级',
    hint: '数字 1-13，可以使用括号，题目更有挑战',
    contestCount: 20,
    cardClass: 'border-purple-200 bg-purple-50/50',
    chipClass: 'bg-purple-500 text-white',
  },
];

function go(path, grade) {
  router.push({ path, query: { grade } });
}
</script>
