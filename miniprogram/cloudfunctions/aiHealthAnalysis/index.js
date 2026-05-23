// ============================================
// AI健康分析 v3.0 — 仅基于活动/跌倒数据
// ============================================

const cloud = require('wx-server-sdk')
const https = require('https')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-cd26758ee36043a69c24a9faba40f804'
const db = cloud.database()

exports.main = async (event) => {
  const { healthData } = event

  try {
    const stats = computeStats(healthData || [])
    const alerts = await fetchAlerts()

    if (!healthData || healthData.length < 5) {
      return { success: true, ...ruleResult(stats, alerts), dataPoints: stats.totalRecords, method: 'rules' }
    }

    // 有足够数据时调用 DeepSeek
    try {
      const aiResult = await callDeepSeek(stats, alerts)
      return { success: true, ...aiResult, dataPoints: stats.totalRecords, method: 'ai' }
    } catch (err) {
      console.warn('DeepSeek failed, fallback rules:', err.message)
      return { success: true, ...ruleResult(stats, alerts), dataPoints: stats.totalRecords, method: 'rules' }
    }
  } catch (err) {
    return { success: false, summary: '数据不足', riskLevel: '未知' }
  }
}

function computeStats(data) {
  if (!data.length) return { avgAcc: 0, maxAcc: 0, highAccCount: 0, totalRecords: 0, fallCount: 0, activeHours: 0 }

  const accs = data.filter(d => d.acc > 0).map(d => d.acc)
  const falls = data.filter(d => d.fallDetected).length
  const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0

  return {
    avgAcc: +avg(accs).toFixed(2), maxAcc: +Math.max(...accs).toFixed(2),
    highAccCount: data.filter(d => d.acc > 1.5).length,
    totalRecords: data.length, fallCount: falls
  }
}

async function fetchAlerts() {
  try {
    const week = new Date(Date.now() - 7*24*60*60*1000)
    return (await db.collection('alerts').where({ timestamp: db.command.gte(week) }).get()).data
  } catch { return [] }
}

function deepseekRequest(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, max_tokens: 600
    })
    const req = https.request({
      hostname: 'api.deepseek.com', path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}`, 'Content-Length': Buffer.byteLength(body) },
      timeout: 20000
    }, (res) => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => {
        try {
          const json = JSON.parse(d)
          const text = json.choices[0].message.content.trim()
          const m = text.match(/\{[\s\S]*\}/)
          resolve(JSON.parse(m ? m[0] : text))
        } catch(e) { reject(e) }
      })
    })
    req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.write(body); req.end()
  })
}

async function callDeepSeek(stats, alerts) {
  const falls = alerts.filter(a => a.type === 'fall').length
  const sos = alerts.filter(a => a.type === 'sos').length
  const prompt = `你是老年健康监护AI，分析以下7天活动监测数据，输出JSON：

## 数据概况
- 记录数: ${stats.totalRecords}条
- 平均加速度: ${stats.avgAcc}g（正常<1.5g）
- 加速度峰值: ${stats.maxAcc}g
- 高活动事件(>1.5g): ${stats.highAccCount}次
- 跌倒事件: ${stats.fallCount}次
## 告警
- 跌倒告警: ${falls}次 | SOS求救: ${sos}次

严格输出JSON：
{"summary":"30字内评估","detail":"150字活动分析","riskLevel":"低/中/高","stepStability":"稳定/需关注/建议就医","suggestions":"3条建议"}

注意：
- 加速度峰值>2.5g或跌倒>0 → 风险至少为"中"
- 建议要可操作，如"居家加装扶手"、"增加日间巡查"等`

  const result = await deepseekRequest(prompt)
  result.avgAcc = stats.avgAcc
  result.highAccCount = stats.highAccCount
  result.alertCount = falls + sos
  result._method = 'ai'
  return result
}

function ruleResult(stats, alerts) {
  const falls = alerts.filter(a => a.type === 'fall').length
  const sos = alerts.filter(a => a.type === 'sos').length

  if (falls > 0 || stats.maxAcc > 2.5) return {
    summary: `本周活动监测发现${falls}次跌倒，加速度峰值${stats.maxAcc}g，需重视。`,
    detail: `高活动事件${stats.highAccCount}次，步态稳定性下降。建议尽快评估居家安全。`,
    riskLevel: '高', stepStability: '建议就医',
    suggestions: '立即联系医生评估跌倒风险；居家加装扶手和防滑垫；确保紧急设备随身佩戴；家属增加巡查频率。',
    avgAcc: stats.avgAcc, highAccCount: stats.highAccCount, alertCount: falls + sos
  }
  if (stats.highAccCount > 10 || stats.maxAcc > 2.0) return {
    summary: `本周活动水平偏高，${stats.highAccCount}次高强度活动，建议关注。`,
    detail: `加速度峰值${stats.maxAcc}g，老人活动量偏大。建议优化居家环境减少不必要的剧烈运动。`,
    riskLevel: '中', stepStability: '需关注',
    suggestions: '检查居家通道是否通畅；移除地毯等绊倒隐患；鼓励规律作息；关注老人活动习惯。',
    avgAcc: stats.avgAcc, highAccCount: stats.highAccCount, alertCount: falls + sos
  }
  return {
    summary: `本周活动状态平稳，未发现异常活动或跌倒事件。`,
    detail: `平均加速度${stats.avgAcc}g，活动规律正常。继续保持现有的看护节奏。`,
    riskLevel: '低', stepStability: '稳定',
    suggestions: '保持适度日常活动；定期检查居住环境安全；维持规律作息；季节变化注意防滑。',
    avgAcc: stats.avgAcc, highAccCount: stats.highAccCount, alertCount: falls + sos
  }
}
