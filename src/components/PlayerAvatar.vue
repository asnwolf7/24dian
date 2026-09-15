<template>
  <!--
    Q版卡通头像：全部用基础图形绘制，参数来自 utils/avatars.js
    ear 决定耳朵剪影，mark 决定额外装饰（眼圈 / 条纹 / 猪鼻 …）
  -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 100 100"
    role="img"
    :aria-label="avatar.name"
    data-testid="player-avatar"
  >
    <!-- 圆形底衬，让头像在浅色背景上也有轮廓 -->
    <circle cx="50" cy="50" r="48" :fill="avatar.fur" opacity="0.18" />
    <circle cx="50" cy="50" r="48" fill="none" :stroke="avatar.fur" stroke-opacity="0.35" stroke-width="1.5" />

    <!-- 狮子鬃毛 -->
    <circle v-if="mark === 'mane'" cx="50" cy="54" r="37" :fill="avatar.dark" opacity="0.28" />

    <!-- 独角兽的角 -->
    <path
      v-if="mark === 'horn'"
      d="M50 4 L59 27 L41 27 Z"
      :fill="avatar.dark"
      opacity="0.85"
    />

    <!-- 耳朵：尖耳 -->
    <template v-if="ear === 'pointy'">
      <path d="M24 38 L27 8 L46 27 Z" :fill="avatar.fur" />
      <path d="M76 38 L73 8 L54 27 Z" :fill="avatar.fur" />
      <path d="M29 33 L31 16 L41 27 Z" :fill="avatar.light" />
      <path d="M71 33 L69 16 L59 27 Z" :fill="avatar.light" />
    </template>

    <!-- 耳朵：圆耳 -->
    <template v-else-if="ear === 'round'">
      <circle cx="25" cy="32" r="12" :fill="avatar.fur" />
      <circle cx="75" cy="32" r="12" :fill="avatar.fur" />
      <circle cx="25" cy="32" r="6" :fill="avatar.light" />
      <circle cx="75" cy="32" r="6" :fill="avatar.light" />
    </template>

    <!-- 耳朵：兔耳 -->
    <template v-else-if="ear === 'long'">
      <ellipse cx="37" cy="20" rx="7" ry="18" :fill="avatar.fur" />
      <ellipse cx="63" cy="20" rx="7" ry="18" :fill="avatar.fur" />
      <ellipse cx="37" cy="20" rx="3.5" ry="12" :fill="avatar.light" />
      <ellipse cx="63" cy="20" rx="3.5" ry="12" :fill="avatar.light" />
    </template>

    <!-- 耳朵：垂耳 -->
    <template v-else-if="ear === 'floppy'">
      <ellipse cx="23" cy="46" rx="9" ry="17" :fill="avatar.dark" opacity="0.75" />
      <ellipse cx="77" cy="46" rx="9" ry="17" :fill="avatar.dark" opacity="0.75" />
    </template>

    <!-- 耳朵：小圆耳 -->
    <template v-else-if="ear === 'small'">
      <circle cx="30" cy="35" r="8" :fill="avatar.fur" />
      <circle cx="70" cy="35" r="8" :fill="avatar.fur" />
    </template>

    <!-- 青蛙：眼睛长在头顶 -->
    <template v-if="mark === 'frog'">
      <circle cx="32" cy="29" r="13" :fill="avatar.fur" />
      <circle cx="68" cy="29" r="13" :fill="avatar.fur" />
    </template>

    <!-- 脸 -->
    <ellipse cx="50" cy="56" rx="30" ry="28" :fill="avatar.fur" />

    <!-- 浅色口鼻区 -->
    <ellipse cx="50" cy="68" rx="17" ry="13" :fill="avatar.light" opacity="0.9" />

    <!-- 额头条纹（小老虎） -->
    <template v-if="mark === 'stripe'">
      <path d="M42 34 L44 44" :stroke="avatar.dark" stroke-width="2.5" stroke-linecap="round" opacity="0.55" />
      <path d="M50 32 L50 43" :stroke="avatar.dark" stroke-width="2.5" stroke-linecap="round" opacity="0.55" />
      <path d="M58 34 L56 44" :stroke="avatar.dark" stroke-width="2.5" stroke-linecap="round" opacity="0.55" />
    </template>

    <!-- 眼圈（小熊猫） -->
    <template v-if="mark === 'eyepatch'">
      <ellipse cx="37" cy="56" rx="11" ry="12" :fill="avatar.dark" />
      <ellipse cx="63" cy="56" rx="11" ry="12" :fill="avatar.dark" />
    </template>

    <!-- 青蛙的大眼睛 -->
    <template v-if="mark === 'frog'">
      <circle cx="32" cy="29" r="8" :fill="avatar.light" />
      <circle cx="68" cy="29" r="8" :fill="avatar.light" />
      <circle cx="32" cy="29" r="4" :fill="avatar.dark" />
      <circle cx="68" cy="29" r="4" :fill="avatar.dark" />
    </template>

    <!-- 眼睛（青蛙的已画在头顶） -->
    <template v-else>
      <ellipse cx="38" cy="56" rx="4" ry="5" :fill="eyeColor" />
      <ellipse cx="62" cy="56" rx="4" ry="5" :fill="eyeColor" />
      <circle cx="39.4" cy="54.2" r="1.5" fill="#FFFFFF" />
      <circle cx="63.4" cy="54.2" r="1.5" fill="#FFFFFF" />
    </template>

    <!-- 腮红 -->
    <ellipse cx="29" cy="67" rx="6" ry="4" fill="#FB7185" opacity="0.3" />
    <ellipse cx="71" cy="67" rx="6" ry="4" fill="#FB7185" opacity="0.3" />

    <!-- 鼻子与嘴：按 mark 分支 -->
    <template v-if="mark === 'beak'">
      <path d="M43 62 L57 62 L50 75 Z" :fill="avatar.dark" />
    </template>
    <template v-else-if="mark === 'snout'">
      <ellipse cx="50" cy="65" rx="12" ry="8.5" :fill="avatar.fur" :stroke="avatar.dark" stroke-opacity="0.35" stroke-width="1.5" />
      <ellipse cx="45.5" cy="65" rx="1.8" ry="2.6" :fill="avatar.dark" opacity="0.7" />
      <ellipse cx="54.5" cy="65" rx="1.8" ry="2.6" :fill="avatar.dark" opacity="0.7" />
    </template>
    <template v-else-if="mark === 'frog'">
      <path d="M37 66 Q50 78 63 66" fill="none" :stroke="avatar.dark" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
    </template>
    <template v-else>
      <ellipse cx="50" cy="64" rx="4" ry="3" :fill="avatar.dark" opacity="0.85" />
      <path d="M45 70 Q50 75 55 70" fill="none" :stroke="avatar.dark" stroke-width="2" stroke-linecap="round" opacity="0.7" />
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue';
import { getAvatar } from '../utils/avatars.js';

const props = defineProps({
  // 头像 id，未知 id 自动回落到默认头像
  avatarId: { type: String, default: 'fox' },
  // 渲染尺寸（正方形，px）
  size: { type: Number, default: 56 },
});

const avatar = computed(() => getAvatar(props.avatarId));
const ear = computed(() => avatar.value.ear || 'none');
const mark = computed(() => avatar.value.mark || '');

// 熊猫的黑眼圈上要用白眼睛才看得见
const eyeColor = computed(() => (mark.value === 'eyepatch' ? '#FFFFFF' : avatar.value.dark));
</script>
