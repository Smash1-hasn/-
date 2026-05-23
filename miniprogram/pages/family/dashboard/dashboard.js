const app = getApp()

Page({
  data: {
    nickname: '', greetingTime: '',
    deviceOnline: false, lastSeen: '',
    recentAlerts: [], unreadAlerts: 0, loading: true,
    dailyReport: ''
  },

  onLoad() {
    const ui = app.globalData.userInfo
    const h = new Date().getHours()
    const gt = h<6?'夜深了':h<9?'早上好':h<12?'上午好':h<14?'中午好':h<18?'下午好':'晚上好'
    this.setData({ nickname: ui?.nickName || '家人', greetingTime: gt })
  },

  onShow() {
    this.checkDevice(); this.loadRecentAlerts(); this.loadDailyReport()
    this.data._timer = setInterval(() => { this.checkDevice(); this.loadRecentAlerts() }, 8000)
  },
  onHide() { if (this.data._timer) clearInterval(this.data._timer) },

  // 检查语音设备
  checkDevice() {
    wx.cloud.database().collection('devices').where({ deviceId: '001' }).limit(1).get()
      .then(res => {
        if (res.data.length > 0) {
          const d = res.data[0]
          const minutesAgo = d.lastSeen ? (Date.now() - new Date(d.lastSeen).getTime()) / 60000 : 999
          const t = d.lastSeen ? new Date(d.lastSeen) : null
          const timeStr = t ? t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0') : ''
          this.setData({
            deviceOnline: d.status === 'online' && minutesAgo < 5,
            lastSeen: timeStr,
            statusText: d.status === 'online' ? '在线' : '离线',
            statusClass: d.status === 'online' ? 'online' : 'offline',
            loading: false
          })
        } else {
          this.setData({ loading: false })
        }
      }).catch(() => { this.setData({ loading: false }) })
  },

  // 最近告警
  loadRecentAlerts() {
    wx.cloud.database().collection('alerts').orderBy('timestamp','desc').limit(3).get()
      .then(res => {
        const alerts = res.data.map(a => ({ ...a, time: this.fmt(a.timestamp) }))
        this.setData({ recentAlerts: alerts, unreadAlerts: res.data.filter(a=>!a.handled).length })
      }).catch(() => {})
  },

  // AI 日报
  loadDailyReport() {
    const db = wx.cloud.database()
    const today = new Date(); today.setHours(0,0,0,0)
    db.collection('messages').where({ createTime: db.command.gte(today) }).count()
      .then(res => {
        const voiceMsgs = res.total || 0
        db.collection('alerts').where({ timestamp: db.command.gte(today) }).count()
          .then(r2 => {
            const alerts = r2.total || 0
            if (voiceMsgs === 0 && alerts === 0) {
              this.setData({ dailyReport: '今日暂无语音消息和告警，设备正常运行中。' })
              return
            }
            const prompt = `根据今天数据生成2句日报：语音消息${voiceMsgs}条，告警${alerts}次。口语化，有温度，30字内。`
            wx.request({
              url: 'https://api.deepseek.com/v1/chat/completions', method: 'POST',
              header: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-cd26758ee36043a69c24a9faba40f804' },
              data: { model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 100 },
              success: (r) => {
                if (r.data?.choices) this.setData({ dailyReport: r.data.choices[0].message.content.trim() })
              },
              fail: () => {
                let report = `今日语音消息${voiceMsgs}条。`
                if (alerts > 0) report += `告警${alerts}次，请关注。`
                else report += '一切正常。'
                this.setData({ dailyReport: report })
              }
            })
          })
      }).catch(() => { this.setData({ dailyReport: '数据加载中...' }) })
  },

  goMonitor() { wx.switchTab({ url: '/pages/family/monitor/monitor' }) },
  goAlerts() { wx.switchTab({ url: '/pages/family/alerts/alerts' }) },
  goAIQA() { wx.navigateTo({ url: '/pages/family/ai-qa/ai-qa' }) },
  goMessages() { wx.navigateTo({ url: '/pages/family/messages/messages' }) },
  goReminders() { wx.navigateTo({ url: '/pages/family/reminders/reminders' }) },
  goReport() { wx.switchTab({ url: '/pages/family/report/report' }) },

  switchRole() {
    wx.showModal({
      title: '切换角色', content: '返回重新选择？',
      success: (r) => {
        if (r.confirm) {
          wx.removeStorageSync('userInfo'); app.globalData.userInfo = null; app.globalData.isLoggedIn = false
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  },

  fmt(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }
})
