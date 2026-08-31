/** 服务端 CSV 生成（含 BOM 以便 Excel 打开中文不乱码） */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  return '\uFEFF' + lines.join('\n');
}

export function csvResponse(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  return new Response(toCsv(headers, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/** 手机号脱敏：138****8888 */
export function maskPhone(p: string | null | undefined): string {
  if (!p || p.length < 7) return p ?? '';
  return p.slice(0, 3) + '****' + p.slice(-4);
}
