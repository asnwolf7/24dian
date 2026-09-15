<template>
  <div class="grid grid-cols-4 gap-3">
    <button
      v-for="item in avatars"
      :key="item.id"
      @click="select(item.id)"
      data-testid="avatar-option"
      :class="[
        'flex flex-col items-center gap-1 rounded-2xl py-2 transition-all',
        modelValue === item.id
          ? 'bg-sky-50 ring-2 ring-sky-400'
          : 'hover:bg-slate-50 ring-1 ring-transparent',
      ]"
    >
      <PlayerAvatar :avatar-id="item.id" :size="56" />
      <span class="text-xs text-slate-500">{{ item.name }}</span>
    </button>
  </div>
</template>

<script setup>
import PlayerAvatar from './PlayerAvatar.vue';
import { AVATARS } from '../utils/avatars.js';

defineProps({
  // 当前选中的头像 id
  modelValue: { type: String, default: 'fox' },
});

const emit = defineEmits(['update:modelValue']);

const avatars = AVATARS;

function select(id) {
  emit('update:modelValue', id);
}
</script>
