const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  console.log('RAW EVENT:', JSON.stringify(event))

  // HTTP 触发兼容两种格式
  let params = event
  if (typeof event.body === 'string') {
    try { params = JSON.parse(event.body) } catch(e) {}
  }
  console.log('PARSED:', JSON.stringify(params))

  const { deviceId, type } = params
  const rawText = params.text || ''
  const map = { help:'救命', fell:'我摔倒了', ok:'我很好', miss:'想你们了', pill:'该吃药了' }
  const text = map[rawText] || rawText
  const ts = new Date()

  try {
    const did = deviceId || '001'

    // 设备状态
    const dev = await db.collection('devices').where({ deviceId: did }).get()
    if (dev.data.length > 0) {
      await db.collection('devices').doc(dev.data[0]._id).update({ data: { status: 'online', lastSeen: ts } })
    } else {
      await db.collection('devices').add({ data: { deviceId: did, status: 'online', lastSeen: ts } })
    }

    // 服务端判断是否为 SOS（不依赖 ESP32 的 type 字段）
    const isSOS = type === 'voice_sos' ||
      (text && (text == 'help' || text == 'fell' ||
                text.indexOf('救命') >= 0 || text.indexOf('摔倒') >= 0 ||
                text.indexOf('救我') >= 0));

    // SOS → 告警
    if (isSOS && text) {
      try {
        const r = await db.collection('alerts').add({
          data: { deviceId: did, type: 'voice_sos', level: 'critical', message: '语音求救: ' + text, handled: false, timestamp: ts }
        })
        console.log('ALERT WRITTEN:', r._id)
      } catch(e) {
        console.error('ALERT WRITE FAILED:', e.message)
      }
    }

    // 非SOS → 留言
    if (!isSOS && text) {
      try {
        const r = await db.collection('messages').add({
          data: { type: 'voice', content: text, fromRole: 'elderly', fromUser: '老人(语音)', createTime: ts }
        })
        console.log('MSG WRITTEN:', r._id)
      } catch(e) {
        console.error('MSG WRITE FAILED:', e.message)
      }
    }

    console.log('DONE:', type, text)
    return { success: true, type: type || 'unknown' }

  } catch (err) {
    console.error('ERROR:', err.message)
    return { success: false, error: err.message }
  }
}
