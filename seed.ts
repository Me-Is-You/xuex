import { db } from './src/db/index';
import { questions } from './src/db/schema';

async function seed() {
  console.log('Seeding database...');
  
  const mockQuestions = [
    {
      subject: 'Math',
      category: 'Calculus',
      content: '设 f(x) = x^2, 则 f\'(1) = ?',
      options: ['1', '2', '3', '0'],
      answer: '2',
      explanation: 'f\'(x) = 2x, 所以 f\'(1) = 2 * 1 = 2。',
      difficulty: 1
    },
    {
      subject: 'English',
      category: 'Vocabulary',
      content: 'What is the synonym of "Obdurate"?',
      options: ['Flexible', 'Stubborn', 'Yielding', 'Soft'],
      answer: 'Stubborn',
      explanation: 'Obdurate 意为“顽固的”，Stubborn 是其同义词。',
      difficulty: 3
    },
    {
      subject: 'Math',
      category: 'Linear Algebra',
      content: '若 A 为 n 阶对称矩阵，则 A 的特征值必为？',
      options: ['虚数', '实数', '零', '1'],
      answer: '实数',
      explanation: '实对称矩阵的特征值全部为实数，这是线性代数的一个基本定理。',
      difficulty: 2
    },
    {
      subject: 'English',
      category: 'Grammar',
      content: 'I suggest that he ______ the meeting.',
      options: ['attends', 'attend', 'attended', 'would attend'],
      answer: 'attend',
      explanation: 'Suggest 后的宾语从句使用虚拟语气，动词形式为 (should) + 动词原形。',
      difficulty: 3
    },
    {
      subject: 'Math',
      category: 'Calculus',
      content: '函数 y = sin x 在 [0, π] 上的定积分值为？',
      options: ['0', '1', '2', 'π'],
      answer: '2',
      explanation: '∫(0 to π) sin x dx = [-cos x](0 to π) = -cos(π) - (-cos 0) = -(-1) - (-1) = 1 + 1 = 2。',
      difficulty: 2
    }
  ];

  for (const q of mockQuestions) {
    await db.insert(questions).values(q);
  }

  console.log('Seeding finished.');
}

seed().catch(console.error);
