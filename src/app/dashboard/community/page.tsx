'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Heart, Send, Plus, Flag, ChevronDown, X } from 'lucide-react';
import { api, fmtDateTime } from '@/lib/client';
import { useUser } from '@/lib/user-context';

const CATEGORIES = [
  ['all', '全部'], ['math', '数学答疑'], ['english', '英语答疑'], ['study', '学习方法'], ['share', '资料分享'], ['general', '综合'],
] as const;

export default function CommunityPage() {
  const { user } = useUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [cat, setCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formCat, setFormCat] = useState('math');
  const [openPost, setOpenPost] = useState<number | null>(null);
  const [postDetail, setPostDetail] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [reportTarget, setReportTarget] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    api(`/api/posts${cat === 'all' ? '' : `?category=${cat}`}`).then(setPosts).catch(() => {});
  };
  useEffect(load, [cat]);

  const openDetail = async (id: number) => {
    if (openPost === id) { setOpenPost(null); setPostDetail(null); return; }
    setOpenPost(id);
    setPostDetail(await api(`/api/posts/${id}`).catch(() => null));
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    await api('/api/posts', { method: 'POST', body: { title, content, category: formCat } }).catch((e) => setNotice(e.message));
    setTitle(''); setContent(''); setShowForm(false); setNotice('');
    load();
  };

  const toggleLike = async (id: number) => {
    await api(`/api/posts/${id}/like`, { method: 'POST' }).catch(() => {});
    load();
  };

  const submitReply = async (postId: number) => {
    if (!reply.trim()) return;
    await api(`/api/posts/${postId}/reply`, { method: 'POST', body: { content: reply } }).catch((e) => setNotice(e.message));
    setReply('');
    setPostDetail(await api(`/api/posts/${postId}`).catch(() => null));
    load();
  };

  const submitReport = async () => {
    if (!reportTarget || !reportReason.trim()) return;
    await api(`/api/posts/${reportTarget}/report`, { method: 'POST', body: { reason: reportReason } }).catch((e) => setNotice(e.message));
    setReportTarget(null); setReportReason('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3"><MessageSquare className="text-leaf-600" /> 备考社区</h2>
          <p className="text-slate-500 text-sm mt-1">课程级 / 班级级讨论 · 回帖 · 点赞 · 举报</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 bg-leaf-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-leaf-700">
          <Plus size={15} /> 发布新帖
        </button>
      </div>

      {/* 分类 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(([v, label]) => (
          <button key={v} onClick={() => setCat(v)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${cat === v ? 'bg-leaf-600 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 发帖表单 */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-leaf-100 p-6 shadow-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" className="md:col-span-2 p-3 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-leaf-500" />
            <select value={formCat} onChange={(e) => setFormCat(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-sm border border-slate-100">
              {CATEGORIES.filter(([v]) => v !== 'all').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="正文内容…" className="w-full h-24 p-3 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-leaf-500 resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-400">取消</button>
            <button onClick={submit} className="px-5 py-2 bg-leaf-600 text-white text-xs font-bold rounded-xl hover:bg-leaf-700">发布</button>
          </div>
        </div>
      )}
      {notice && <p className="text-xs font-bold text-red-500">{notice}</p>}

      {/* 帖子列表 */}
      <div className="space-y-4">
        {posts.length === 0 && <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-300 text-sm">该分类下暂无帖子</div>}
        {posts.map((p) => (
          <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <button onClick={() => openDetail(p.id)} className="w-full p-6 text-left hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-leaf-400 to-leaf-700 text-white text-xs font-bold flex items-center justify-center">{p.userName.slice(0, 1)}</span>
                <div>
                  <div className="text-xs font-bold text-slate-700">{p.userName}</div>
                  <div className="text-[10px] text-slate-300">{fmtDateTime(p.createdAt)}</div>
                </div>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full">
                  {CATEGORIES.find(([v]) => v === p.category)?.[1] ?? p.category}
                </span>
              </div>
              <h3 className="font-bold text-slate-800 mb-1.5">{p.title}</h3>
              <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed">{p.content}</p>
            </button>
            <div className="px-6 pb-5 flex items-center gap-4">
              <button onClick={() => toggleLike(p.id)} className={`flex items-center gap-1.5 text-xs font-bold ${p.liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'}`}>
                <Heart size={15} fill={p.liked ? 'currentColor' : 'none'} /> {p.likeCount}
              </button>
              <button onClick={() => openDetail(p.id)} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-leaf-600">
                <MessageSquare size={15} /> {p.replyCount}
                <ChevronDown size={12} className={`transition-transform ${openPost === p.id ? 'rotate-180' : ''}`} />
              </button>
              <button onClick={() => setReportTarget(p.id)} className="ml-auto flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-amber-500">
                <Flag size={12} /> 举报
              </button>
            </div>

            {/* 回帖区 */}
            {openPost === p.id && postDetail && (
              <div className="px-6 pb-6 border-t border-slate-50 pt-5 space-y-4">
                {postDetail.replies.length === 0 && <p className="text-xs text-slate-300">还没有回帖，来抢沙发～</p>}
                {postDetail.replies.map((r: any) => (
                  <div key={r.id} className="flex gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">{r.userName.slice(0, 1)}</span>
                    <div className="flex-1">
                      <div className="text-[11px] font-bold text-slate-600">{r.userName} <span className="text-slate-300 font-normal ml-1">{fmtDateTime(r.createdAt)}</span></div>
                      <div className="mt-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl rounded-tl-none leading-relaxed">{r.content}</div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitReply(p.id)}
                    placeholder={`以 ${user.name} 的身份回帖…`}
                    className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-leaf-500"
                  />
                  <button onClick={() => submitReply(p.id)} className="px-4 bg-leaf-600 text-white rounded-2xl"><Send size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 举报弹窗 */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setReportTarget(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm">举报帖子</h3>
              <button onClick={() => setReportTarget(null)} className="text-slate-300"><X size={16} /></button>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">举报后平台将安排人工审核（演示环境）。</p>
            <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="举报原因…" className="w-full h-20 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setReportTarget(null)} className="px-4 py-2 text-xs font-bold text-slate-400">取消</button>
              <button onClick={submitReport} className="px-5 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600">提交举报</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
