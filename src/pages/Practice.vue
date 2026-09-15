<template>
  <div class="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 p-4">
    <div class="max-w-lg mx-auto">
      <!-- 顶部状态 -->
      <div class="flex items-center justify-between mb-4">
        <button
          @click="goHome"
          class="px-4 py-2 bg-white text-slate-600 rounded-2xl ring-1 ring-slate-900/5 shadow-sm hover:bg-slate-50 transition-all"
        >
          ← 返回
        </button>
        <h2 class="text-xl font-bold text-slate-800">
          {{ grade === 45 ? '4-5年级' : '3年级' }} · 题题练
        </h2>
        <div class="flex items-center gap-2">
          <PlayerAvatar :avatar-id="avatarId" :size="36" />
          <div class="text-slate-500 text-sm text-right leading-tight">
            <div>第 {{ currentIndex + 1 }} 题</div>
            <div>做对 {{ correctCount }} 题</div>
          </div>
        </div>
      </div>

      <!--
        题目卡片：
        - 答对 → 锁定并显示“下一题”
        - 答错 → 提示计算失败，可以继续改继续提交，不给“下一题”
      -->
      <QuestionCard
        v-if="currentQuestion"
        :numbers="currentQuestion.numbers"
        :initial-expression="currentRecord.expression"
        :initial-tokens="currentRecord.tokens"
        :initial-feedback="currentRecord.feedback"
        :locked="isCorrect"
        :solution="currentQuestion.solution"
        :show-solution-button="true"
        :show-prev="currentIndex > 0"
        :show-next="isCorrect"
        :show-submit="!isCorrect"
        @submit="handleSubmit"
        @change="handleChange"
        @next="nextQuestion"
        @prev="prevQuestion"
      />

      <div v-else class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-8 text-center text-slate-400">
        正在准备题目…
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import QuestionCard from '../components/QuestionCard.vue';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import { getRandomQuestions, formatResultMessage } from '../utils/game.js';
import { recordMistake } from '../utils/mistakeBook.js';
import { loadAvatar } from '../utils/avatars.js';

const route = useRoute();
const router = useRouter();

// 顶部小头像（本机选的 Q版头像）
const avatarId = ref(loadAvatar());

// 年级在 setup 阶段就能拿到，题目立即生成，避免首帧空白
const grade = ref(Number(route.query.grade) === 45 ? 45 : 3);
const questions = ref(getRandomQuestions(grade.value, 50));
const currentIndex = ref(0);

// 每题作答记录：{ [questionId]: { expression, tokens, feedback, correct } }
const records = ref({});

const currentQuestion = computed(() => questions.value[currentIndex.value] || null);

const emptyRecord = { expression: '', tokens: null, feedback: null, correct: false };

const currentRecord = computed(() => {
  if (!currentQuestion.value) return emptyRecord;
  return records.value[currentQuestion.value.id] || emptyRecord;
});

// 只有做对了才允许进入下一题
const isCorrect = computed(() => currentRecord.value.correct === true);

const correctCount = computed(
  () => Object.values(records.value).filter((r) => r.correct === true).length
);

// 记录未提交的输入：答对了就锁定；答错了还能继续改
function handleChange(payload) {
  const q = currentQuestion.value;
  if (!q) return;
  const old = records.value[q.id];
  if (old && old.correct === true) return; // 已答对的不再改动
  records.value = {
    ...records.value,
    [q.id]: {
      expression: payload.expression,
      tokens: payload.tokens,
      feedback: old ? old.feedback : null,
      correct: false,
    },
  };
}

function handleSubmit(result) {
  const q = currentQuestion.value;
  if (!q) return;

  records.value = {
    ...records.value,
    [q.id]: {
      expression: result.expression,
      tokens: result.tokens || currentRecord.value.tokens || null,
      // 失败时提示“计算失败”，不直接给答案（想看答案可以点“查看正确答案”）
      feedback: { valid: result.correct, message: formatResultMessage(result) },
      correct: result.correct,
    },
  };

  // 答错才记入错题本；答对不写入，也不删除已有记录（错题本只做回顾，手动移除）
  if (!result.correct) {
    recordMistake({
      grade: grade.value,
      numbers: q.numbers,
      solution: q.solution,
      expression: result.expression,
      source: 'practice',
      kind: 'wrong',
    });
  }
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value += 1;
  } else {
    // 做到最后一题后重新抽一批，继续练
    questions.value = getRandomQuestions(grade.value, 50);
    records.value = {};
    currentIndex.value = 0;
  }
}

function prevQuestion() {
  if (currentIndex.value > 0) currentIndex.value -= 1;
}

function goHome() {
  router.push('/');
}
</script>
