// api/generate-plan.js  (Vercel Edge Function - 流式输出)
// 改造说明：从 Node Serverless(10秒硬限制) 改为 Edge Runtime(25秒上限)+流式转发，
// 解决"智谱AI响应超时(>9秒)"导致生成失败的问题。内容长度不变(仍生成完整方案)。
export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS)
  });
}

export default async function handler(req) {
  // 处理浏览器 preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // 1. 只允许 POST
  if (req.method !== 'POST') {
    return jsonError('Method Not Allowed', 405);
  }

  // 2. 读取环境变量里的智谱密钥
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    return jsonError('后台未配置智谱AI密钥(ZHIPU_API_KEY)，请在 Vercel 环境变量中设置', 500);
  }

  // 3. 读取 prompt
  let prompt = '';
  try {
    const body = await req.json();
    prompt = body && body.prompt ? String(body.prompt) : '';
  } catch (e) {
    return jsonError('请求体解析失败，请确认发送的是 JSON', 400);
  }
  if (!prompt.trim()) {
    return jsonError('缺少 prompt 参数', 400);
  }

  // 4. 调智谱流式接口（首字节超时 20 秒保护；Edge 运行时可跑 25 秒）
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  let upstream;
  try {
    upstream = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: process.env.ZHIPU_MODEL || 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        stream: true
      }),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') {
      return jsonError('智谱AI连接超时(>20秒)，请稍后重试', 504);
    }
    return jsonError('无法连接智谱AI服务：' + (err && err.message ? err.message : '未知错误'), 502);
  }
  clearTimeout(timer);
  // 注意：定时器只保护"建立连接+首字节"，流式传输阶段由 Edge 运行时上限保障

  if (!upstream.ok) {
    const raw = await upstream.text().catch(() => '');
    return jsonError('智谱AI返回错误: ' + raw.slice(0, 200), upstream.status || 502);
  }
  if (!upstream.body) {
    return jsonError('智谱AI未返回内容，请稍后重试', 502);
  }

  // 5. 把智谱的 SSE 流转成纯文本流，边收边推给前端
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(streamController) {
      const reader = upstream.body.getReader();
      let buffer = '';
      let sentAny = false;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.indexOf('data:') !== 0) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta
                ? (parsed.choices[0].delta.content || '')
                : '';
              if (delta) {
                streamController.enqueue(encoder.encode(delta));
                sentAny = true;
              }
            } catch (e) {
              // 忽略单个分片解析错误，继续流转
            }
          }
        }
        if (!sentAny) {
          streamController.enqueue(encoder.encode('（本次未生成内容，请稍后重试）'));
        }
      } catch (e) {
        // 流中断：把已收到的内容留给前端，不抛错中断响应
      } finally {
        try { streamController.close(); } catch (e) {}
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: Object.assign({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }, CORS_HEADERS)
  });
}
