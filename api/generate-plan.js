// api/generate-plan.js  (Vercel Serverless Function - Node.js)
export default async function handler(req, res) {
  // 允许跨域 / 处理浏览器 preflight 请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 1. 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. 读取 Vercel 环境变量里的智谱密钥（见下方说明）
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '后台未配置智谱AI密钥(ZHIPU_API_KEY)，请在 Vercel 环境变量中设置' });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: '缺少 prompt 参数' });
    }

    // 3. 加超时保护：最多等 9 秒，避免函数一直挂起导致前端出现 “Failed to fetch”
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    let response;
    try {
      response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          // 默认用智谱免费/稳定模型，可在 Vercel 用 ZHIPU_MODEL 覆盖
          model: process.env.ZHIPU_MODEL || 'glm-4-flash',
          messages: [{ role: 'user', content: String(prompt) }],
          temperature: 0.7
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: '智谱AI返回错误: ' + JSON.stringify(data).slice(0, 200) });
    }

    const aiText = data.choices?.[0]?.message?.content || '';
    if (!aiText) {
      return res.status(502).json({ error: '智谱AI未返回内容，请稍后重试' });
    }

    // 4. 把结果返回前端
    return res.status(200).json({ text: aiText });

  } catch (error) {
    if (error && error.name === 'AbortError') {
      return res.status(504).json({ error: '智谱AI响应超时(>9秒)，请稍后重试' });
    }
    return res.status(500).json({ error: '服务器内部错误：' + (error?.message || '未知错误') });
  }
}
