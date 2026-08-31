'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Settings, 
  BarChart3, 
  HelpCircle,
  Home,
  MessageSquare,
  LogOut,
  BrainCircuit,
  Layers,
  Network,
  ShieldCheck,
  Video,
  Bot
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-emerald-50 hidden lg:flex flex-col">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <BrainCircuit className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg">2027 Pro</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide">
          <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="控制台" active={pathname === '/dashboard'} />
          <NavItem href="/dashboard/ai-tutor" icon={<Bot size={20} />} label="AI 智能助教" active={pathname === '/dashboard/ai-tutor'} />
          <NavItem href="/dashboard/live" icon={<Video size={20} />} label="直播课堂" active={pathname === '/dashboard/live'} />
          <NavItem href="/dashboard/practice" icon={<BookOpen size={20} />} label="每日训练" active={pathname === '/dashboard/practice'} />
          <NavItem href="/dashboard/error-book" icon={<BrainCircuit size={20} />} label="智能错题" active={pathname === '/dashboard/error-book'} />
          <NavItem href="/dashboard/courses" icon={<Layers size={20} />} label="资源中心" active={pathname === '/dashboard/courses'} />
          <NavItem href="/dashboard/graph" icon={<Network size={20} />} label="知识图谱" active={pathname === '/dashboard/graph'} />
          <NavItem href="/dashboard/analytics" icon={<BarChart3 size={20} />} label="成绩分析" active={pathname === '/dashboard/analytics'} />
          <NavItem href="/dashboard/community" icon={<MessageSquare size={20} />} label="备考社区" active={pathname === '/dashboard/community'} />
          <NavItem href="/dashboard/admin" icon={<ShieldCheck size={20} />} label="教学管理" active={pathname === '/dashboard/admin'} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <NavItem href="/" icon={<Home size={20} />} label="返回首页" />
          <NavItem href="/dashboard/settings" icon={<Settings size={20} />} label="个人设置" active={pathname === '/dashboard/settings'} />
          <div className="mt-4 p-4 bg-emerald-50 rounded-xl">
            <p className="text-xs font-semibold text-emerald-600 mb-1">升级 Pro 版</p>
            <p className="text-[10px] text-slate-500 mb-3">获取精准押题与名师 1对1 解答。</p>
            <button className="w-full bg-emerald-600 text-white text-xs py-2 rounded-lg font-bold">了解更多</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-600">
               <MessageSquare size={20} />
            </button>
            <h1 className="text-lg font-semibold text-slate-800">学习概览</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <HelpCircle size={20} />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold">
              JS
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-emerald-50 text-emerald-700' 
          : 'text-slate-600 hover:bg-emerald-50/50 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
