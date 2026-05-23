Page({
  data: { deviceOnline: false, lastSeen: '', recentAlerts: [] },

  onShow() {
    this.checkDevice()
    this.loadAlerts()
  },

  checkDevice() {
    wx.cloud.database().collection('devices').where({ deviceId: '001' }).limit(1).get()
      .then(res => {
        if (res.data.length > 0) {
          const d = res.data[0]
          const minutesAgo = d.lastSeen ? (Date.now() - new Date(d.lastSeen).getTime()) / 60000 : 999
          const t = d.lastSeen ? new Date(d.lastSeen) : null
          this.setData({
            deviceOnline: d.status === 'online' && minutesAgo < 5,
            lastSeen: t ? t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0')+':'+t.getSeconds().toString().padStart(2,'0') : ''
          })
        }
      }).catch(() => {})
  },

  loadAlerts() {
    wx.cloud.database().collection('alerts').orderBy('timestamp','desc').limit(5).get()
      .then(res => {
        this.setData({ recentAlerts: res.data.map(a => ({
          ...a, time: this.fmt(a.timestamp)
        }))})
      }).catch(() => {})
  },

  fmt(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }
})
