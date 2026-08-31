import { NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // In a real app, this might call an external AI service to generate or search questions
    // Here we'll fetch from our local DB
    const dailyQuestions = await db.select().from(questions).limit(5);

    // If no questions exist, we return a fallback or "generated" mock data
    if (dailyQuestions.length === 0) {
      const mockQuestions = [
        {
          id: 1,
          subject: 'Math',
          category: 'Calculus',
          content: '求极限 lim (x->0) (sin x / x)',
          options: ['0', '1', '∞', '不存在'],
          answer: '1',
          explanation: '这是重要极限之一，利用洛必达法则或等价无穷小替换可得结果为1。',
          difficulty: 1
        },
        {
          id: 2,
          subject: 'English',
          category: 'Grammar',
          content: 'He ______ his homework before his mother came back.',
          options: ['has finished', 'finished', 'had finished', 'was finishing'],
          answer: 'had finished',
          explanation: '这里表示“过去的过去”，主句应用过去完成时。',
          difficulty: 2
        },
        {
          id: 3,
          subject: 'Math',
          category: 'Linear Algebra',
          content: '若矩阵 A 为 3阶方阵，且 |A| = 2，则 |2A| = ?',
          options: ['4', '8', '16', '6'],
          answer: '16',
          explanation: '|kA| = k^n |A|，此处 n=3, k=2，故 |2A| = 2^3 * 2 = 8 * 2 = 16。',
          difficulty: 3
        }
      ];
      return NextResponse.json(mockQuestions);
    }

    return NextResponse.json(dailyQuestions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}
