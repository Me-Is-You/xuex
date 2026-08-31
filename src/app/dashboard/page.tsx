import React from 'react';
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  BookMarked,
  Flame
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome & Streak */}
      <section className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">早上好，未来准本科生！</h2>
            <p className="text-emerald-50 mb-6 max-w-md">
              距离 2027 年陕西专升本考试还有 <span className="font-bold text-white">425</span> 天。今天的学习计划已为你生成。
            </p>
            <Link 
              href="/dashboard/practice" 
              className="inline-flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
            >
              开始今日练习 <Zap className="w-4 h-4" />
            </Link>
          </div>
          <Zap className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10" />
        </div>

        <div className="w-full md:w-72 bg-white rounded-3xl p-6 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-500 uppercase">学习连胜</span>
            <Flame className="text-orange-500" />
          </div>
          <div className="text-center py-4">
            <span className="text-6xl font-black text-slate-900">12</span>
            <span className="text-slate-500 font-medium ml-2">天</span>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-4">
            {[1, 1, 1, 1, 1, 0, 0].map((active, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full ${active ? 'bg-orange-400' : 'bg-slate-100'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<BookMarked className="text-blue-600" />} 
          label="已掌握知识点" 
          value="142" 
          trend="+12 本周"
        />
        <StatCard 
          icon={<Clock className="text-indigo-600" />} 
          label="今日学习时长" 
          value="45m" 
          trend="目标 120m"
        />
        <StatCard 
          icon={<CheckCircle2 className="text-emerald-600" />} 
          label="题目正确率" 
          value="84%" 
          trend="+2.4% 环比"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Tasks */}
        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">今日任务清单</h3>
            <span className="text-xs font-bold text-emerald-600 cursor-pointer">管理任务</span>
          </div>
          <div className="space-y-4">
            <TaskItem 
              title="高等数学：多元函数微分法" 
              category="数学" 
              progress={60} 
              completed={false} 
            />
            <TaskItem 
              title="英语核心词汇：List 12-15" 
              category="英语" 
              progress={100} 
              completed={true} 
            />
            <TaskItem 
              title="历年真题：2023年数学模拟" 
              category="综合" 
              progress={0} 
              completed={false} 
            />
          </div>
        </section>

        {/* Smart Recommendations */}
        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">智能推题</h3>
            <button className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              刷新 <TrendingUp size={12} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="group p-4 rounded-2xl border border-slate-50 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">数学 - 难度 4</span>
                <span className="text-xs text-slate-400">来自大数据题库</span>
              </div>
              <p className="text-sm font-medium text-slate-700 line-clamp-2">
                若函数 f(x, y) = x^2 + y^2 - ln(xy)，求其在点 (1, 1) 处的全微分...
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">建议练习时长：10 分钟</span>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>

            <div className="group p-4 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">英语 - 难度 3</span>
                <span className="text-xs text-slate-400">核心语法专项</span>
              </div>
              <p className="text-sm font-medium text-slate-700 line-clamp-2">
                Identify the correct use of the subjunctive mood in the following sentence...
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">建议练习时长：5 分钟</span>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-emerald-50 rounded-2xl">
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{trend}</span>
      </div>
    </div>
  );
}

function TaskItem({ title, category, progress, completed }: { title: string, category: string, progress: number, completed: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
        completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent'
      }`}>
        <CheckCircle2 size={14} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className={`text-sm font-semibold ${completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{title}</span>
          <span className="text-[10px] font-bold text-slate-400">{category}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${completed ? 'bg-emerald-500' : 'bg-emerald-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
