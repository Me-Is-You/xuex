import React from 'react';
import Link from 'next/link';
import { BookOpen, Target, TrendingUp, Award, ArrowRight, BrainCircuit, Zap, ShieldCheck, Video, Network, Radar, HeartPulse } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-leaf-50">
        <div className="flex items-center gap-2">
          <div className="bg-leaf-600 p-2 rounded-lg">
            <BrainCircuit className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-leaf-600 to-leaf-800">
            陕西专升本 2027 Pro
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="#features" className="hover:text-leaf-600 transition-colors">备考方案</Link>
          <Link href="#roadmap" className="hover:text-leaf-600 transition-colors">学习路径</Link>
          <Link href="/dashboard" className="hover:text-leaf-600 transition-colors">我的控制台</Link>
        </div>
        <Link 
          href="/dashboard" 
          className="bg-leaf-600 hover:bg-leaf-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-lg shadow-leaf-200"
        >
          立即开始
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="relative px-8 pt-20 pb-32 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-leaf-50 text-leaf-700 text-xs font-bold mb-6 border border-leaf-100 uppercase tracking-wider">
            <Zap className="w-3 h-3" /> 2027 届考生专属平台
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            智能化备考 <br />
            <span className="text-leaf-600">决胜 2027 陕西专升本</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12">
            针对理科、大数据技术专业，提供数学与英语全方位突破方案。从零基础到高分录取，智能算法助你精准查漏补缺。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all w-full sm:w-auto justify-center"
            >
              进入训练中心 <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="#roadmap" 
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-leaf-300 text-slate-700 px-8 py-4 rounded-xl text-lg font-bold transition-all w-full sm:w-auto justify-center"
            >
              查看学习路线
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 opacity-30">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-leaf-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-leaf-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-leaf-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">为什么选择我们的平台？</h2>
            <p className="text-slate-500">专为理科大数据学子打造的精细化学习体验</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<BrainCircuit className="w-8 h-8 text-blue-600" />}
              title="AI 智能助教"
              description="接入大语言模型，提供 7x24 小时在线答疑，支持作文批改与复杂高数推导解析。"
            />
            <FeatureCard 
              icon={<Video className="w-8 h-8 text-indigo-600" />}
              title="多模态云资源"
              description="涵盖视频、课件、仿真实验。支持微课与系统课双模式，断点续学跨端同步。"
            />
            <FeatureCard 
              icon={<Network className="w-8 h-8 text-leaf-600" />}
              title="知识图谱导航"
              description="以网状结构展示 2027 考纲知识脉络，前置后置知识关联推荐，学习不走弯路。"
            />
            <FeatureCard 
              icon={<TrendingUp className="w-8 h-8 text-orange-600" />}
              title="大数据学情预警"
              description="埋点采集时长与互动数据，生成雷达图报告。针对异常表现自动触发干预提醒。"
            />
            <FeatureCard 
              icon={<Radar className="w-8 h-8 text-leaf-700" />}
              title="每日 0 点智能采题"
              description="自研采集管线每日 00:00 遍历参数化题库与全网公开资源，自动转换、去重、质检后入库，每天练习都有新题。"
            />
            <FeatureCard 
              icon={<HeartPulse className="w-8 h-8 text-rose-500" />}
              title="11 模块自愈引擎"
              description="每个模块配备自研自愈算法：检测 → 安全修复 → 审计留痕。数据漂移自动修复，全程可解释、可追溯。"
            />
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-slate-200"></div>
            <h2 className="text-2xl font-bold px-4">2027 备考五步法</h2>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>

          <div className="space-y-12">
            <RoadmapStep 
              number="01" 
              title="基础筑基期 (现在 - 2026.06)" 
              desc="主攻数学基础函数、极限；英语核心 3500 词汇与基础语法框架。"
            />
            <RoadmapStep 
              number="02" 
              title="强化拔高期 (2026.07 - 2026.12)" 
              desc="高数一元微积分、向量代数；英语长难句拆解与阅读理解专项。"
            />
            <RoadmapStep 
              number="03" 
              title="真题磨砺期 (2027.01 - 2027.03)" 
              desc="近10年陕本真题模拟，熟悉考试节奏，掌握答题技巧。"
            />
            <RoadmapStep 
              number="04" 
              title="冲刺提分期 (2027.03 - 2027.04)" 
              desc="大数据定位错题集，查缺补漏，押题预测，心态建设。"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-blue-600 w-5 h-5" />
            <span className="font-bold">陕西专升本 2027 Pro</span>
          </div>
          <p className="text-slate-400 text-sm text-center">
            &copy; 2026 Smart Prep Platform. 助力大数据技术学子成就本科梦想。
          </p>
          <div className="flex gap-6 text-slate-400">
            <ShieldCheck className="w-5 h-5 cursor-pointer hover:text-blue-600 transition-colors" />
            <Award className="w-5 h-5 cursor-pointer hover:text-blue-600 transition-colors" />
            <BookOpen className="w-5 h-5 cursor-pointer hover:text-blue-600 transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function RoadmapStep({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="flex gap-6 items-start">
      <div className="text-4xl font-black text-blue-100 select-none">{number}</div>
      <div>
        <h4 className="text-xl font-bold mb-2">{title}</h4>
        <p className="text-slate-500">{desc}</p>
      </div>
    </div>
  );
}
