/**
 * Web 采集适配器（「全网资源」层）
 * --------------------------------
 * 通用抓取 → 解析 → 归一化为平台资源卡（resources 表格式）。
 * 内置两个真实公开数据源（免鉴权）：
 *   1. npm-registry   —— 大数据技术方向开源生态库元数据 → 专业方向资料卡
 *   2. github-search  —— 专升本公开学习资源仓库 → 备考资料卡
 * 网络不可达/超时 → status: 'degraded'（降级：本地参数化生成器兜底，
 * 流程不中断 —— 鲁棒性设计）
 */

export type WebResource = {
  title: string;
  type: 'video' | 'slide' | 'ebook' | 'lab';
  subject: string;
  description: string;
  tags: string[];
  url: string;
  instructor: string;
  difficulty: number;
};

export type WebSourceStatus = {
  id: string;
  name: string;
  kind: string;
  status: 'ok' | 'degraded' | 'failed';
  fetched: number;
  error?: string;
};

const TIMEOUT_MS = 8000;

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'xuex-sync/1.0 (educational resource collector)' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** 大数据技术方向开源生态（专业方向资源：升学后的技术栈预览） */
const NPM_BIGDATA = ['elasticsearch', 'node-rdkafka', 'ioredis', 'cassandra-driver', 'mongodb'] as const;
const PKG_CN: Record<string, string> = {
  elasticsearch: 'Elasticsearch 分布式检索引擎',
  'node-rdkafka': 'Kafka 消息队列客户端',
  ioredis: 'Redis 缓存数据库客户端',
  'cassandra-driver': 'Cassandra 分布式数据库驱动',
  mongodb: 'MongoDB 文档数据库驱动',
};

/** 专升本公开学习资源 GitHub 检索词（按学科） */
const GITHUB_QUERIES: Array<{ q: string; subject: string; cn: string }> = [
  { q: '专升本 数学', subject: 'Math', cn: '专升本·数学' },
  { q: '专升本 英语', subject: 'English', cn: '专升本·英语' },
];

async function collectNpm(): Promise<{ items: WebResource[]; fetched: number }> {
  const items: WebResource[] = [];
  let fetched = 0;
  for (const pkg of NPM_BIGDATA) {
    fetched++;
    try {
      const d = (await fetchJson(`https://registry.npmjs.org/${pkg}`)) as {
        description?: string;
        'dist-tags'?: Record<string, string>;
        homepage?: string;
        repository?: { url?: string };
      };
      const version = d['dist-tags']?.latest ?? '';
      items.push({
        title: `${PKG_CN[pkg] ?? pkg}（开源生态）`,
        type: 'slide',
        subject: 'BigData',
        description: `${pkg}@${version}：${d.description ?? '大数据技术方向核心开源组件'}。用于升学后的专业方向预习与技术栈认知。`,
        tags: ['大数据技术', '开源生态', '专业方向', pkg],
        url: d.repository?.url?.replace('git+', '').replace('.git', '') ?? d.homepage ?? `https://www.npmjs.com/package/${pkg}`,
        instructor: '开源社区',
        difficulty: 2,
      });
    } catch {
      // 单个包失败不影响整体（鲁棒）
    }
  }
  return { items, fetched };
}

async function collectGithub(): Promise<{ items: WebResource[]; fetched: number }> {
  const items: WebResource[] = [];
  let fetched = 0;
  for (const { q, subject, cn } of GITHUB_QUERIES) {
    fetched++;
    try {
      const d = (await fetchJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=3`)) as {
        items?: Array<{ full_name: string; description: string | null; html_url: string; stargazers_count: number }>;
      };
      for (const it of (d.items ?? []).slice(0, 3)) {
        items.push({
          title: `公开资料库：${it.full_name.split('/')[1]}`,
          type: 'ebook',
          subject,
          description: `来自 GitHub 的公开学习资源（★${it.stargazers_count}）。${it.description ?? ''}`.slice(0, 200),
          tags: [cn, '公开资源', 'GitHub', '备考资料'],
          url: it.html_url,
          instructor: '社区贡献',
          difficulty: 2,
        });
      }
    } catch {
      // 单查询失败不影响整体
    }
  }
  return { items, fetched };
}

export type WebRunResult = { items: WebResource[]; statuses: WebSourceStatus[] };

/** 执行全部 web 源采集；任一源失败自动降级，不抛错 */
export async function collectWebResources(): Promise<WebRunResult> {
  const statuses: WebSourceStatus[] = [];
  const items: WebResource[] = [];

  try {
    const r = await collectNpm();
    items.push(...r.items);
    statuses.push({ id: 'npm-registry', name: 'npm 公开注册表（大数据生态）', kind: 'json', status: r.items.length ? 'ok' : 'degraded', fetched: r.fetched, error: r.items.length ? undefined : '未获取到可用包元数据' });
  } catch (e) {
    statuses.push({ id: 'npm-registry', name: 'npm 公开注册表（大数据生态）', kind: 'json', status: 'failed', fetched: 0, error: e instanceof Error ? e.message : String(e) });
  }

  try {
    const r = await collectGithub();
    items.push(...r.items);
    statuses.push({ id: 'github-search', name: 'GitHub 公开学习资源检索', kind: 'json', status: r.items.length ? 'ok' : 'degraded', fetched: r.fetched, error: r.items.length ? undefined : '未检索到可用仓库' });
  } catch (e) {
    statuses.push({ id: 'github-search', name: 'GitHub 公开学习资源检索', kind: 'json', status: 'failed', fetched: 0, error: e instanceof Error ? e.message : String(e) });
  }

  return { items, statuses };
}
