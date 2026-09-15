<template>
  <div class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-3">
    <!-- 小方块题号：紧凑排布，不再占满整行 -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="item in items"
        :key="item.id"
        @click="$emit('select', item.id)"
        data-testid="nav-item"
        :class="[
          'w-9 h-9 rounded-lg text-sm font-semibold transition-all flex items-center justify-center',
          getButtonClass(item),
        ]"
      >
        {{ item.id }}
      </button>
    </div>

    <!-- 图例：竞赛中不显示对错，只有“已作答 / 未作答” -->
    <div class="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400">
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded bg-emerald-400"></div>
        <span>已作答</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300"></div>
        <span>未作答</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded bg-sky-100 ring-1 ring-sky-400"></div>
        <span>当前题</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
    // 每个 item: { id, status: 'answered' | 'empty', isCurrent }
  },
});

defineEmits(['select']);

function getButtonClass(item) {
  if (item.isCurrent) {
    return 'bg-sky-100 text-sky-700 ring-2 ring-sky-400';
  }

  switch (item.status) {
    case 'answered':
      return 'bg-emerald-400 text-white hover:bg-emerald-500';
    case 'empty':
      return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
    default:
      return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
  }
}
</script>
