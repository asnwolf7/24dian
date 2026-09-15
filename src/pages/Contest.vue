<template>
  <div class="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 p-4">
    <div class="max-w-2xl mx-auto">
      <!-- 顶部状态栏 -->
      <div class="flex items-center justify-between mb-4">
        <button
          @click="confirmExit"
          class="px-4 py-2 bg-white text-slate-600 rounded-2xl ring-1 ring-slate-900/5 shadow-sm hover:bg-slate-50 transition-all"
        >
          ← 返回
        </button>
        <div class="flex items-center gap-3">
          <div class="text-center">
            <div class="text-3xl font-bold tabular-nums text-slate-800">{{ formatTime(timeLeft) }}</div>
            <div class="text-xs text-slate-400">剩余时间</div>
          </div>
          <PlayerAvatar :avatar-id="avatarId" :size="36" />
        </div>
        <div class="text-right">
          <div class="text-xl font-bold text-slate-800">{{ answeredCount }}/{{ totalCount }}</div>
          <div class="text-xs text-slate-400">已作答</div>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="h-2 bg-slate-200 rounded-full mb-4 overflow-hidden">
        <div
          class="h-full bg-amber-400 transition-all duration-300"
          :style="{ width: `${(answeredCount / totalCount) * 100}%` }"
        ></div>
      </div>

      <!--
        题目卡片（竞赛模式）：
        - 没有“跳过”“提交”按钮
        - 点“下一题”时校验当前算式（去空格）是否为空，非空则保存为作答
        - 答题过程中不判对错，交卷后才判分
      -->
      <QuestionCard
        v-if="currentQuestion"
        :numbers="currentQuestion.numbers"
        :initial-expression="currentRecord.expression"
        :initial-tokens="currentRecord.tokens"
        :show-submit="false"
        :show-prev="true"
        :show-next="true"
        @change="handleChange"
        @prev="prevQuestion"
        @next="nextQuestion"
      />

      <div v-else class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-8 text-center text-slate-400">
        正在准备题目…
      </div>

      <!-- 题号导航：绿色=已作答，琥珀=未作答 -->
      <div class="mt-4">
        <QuestionNav :items="navItems" @select="jumpToQuestion" />
      </div>

      <div class="mt-4 text-center">
        <button
          @click="endContest"
          class="px-6 py-2 bg-white text-slate-600 rounded-2xl ring-1 ring-slate-900/5 shadow-sm hover:bg-slate-50 transition-all"
        >
          提前交卷
        </button>
      </div>

      <!-- 成绩弹窗（交卷后才判分） -->
      <div
        v-if="showResult"
        class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      >
        <div class="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 p-8 max-w-sm w-full text-center">
          <div class="flex justify-center mb-2">
            <PlayerAvatar :avatar-id="avatarId" :size="64" />
          </div>
          <h2 class="text-3xl font-bold text-slate-800 mb-4">🎉 竞赛结束！</h2>
          <div class="text-6xl font-bold text-emerald-500 mb-2">{{ correctCount }}</div>
          <p class="text-slate-500 mb-4">答对题数（共 {{ totalCount }} 题）</p>
          <p class="text-slate-400 mb-2">
            作答 {{ answeredCount }} 题，未作答 {{ totalCount - answeredCount }} 题
          </p>
          <p class="text-slate-400 mb-6">用时：{{ formatTime(totalTime - timeLeft) }}</p>
          <p class="text-sm text-rose-500 mb-4">错题已存入错题本，记得回顾哦～</p>
          <button
            @click="goMistakes"
            class="w-full py-3 px-6 rounded-2xl text-lg font-medium bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-sm mb-3 transition-all"
          >
            查看错题本
          </button>
          <button
            @click="goHome"
            class="w-full py-3 px-6 rounded-2xl text-lg font-medium bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import QuestionCard from '../components/QuestionCard.vue';
import QuestionNav from '../components/QuestionNav.vue';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import { getRandomQuestions, validateAnswer, isBlank } from '../utils/game.js';
import { recordMistake } from '../utils/mistakeBook.js';
import { loadAvatar } from '../utils/avatars.js';

const route = useRoute();
const router = useRouter();

// 顶部小头像（本机选的 Q版头像）
const avatarId = ref(loadAvatar());

// 竞赛配置：3年级 10 题，4-5年级 20 题，统一 10 分钟
const grade = ref(Number(route.query.grade) === 45 ? 45 : 3);
const totalCount = ref(grade.value === 45 ? 20 : 10);
const totalTime = ref(10 * 60);

// 题目立即生成，避免首帧空白
const questions = ref(getRandomQuestions(grade.value, totalCount.value));
const currentIndex = ref(0);
const timeLeft = ref(totalTime.value);
const showResult = ref(false);
const finalScore = ref({ correct: 0 });

// 学生作答：{ [questionId]: { expression, tokens } }（答题过程中不判对错）
const records = ref({});

let timer = null;

onMounted(() => {
  timer = setInterval(() => {
    if (timeLeft.value <= 0) return;
    timeLeft.value -= 1;
    if (timeLeft.value <= 0) endContest();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  timer = null;
});

const currentQuestion = computed(() => questions.value[currentIndex.value] || null);

const emptyRecord = { expression: '', tokens: null };

const currentRecord = computed(() => {
  if (!currentQuestion.value) return emptyRecord;
  return records.value[currentQuestion.value.id] || emptyRecord;
});

/** 某题是否已作答：算式去掉空格后不为空 */
function isAnswered(id) {
  const rec = records.value[id];
  return !!rec && !isBlank(rec.expression);
}

const answeredCount = computed(
  () => questions.value.filter((q) => isAnswered(q.id)).length
);

// 交卷后才统计答对题数
const correctCount = computed(() => finalScore.value.correct);

// 题号导航：绿色=已作答，橙色=未作答，蓝框=当前题（不显示对错）
const navItems = computed(() =>
  questions.value.map((q) => ({
    id: q.id,
    status: isAnswered(q.id) ? 'answered' : 'empty',
    isCurrent: currentQuestion.value ? q.id === currentQuestion.value.id : false,
  }))
);

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** 输入变化：非空就存为学生答案，清空则视为未作答 */
function handleChange(payload) {
  const q = currentQuestion.value;
  if (!q) return;

  const next = { ...records.value };
  if (isBlank(payload.expression)) {
    delete next[q.id];
  } else {
    next[q.id] = { expression: payload.expression, tokens: payload.tokens };
  }
  records.value = next;
}

/** 切题前保存当前作答：算式（去空格）为空则不保存 */
function commitCurrent() {
  const q = currentQuestion.value;
  if (!q) return;

  const text = currentRecord.value.expression;
  const next = { ...records.value };
  if (isBlank(text)) {
    delete next[q.id]; // 空表达式不作为答案保存
  } else {
    next[q.id] = { expression: text, tokens: currentRecord.value.tokens || null };
  }
  records.value = next;
}

function nextQuestion() {
  commitCurrent();
  currentIndex.value = (currentIndex.value + 1) % questions.value.length;
}

function prevQuestion() {
  commitCurrent();
  currentIndex.value = (currentIndex.value - 1 + questions.value.length) % questions.value.length;
}

function jumpToQuestion(id) {
  commitCurrent();
  const idx = questions.value.findIndex((q) => q.id === id);
  if (idx !== -1) currentIndex.value = idx;
}

/** 交卷：此时才判对错 */
function judgeAll() {
  let correct = 0;
  for (const q of questions.value) {
    if (!isAnswered(q.id)) continue;
    if (validateAnswer(q.numbers, records.value[q.id].expression).valid) correct += 1;
  }
  finalScore.value = { correct };
}

/**
 * 交卷后把错题写进错题本（本地存储）
 * - 未作答的题：kind = 'unanswered'
 * - 作答了但没算对的题：kind = 'wrong'，并记下学生写的算式
 * - 算对的题不写入
 * 中途返回不调用这个函数（与“交卷后才判分”保持一致）
 */
function collectMistakes() {
  for (const q of questions.value) {
    if (!isAnswered(q.id)) {
      recordMistake({
        grade: grade.value,
        numbers: q.numbers,
        solution: q.solution,
        expression: '',
        source: 'contest',
        kind: 'unanswered',
      });
      continue;
    }

    const expression = records.value[q.id].expression;
    if (!validateAnswer(q.numbers, expression).valid) {
      recordMistake({
        grade: grade.value,
        numbers: q.numbers,
        solution: q.solution,
        expression,
        source: 'contest',
        kind: 'wrong',
      });
    }
  }
}

function endContest() {
  if (timer) clearInterval(timer);
  timer = null;
  commitCurrent();
  judgeAll();
  collectMistakes();
  showResult.value = true;
}

function confirmExit() {
  if (window.confirm('确定要退出竞赛吗？成绩不会保存哦')) goHome();
}

function goHome() {
  if (timer) clearInterval(timer);
  timer = null;
  router.push('/');
}

function goMistakes() {
  if (timer) clearInterval(timer);
  timer = null;
  router.push('/mistakes');
}
</script>
