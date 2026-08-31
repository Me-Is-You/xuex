'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Settings, BarChart3, Bell,
  BrainCircuit, Layers, Network, ShieldCheck, Video, Bot,
  Target, MessageSquare, Menu, X, ChevronDown, LogOut, User as UserIcon,
} from 'lucide-react';
import { UserProvider, useUser, ROLE_HOME } from '@/lib/user-context';
import { api, getCurrentUser } from '@/lib/client';

type NavItem = { href: string; label: string; icon: React.ReactNode; roles: string[] };

// 菜单级权限：不同角色可见模块不同
const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: '学习中心',
    items: [
      { href: '/dashboard', label: '控制台', icon: <LayoutDashboard size={18} />, roles: ['student', 'teacher', 'admin', 'parent'] },
      { href: '/dashboard/practice', label: '每日训练', icon: <BookOpen size={18} />, roles: ['student'] },
      { href: '/dashboard/error-book', label: '智能错题', icon: <BrainCircuit size={18} />, roles: ['student'] },
      { href: '/dashboard/ai-tutor', label: 'AI 智能助教', icon: <Bot size={18} />, roles: ['student'] },
      { href: '/dashboard/graph', label: '知识图谱', icon: <Network size={18} />, roles: ['student', 'teacher'] },
      { href: '/dashboard/courses', label: '资源中心', icon: <Layers size={18} />, roles: ['student', 'teacher'] },
      { href: '/dashboard/live', label: '直播课堂', icon: <Video size={18} />, roles: ['student'] },
      { href: '/dashboard/analytics', label: '成绩分析', icon: <BarChart3 size={18} />, roles: ['student', 'teacher', 'parent'] },
      { href: '/dashboard/goals', label: '学习目标', icon: <Target size={18} />, roles: ['student'] },
    ],
  },
  {
    title: '互动协作',
    items: [
      { href: '/dashboard/community', label: '备考社区', icon: <MessageSquare size={18} />, roles: ['student', 'teacher'] },
      { href: '/dashboard/messages', label: '消息中心', icon: <Bell size={18} />, roles: ['student', 'teacher', 'admin'] },
    ],
  },
  {
    title: '教学管理',
    items: [
      { href: '/dashboard/admin', label: '管理中心', icon: <ShieldCheck size={18} />, roles: ['teacher', 'admin'] },
    ],
  },
  {
    title: '系统',
    items: [
      { href: '/dashboard/settings', label: '个人设置', icon: <Settings size={18} />, roles: ['student', 'teacher', 'admin', 'parent'] },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = { student: '学生', teacher: '教师', admin: '管理员', parent: '家长' };

function NotificationBell() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = () =>
    api('/api/notifications')
      .then((d) => {
        setNotifs(d.notifications);
        setUnread(d.unread);
      })
      .catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user.id]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative p-2 text-slate-400 hover:text-slate-600">
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <span className="text-sm font-bold">通知中心</span>
            <button
              className="text-[11px] font-bold text-leaf-600"
              onClick={() => api('/api/notifications', { method: 'POST', body: { markAllRead: true } }).then(load)}
            >
              全部已读
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 && <div className="p-8 text-center text-xs text-slate-400">暂无通知</div>}
            {notifs.map((n) => (
              <div key={n.id} className={`px-4 py-3 border-b border-slate-50 ${n.isRead ? '' : 'bg-leaf-50/40'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-leaf-500 shrink-0" />}
                  <span className="text-xs font-bold text-slate-800">{n.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleSwitcher() {
  const { user, users, switchUser } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-50 transition-colors">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-leaf-500 to-leaf-800 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold">
          {user.name.slice(0, 1)}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-slate-700 leading-tight">{user.name}</div>
          <div className="text-[10px] text-slate-400">{ROLE_LABEL[user.role]} · 切换角色</div>
        </div>
        <ChevronDown size={14} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">演示角色切换（多角色管理）</div>
          <div className="max-h-72 overflow-y-auto py-1">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  switchUser(u);
                  setOpen(false);
                  const home = ROLE_HOME[u.role] ?? '/dashboard';
                  if (pathname === home) router.refresh();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-leaf-50/50 transition-colors ${u.id === user.id ? 'bg-leaf-50' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500">
                  {u.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-700 truncate">{u.name}</div>
                  <div className="text-[10px] text-slate-400">{ROLE_LABEL[u.role]}{u.major ? ` · ${u.major}` : ''}</div>
                </div>
                {u.id === user.id && <span className="text-[10px] font-bold text-leaf-600">当前</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useUser();
  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.roles.includes(user.role)),
  })).filter((s) => s.items.length);

  return (
    <nav className="flex-1 px-4 py-2 space-y-5 overflow-y-auto scrollbar-hide">
      {sections.map((s) => (
        <div key={s.title}>
          <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.title}</div>
          <div className="space-y-0.5">
            {s.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                    active ? 'bg-leaf-600 text-white shadow-md shadow-leaf-200' : 'text-slate-600 hover:bg-leaf-50 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  // 角色切换后回到该角色首页
  useEffect(() => {
    const home = ROLE_HOME[user.role] ?? '/dashboard';
    if (pathname === '/dashboard' && user.role === 'teacher') router.replace('/dashboard/admin');
  }, [user.role]);

  const mobileItems = NAV_SECTIONS
    .map((s) => s.items.filter((i) => i.roles.includes(user.role)))
    .flat()
    .slice(0, 5);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* 桌面侧边栏 */}
      <aside className="w-60 bg-white border-r border-slate-100 hidden lg:flex flex-col">
        <div className="p-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-leaf-600 p-1.5 rounded-lg">
              <BrainCircuit className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-base">学学 2027 Pro</span>
          </Link>
        </div>
        <Sidebar />
        <div className="p-4 border-t border-slate-100">
          <div className="p-3 bg-gradient-to-br from-leaf-600 to-leaf-700 rounded-xl text-white">
            <p className="text-[11px] font-bold mb-0.5">🎯 2027 专升本冲刺</p>
            <p className="text-[10px] text-leaf-50/80">智能推荐 · 精准诊断 · 千人千面</p>
          </div>
        </div>
      </aside>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-2xl">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <span className="font-bold">学学 2027 Pro</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* 主区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 text-slate-600" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <UserIcon size={12} />
              <span>
                当前角色：<span className="font-bold text-leaf-600">{ROLE_LABEL[user.role]}</span>
                <span className="ml-1">（菜单级权限已按角色隔离）</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <RoleSwitcher />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 lg:pb-8">{children}</div>
      </div>

      {/* 移动端底部导航（多端适配） */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-30">
        {mobileItems.map((i) => {
          const active = pathname === i.href;
          return (
            <Link key={i.href} href={i.href} className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold ${active ? 'text-leaf-600' : 'text-slate-400'}`}>
              {i.icon}
              {i.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </UserProvider>
  );
}
