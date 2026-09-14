<template>
  <div class="bg-white rounded-2xl shadow-xl p-3">
    <!-- 小方块题号：紧凑排布，不再占满整行 -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="item in items"
        :key="item.id"
        @click="$emit('select', item.id)"
        :class="[
          'w-9 h-9 rounded-lg text-sm font-semibold transition-all flex items-center justify-center',
          getButtonClass(item),
        ]"
      >
        {{ item.id }}
      </button>
    </div>

    <!-- 图例：竞赛中不显示对错，只有“已作答 / 未作答” -->
    <div class="flex flex-wrap justify-center gap-4 mt-3 text-xs text-gray-600">
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded bg-green-500"></div>
        <span>已作答</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded bg-orange-400"></div>
        <span>未作答</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded bg-blue-100 border border-blue-500"></div>
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
    return 'bg-blue-100 text-blue-600 border-2 border-blue-500';
  }

  switch (item.status) {
    case 'answered':
      return 'bg-green-500 text-white hover:bg-green-600';
    case 'empty':
      return 'bg-orange-400 text-white hover:bg-orange-500';
    default:
      return 'bg-orange-400 text-white hover:bg-orange-500';
  }
}
</script>
