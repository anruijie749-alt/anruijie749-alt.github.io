// api/generate-plan.js
export default async function handler(req, res) {
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 这里的变量名和你在 Vercel 配置的“钥匙”一模一样
  const apiKey = process.env.ZHIPU_API_KEY; 
  if (!apiKey) {
    return res.status(500).json({ error: '后台未配置智谱AI密钥' });
  }

  try {
    const { prompt } = req.body;

    // 2. 携带密钥，在后端请求智谱大语言模型 (GLM-4)
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4.7-flash', // 使用智谱性价比最高的通用大模型
        messages: [{ role: 'user', content: prompt }],
        thinking: { type: 'disabled' },
        temperature: 0.7
    })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || '智谱接口调用失败' });
    }

    // 3. 把大模型的文本结果返回给前端
    const aiText = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误：' + error.message });
  }
}