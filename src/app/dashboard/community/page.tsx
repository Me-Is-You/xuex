import React from 'react';
import { MessageSquare, Users, Heart, Share2, Search } from 'lucide-react';

export default function CommunityPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">备考社区</h2>
          <p className="text-slate-500">与 2027 届的战友们一起进步</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="搜索讨论帖子..." 
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 text-sm"
            />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold">发帖</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <PostCard 
            author="李华 (大数据技术)" 
            time="2 小时前"
            title="分享一下我总结的 2027 年高数必考极限公式"
            content="根据最新的考纲要求，这几个极限公式的推导过程非常关键..."
            likes={24}
            comments={8}
          />
          <PostCard 
            author="张伟" 
            time="5 小时前"
            title="英语词汇书推荐：红宝书还是绿宝书？"
            content="我是零基础入手的，感觉红宝书的例句比较好懂..."
            likes={12}
            comments={15}
          />
          <PostCard 
            author="王芳" 
            time="昨天"
            title="理科生如何分配数学和英语的学习时间？"
            content="每天花 4 小时在数学上会不会太多了？感觉英语也落下了..."
            likes={45}
            comments={32}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              活跃小组
            </h3>
            <div className="space-y-4">
              <GroupItem name="2027 高数突击队" members="1.2k" />
              <GroupItem name="英语口语与作文" members="850" />
              <GroupItem name="大数据专业课研讨" members="420" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-white">
            <h3 className="font-bold mb-2">加入官方群</h3>
            <p className="text-indigo-100 text-xs mb-4">获取第一手考试动态与政策解读。</p>
            <div className="bg-white/10 p-4 rounded-xl text-center backdrop-blur-sm">
              <div className="text-xs font-medium text-indigo-200">群号</div>
              <div className="text-xl font-black">987654321</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ author, time, title, content, likes, comments }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
          {author[0]}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-800">{author}</div>
          <div className="text-[10px] text-slate-400">{time}</div>
        </div>
      </div>
      <h4 className="text-lg font-bold mb-2 text-slate-900">{title}</h4>
      <p className="text-slate-500 text-sm mb-4 line-clamp-2">{content}</p>
      <div className="flex items-center gap-6 text-slate-400">
        <div className="flex items-center gap-1 hover:text-red-500 transition-colors">
          <Heart size={16} />
          <span className="text-xs font-bold">{likes}</span>
        </div>
        <div className="flex items-center gap-1 hover:text-blue-500 transition-colors">
          <MessageSquare size={16} />
          <span className="text-xs font-bold">{comments}</span>
        </div>
        <div className="flex items-center gap-1 hover:text-slate-600 transition-colors ml-auto">
          <Share2 size={16} />
        </div>
      </div>
    </div>
  );
}

function GroupItem({ name, members }: { name: string, members: string }) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">{name}</span>
      <span className="text-[10px] font-bold text-slate-400">{members} 位成员</span>
    </div>
  );
}
