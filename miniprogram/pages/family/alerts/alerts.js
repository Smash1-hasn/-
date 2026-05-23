Page({
  data: {
    alerts: [],
    filter: 'all',
    loading: true
  },

  onShow() {
    this.loadAlerts()
  },

  loadAlerts() {
    this.setData({ loading: true })
    const db = wx.cloud.database()
    db.collection('alerts')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get()
      .then(res => {
        const alerts = res.data.map(a => ({
          ...a,
          time: this.formatTime(a.timestamp),
          icon: this.getAlertIcon(a.type),
          levelText: a.level === 'critical' ? '紧急' : '提醒'
        }))
        this.setData({ alerts, loading: false })
      })
      .catch(err => {
        console.warn('加载告警失败', err)
        this.setData({ loading: false })
      })
  },

  // 筛选告警
  filterAlerts(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ filter })
  },

  // 标记告警为已处理
  handleAlert(e) {
    const id = e.currentTarget.dataset.id
    // 先更新本地UI（即时响应）
    const alerts = this.data.alerts.map(a => a._id === id ? { ...a, handled: true } : a)
    this.setData({ alerts })

    wx.cloud.database().collection('alerts').doc(id).update({
      data: { handled: true }
    }).then(() => {
      wx.showToast({ title: '已标记处理', icon: 'success' })
    }).catch(() => {
      wx.showToast({ title: '操作失败', icon: 'none' })
      this.loadAlerts() // 失败时重新加载
    })
  },

  // 查看告警详情
  viewDetail(e) {
    const item = e.currentTarget.dataset.item
    wx.showModal({
      title: '告警详情',
      content: `类型: ${item.type}\n时间: ${item.time}\n${item.message || ''}\n状态: ${item.handled ? '已处理' : '待处理'}`,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  getAlertIcon(type) {
    const icons = {
      fall: '🚨', sos: '🆘', voice_sos: '🔊',
      device_offline: '📡'
    }
    return icons[type] || '🔔'
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const m = (d.getMonth()+1).toString().padStart(2,'0')
    const day = d.getDate().toString().padStart(2,'0')
    const h = d.getHours().toString().padStart(2,'0')
    const min = d.getMinutes().toString().padStart(2,'0')
    return `${m}/${day} ${h}:${min}`
  },

  clearHandled() {
    const handled = this.data.alerts.filter(a => a.handled)
    if (handled.length === 0) { wx.showToast({ title: '没有已处理的告警', icon: 'none' }); return }
    wx.showModal({
      title: '清空', content: `删除${handled.length}条已处理告警？`, confirmColor: '#E53935',
      success: (res) => {
        if (!res.confirm) return
        const db = wx.cloud.database()
        const del = (i) => {
          if (i >= handled.length) { this.loadAlerts(); wx.showToast({ title: '已清空', icon: 'success' }); return }
          db.collection('alerts').doc(handled[i]._id).remove().then(() => del(i+1)).catch(() => del(i+1))
        }
        del(0)
      }
    })
  },

  onPullDownRefresh() {
    this.loadAlerts()
    wx.stopPullDownRefresh()
  }
})
