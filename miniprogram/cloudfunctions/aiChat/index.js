// ============================================
// AI Chat 云函数 v1.1 (使用 https 模块)
// ============================================

const cloud = require('wx-server-sdk')
const https = require('https')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-cd26758ee36043a69c24a9faba40f804'

function deepseekRequest(messages, temperature, maxTokens) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: maxTokens
    })

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 15000
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content.trim())
          } else {
            reject(new Error(json.error?.message || 'Empty response'))
          }
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.write(body)
    req.end()
  })
}

exports.main = async (event) => {
  const { type, message } = event

  const systemPrompt = type === 'chat'
    ? `你是"小安"，一个温暖贴心的AI陪聊助手，专门陪伴老年人。
性格：和蔼可亲、像对待长辈一样尊重。
规则：
- 每次回复2-4句话，简短温馨
- 像晚辈一样关心老人身体和心情
- 可以讲笑话、聊养生、谈生活趣事
- 如果老人说身体不舒服，温和提醒联系家人
- 用通俗易懂的口语，不用书面语`
    : `你是健康问答助手。
规则：
- 回答前先说"以下内容仅供参考，不构成医疗诊断"
- 通俗易懂、具体可操作
- 紧急情况强调立即就医
- 不推荐具体药物`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ]

  try {
    const reply = await deepseekRequest(messages, type === 'chat' ? 0.7 : 0.3, type === 'chat' ? 400 : 600)
    return { success: true, reply, timestamp: new Date().toISOString() }
  } catch (err) {
    console.error('[aiChat] DeepSeek error:', err.message)
    const fallback = type === 'chat'
      ? '小安今天有点累了，您先休息一会儿。有什么需要随时联系家人哦~'
      : '抱歉，健康问答暂时繁忙。紧急情况请直接就医或联系家人。'
    return { success: true, reply: fallback, fallback: true, timestamp: new Date().toISOString() }
  }
}
