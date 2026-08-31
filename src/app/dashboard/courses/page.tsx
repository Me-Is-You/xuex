'use client';

import React, { useState } from 'react';
import { 
  Play, 
  FileText, 
  Layers, 
  Search, 
  Filter, 
  Clock, 
  Star,
  BookOpen
} from 'lucide-react';

const MOCK_COURSES = [
  { id: 1, title: '高等数学：微积分从入门到精通', type: 'video', subject: '数学', duration: '45h', instructor: '张教授', level: '零基础', students: 1240, cover: 'bg-blue-600' },
  { id: 2, title: '专升本核心词汇 3500 深度记忆', type: 'interactive', subject: '英语', duration: '20h', instructor: 'Lily老师', level: '通用', students: 3200, cover: 'bg-indigo-600' },
  { id: 3, title: '线性代数：矩阵论专项突破', type: 'video', subject: '数学', duration: '12h', instructor: '李老师', level: '进阶', students: 850, cover: 'bg-slate-700' },
  { id: 4, title: '英语写作高分模板与逻辑', type: 'pdf', subject: '英语', duration: '5h', instructor: '王老师', level: '冲刺', students: 2100, cover: 'bg-emerald-600' },
  { id: 5, title: '大数据技术导论与升学建议', type: 'video', subject: '专业课', duration: '8h', instructor: '行业专家', level: '科普', students: 560, cover: 'bg-purple-600' },
];

export default function CoursesPage() {
  const [filter, setFilter] = useState('全部');

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">资源中心</h2>
          <p className="text-slate-500">多模态学习资源，覆盖 2027 届全部考纲要求</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索课程、讲义、模拟卷..." 
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />
          </div>
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['全部', '数学', '英语', '专业课', '历年真题', '考纲解析'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              filter === cat 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                : 'bg-white text-slate-600 border border-slate-100 hover:border-emerald-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {MOCK_COURSES.filter(c => filter === '全部' || c.subject === filter).map((course) => (
          <div key={course.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col">
            <div className={`h-48 ${course.cover} relative flex items-center justify-center`}>
              {course.type === 'video' ? <Play className="text-white w-12 h-12 opacity-80 group-hover:scale-110 transition-transform" fill="currentColor" /> : <FileText className="text-white w-12 h-12 opacity-80" />}
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
                {course.type}
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                  {course.subject}
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">
                  {course.level}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {course.title}
              </h3>
              
              <div className="flex items-center gap-4 text-slate-400 text-xs mb-6">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  {course.duration}
                </div>
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-amber-400" fill="currentColor" />
                  4.9
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen size={14} />
                  {course.students} 人在学
                </div>
              </div>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200" />
                  <span className="text-xs font-medium text-slate-600">{course.instructor}</span>
                </div>
                <button className="text-blue-600 font-bold text-sm hover:underline">开始学习</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
