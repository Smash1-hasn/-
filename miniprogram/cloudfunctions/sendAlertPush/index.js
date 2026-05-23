// ============================================
// 告警推送云函数
// 数据库触发器: alerts 表新增记录时自动推送
// ============================================

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  console.log('[sendAlertPush] Triggered:', JSON.stringify(event))

  // 仅处理新增（create）
  if (event.type !== 'create') {
    return { success: false, message: 'Not a create event' }
  }

  try {
    const alert = event.data
    const { type, level, message, timestamp } = alert

    const db = cloud.database()
    const familyUsers = await db.collection('users').where({ role: 'family' }).get()

    if (familyUsers.data.length === 0) {
      return { success: true, message: 'No family users' }
    }

    const openids = familyUsers.data.map(u => u._openid).filter(Boolean)

    const typeMap = {
      fall: '跌倒告警', sos: 'SOS紧急求救', voice_sos: '语音求救',
      device_offline: '设备离线'
    }

    const pushTitle = typeMap[type] || '安全告警'

    // 使用统一消息推送
    for (const openid of openids) {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: openid,
          templateId: '你的模板ID',  // 需要在微信公众平台申请消息模板
          data: {
            thing1: { value: pushTitle },
            thing2: { value: (message || '').substring(0, 20) },
            time3: { value: new Date(timestamp).toLocaleString('zh-CN') },
            thing4: { value: level === 'critical' ? '紧急' : '提醒' }
          }
        })
        console.log(`[sendAlertPush] 推送成功: ${openid}`)
      } catch (pushErr) {
        console.warn(`[sendAlertPush] 推送失败 (${openid}):`, pushErr.errMsg || pushErr.message)
        // 继续给其他用户推送，不中断
      }
    }

    return {
      success: true,
      message: `已向${openids.length}位家人推送告警`,
      alertType: type
    }

  } catch (err) {
    console.error('[sendAlertPush] Error:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
