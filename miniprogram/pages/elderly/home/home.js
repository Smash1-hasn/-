const app = getApp()

Page({
  data: {
    deviceOnline: false,
    lastUpdate: '',
    lastVoice: '',
    sosActive: false,
    upcomingReminder: null, reminderActive: false,
    latestMessage: null,
    weatherTip: ''
  },

  onLoad() {
    this.loadWeather()
    this.startRefresh()
  },

  onShow() {
    this.checkDevice()
    this.loadReminders()
    this.loadMessages()
  },

  onHide() { this.stopRefresh() },
  onUnload() { this.stopRefresh() },

  startRefresh() {
    this.checkDevice()
    this.data._timer = setInterval(() => {
      this.checkDevice()
      this.loadReminders()
    }, 10000)
  },

  stopRefresh() {
    if (this.data._timer) { clearInterval(this.data._timer) }
  },

  // 检查语音设备在线
  checkDevice() {
    const db = wx.cloud.database()
    db.collection('devices').where({ deviceId: '001' }).limit(1).get()
      .then(res => {
        if (res.data.length > 0) {
          const d = res.data[0]
          const minutesAgo = d.lastSeen ? (Date.now() - new Date(d.lastSeen).getTime()) / 60000 : 999
          const online = d.status === 'online' && minutesAgo < 5
          const t = d.lastSeen ? new Date(d.lastSeen) : new Date()
          const timeStr = t.getHours().toString().padStart(2,'0') + ':' + t.getMinutes().toString().padStart(2,'0')
          let lv = ''
          if (d.lastVoice && d.lastVoiceTime) {
            const diff = Date.now() - new Date(d.lastVoiceTime).getTime()
            if (diff < 300000) lv = '"' + d.lastVoice + '" 已发送给家人 ✓'
          }
          this.setData({ deviceOnline: online, lastUpdate: timeStr, lastVoice: lv })
        }
      }).catch(() => {})
  },

  // 用药提醒
  loadReminders() {
    const db = wx.cloud.database()
    const today = new Date().toISOString().slice(0, 10)
    db.collection('reminders').where({ active: true }).orderBy('time', 'asc').get()
      .then(res => {
        const now = new Date()
        const ct = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0')
        const up = res.data.find(r => !(r.takenDates||[]).includes(today) && r.time >= ct) || null
        this.setData({ upcomingReminder: up })
        if (up && ct >= up.time && !(up.takenDates||[]).includes(today)) {
          if (!this._lastRemind || Date.now() - this._lastRemind > 60000) {
            this._lastRemind = Date.now()
            this.setData({ reminderActive: true }); wx.vibrateShort()
            wx.showToast({ title: `💊 该吃${up.medName}了`, icon: 'none', duration: 5000 })
            setTimeout(() => this.setData({ reminderActive: false }), 3000)
          }
        }
      }).catch(() => {})
  },

  markTaken() {
    const r = this.data.upcomingReminder
    if (!r) return
    const today = new Date().toISOString().slice(0, 10)
    wx.cloud.database().collection('reminders').doc(r._id).update({
      data: { takenDates: [...(r.takenDates||[]), today] }
    }).then(() => {
      wx.showToast({ title: '已服', icon: 'success' })
      this.setData({ upcomingReminder: null, reminderActive: false })
    })
  },

  // 留言
  loadMessages() {
    wx.cloud.database().collection('messages')
      .where({ fromRole: 'family' }).orderBy('createTime', 'desc').limit(1).get()
      .then(res => {
        if (res.data.length > 0) {
          const m = res.data[0]
          const diff = Date.now() - new Date(m.createTime).getTime()
          let ts = '刚刚'
          if (diff > 3600000) ts = Math.floor(diff/3600000)+'小时前'
          if (diff > 86400000) ts = Math.floor(diff/86400000)+'天前'
          this.setData({ latestMessage: { ...m, timeStr: ts } })
        }
      }).catch(() => {})
  },

  // 天气
  loadWeather() {
    wx.request({
      url: 'https://wttr.in?format=%C', timeout: 5000,
      success: (res) => {
        const c = (res.data||'').toLowerCase()
        let tip = ''
        if (c.includes('rain')) tip = '🌧 今日有雨，注意防滑'
        else if (c.includes('snow')) tip = '❄️ 今日有雪，谨慎外出'
        else if (c.includes('wind')) tip = '💨 今日风大，注意安全'
        else if (c.includes('sunny')||c.includes('clear')) tip = '☀️ 今日晴天，适合晒太阳'
        else tip = '🌤 注意天气变化'
        this.setData({ weatherTip: tip })
      }
    })
  },

  // SOS
  onSOSPress() {
    this.setData({ sosActive: true }); wx.vibrateShort()
    wx.showModal({
      title: '🚨 确认求救', content: '即将向紧急联系人发送求救信号',
      confirmText: '确定求救', cancelText: '取消', confirmColor: '#FF4D4F',
      success: (r) => {
        this.setData({ sosActive: false })
        if (r.confirm) {
          wx.showLoading({ title: '正在求救...' })
          wx.cloud.database().collection('alerts').add({
            data: { type: 'sos', level: 'critical', message: '老人触发SOS求救', handled: false, timestamp: new Date() }
          }).then(() => {
            wx.hideLoading(); wx.showToast({ title: '已发送', icon: 'success', duration: 3000 }); wx.vibrateLong()
            this.makeCall()
          }).catch(() => { wx.hideLoading(); wx.showToast({ title: '已发送', icon: 'success' }) })
        }
      }
    })
  },

  makeCall() {
    wx.cloud.database().collection('emergencyContacts').orderBy('priority','asc').limit(1).get()
      .then(res => {
        if (res.data.length > 0) {
          const c = res.data[0]
          wx.showModal({
            title: `📞 ${c.name}`, content: `拨打: ${c.phone}`,
            confirmText: '拨打', cancelText: '取消',
            success: (r) => { if (r.confirm) wx.makePhoneCall({ phoneNumber: c.phone }) }
          })
        } else {
          wx.showModal({ title: '未设置紧急联系人', showCancel: false, confirmText: '我知道了' })
        }
      }).catch(() => {})
  },

  goBack() {
    wx.showActionSheet({
      itemList: ['更换配对码', '切换角色'],
      success: (r) => {
        if (r.tapIndex === 0) {
          const ui = wx.getStorageSync('userInfo') || {}
          ui.familyGroupId = ''; wx.setStorageSync('userInfo', ui)
          wx.redirectTo({ url: '/pages/elderly/code/code' })
        } else if (r.tapIndex === 1) {
          wx.removeStorageSync('userInfo')
          app.globalData.userInfo = null; app.globalData.isLoggedIn = false
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  },

  goChat() { wx.navigateTo({ url: '/pages/elderly/chat/chat' }) },
  goGames() { wx.navigateTo({ url: '/pages/elderly/games/games' }) },
  goTips() {
    const tips = ['每天喝6-8杯温水💧','饭后散步20分钟🚶','午休半小时😴','多吃蔬菜🥬','保持好心情😊']
    wx.showModal({ title: '💡 健康贴士', content: tips[Math.floor(Math.random()*tips.length)], showCancel: false, confirmText: '知道了' })
  },
  onRefresh() { wx.vibrateShort(); this.checkDevice(); wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 }) }
})
