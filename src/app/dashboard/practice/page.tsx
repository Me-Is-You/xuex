'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  BrainCircuit,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Question = {
  id: number;
  subject: string;
  category: string;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: number;
};

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch('/api/questions/daily');
        const data = await res.json();
        setQuestions(data);
      } catch (err) {
        console.error('Failed to load questions', err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!showResult && questions.length > 0 && currentIndex < questions.length) {
        setSeconds(s => s + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [showResult, questions, currentIndex]);

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelectedAnswer(option);
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    setShowResult(true);
    const isCorrect = selectedAnswer === questions[currentIndex].answer;
    if (isCorrect) {
      setStats(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setStats(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const [finished, setFinished] = useState(false);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-2xl p-12 text-center"
      >
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold mb-4">练习完成！</h2>
        <p className="text-slate-500 mb-10">你今天表现得很棒。坚持就是胜利，2027 届本科正在向你招手。</p>
        
        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="bg-slate-50 p-6 rounded-2xl">
            <div className="text-sm font-bold text-slate-400 uppercase mb-1">正确率</div>
            <div className="text-3xl font-black text-slate-900">{Math.round((stats.correct / stats.total) * 100)}%</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl">
            <div className="text-sm font-bold text-slate-400 uppercase mb-1">用时</div>
            <div className="text-3xl font-black text-slate-900">{formatTime(seconds)}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/dashboard" 
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
          >
            返回控制台
          </Link>
          <button 
            onClick={() => window.location.reload()}
            className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
          >
            再练一组
          </button>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="p-8 text-center">未找到今日题目，请稍后再试。</div>;
  }

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">每日训练：2027 届专项</h2>
          <p className="text-slate-500 text-sm">正在练习：{currentQ.subject} - {currentQ.category}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-500">
            <Timer size={18} />
            <span className="font-mono font-medium">{formatTime(seconds)}</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-xs font-bold text-slate-400">进度</span>
            <div className="text-lg font-black text-blue-600">{currentIndex + 1}/{questions.length}</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-slate-100 rounded-full mb-10 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-blue-600"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden"
        >
          <div className="p-8 md:p-12">
            {/* Question Content */}
            <div className="mb-10">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-4">
                问题 {currentIndex + 1}
              </span>
              <h3 className="text-xl md:text-2xl font-bold leading-relaxed text-slate-800">
                {currentQ.content}
              </h3>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-4 mb-10">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = showResult && opt === currentQ.answer;
                const isWrong = showResult && isSelected && opt !== currentQ.answer;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(opt)}
                    disabled={showResult}
                    className={`
                      w-full text-left p-6 rounded-2xl border-2 transition-all duration-200
                      ${!showResult ? 'hover:border-blue-200 hover:bg-blue-50/50' : ''}
                      ${isSelected && !showResult ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}
                      ${isCorrect ? 'border-emerald-500 bg-emerald-50' : ''}
                      ${isWrong ? 'border-red-500 bg-red-50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                        {String.fromCharCode(65 + idx)}. {opt}
                      </span>
                      {isCorrect && <CheckCircle2 className="text-emerald-500" />}
                      {isWrong && <AlertCircle className="text-red-500" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation Section */}
            {showResult && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-200"
              >
                <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold">
                  <HelpCircle size={18} className="text-blue-600" />
                  解析
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {currentQ.explanation}
                </p>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {}} 
                className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-2 transition-colors"
              >
                <BrainCircuit size={18} />
                记录错题
              </button>
              
              {!showResult ? (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                  className={`
                    px-10 py-4 rounded-2xl font-bold transition-all shadow-lg
                    ${selectedAnswer 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}
                  `}
                >
                  提交答案
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl font-bold transition-all flex items-center gap-2"
                >
                  {currentIndex === questions.length - 1 ? '完成练习' : '下一题'}
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      <div className="mt-8 flex justify-center text-slate-400 text-xs font-medium">
        智能推荐引擎正在为您筛选下一组 2027 届大数据方向真题...
      </div>
    </div>
  );
}
