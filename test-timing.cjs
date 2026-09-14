// 测试题库生成时间
const start = Date.now();

const { getRandomQuestions, GRADE3_QUESTIONS, GRADE45_QUESTIONS } = require('./src/utils/game.js');

console.log(`题库生成耗时: ${Date.now() - start}ms`);
console.log(`3年级题库: ${GRADE3_QUESTIONS.length}道`);
console.log(`4-5年级题库: ${GRADE45_QUESTIONS.length}道`);

const questions = getRandomQuestions(3, 10);
console.log('生成10道题:', questions.length);
console.log('耗时:', Date.now() - start, 'ms');
