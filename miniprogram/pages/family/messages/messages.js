const app = getApp()

Page({
  data: {
    messages: [],
    showForm: false,
    msgType: 'text',  // text | voice
    msgContent: ''
  },

  onShow() {
    this.loadMessages()
  },

  loadMessages() {
    wx.cloud.database().collection('messages')
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()
      .then(res => {
        this.setData({ messages: res.data.map(m => ({
          ...m,
          timeStr: this.formatTime(m.createTime)
        }))})
      })
      .catch(() => {})
  },

  clearAll() {
    wx.showModal({
      title: '一键清空', content: `确定删除全部${this.data.messages.length}条留言吗？`, confirmColor: '#E53935',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '清空中...' })
        const db = wx.cloud.database()
        const ids = this.data.messages.map(m => m._id)
        // 逐个删，失败跳过
        const del = (i) => {
          if (i >= ids.length) { wx.hideLoading(); this.setData({ messages: [] }); wx.showToast({ title: '已清空', icon: 'success' }); return }
          db.collection('messages').doc(ids[i]).remove().then(() => del(i+1)).catch(() => del(i+1))
        }
        del(0)
      }
    })
  },

  noop() {},
  showAdd() { this.setData({ showForm: true, msgType: 'text' }) },
  hideForm() { this.setData({ showForm: false, msgContent: '' }) },

  onContentInput(e) { this.setData({ msgContent: e.detail.value }) },

  sendMessage() {
    const content = this.data.msgContent.trim()
    if (!content) return

    wx.cloud.database().collection('messages').add({
      data: {
        type: 'text',
        content,
        fromRole: 'family',
        fromUser: app.globalData.userInfo?.nickName || '家人',
        isRead: false,
        createTime: new Date()
      }
    }).then(() => {
      wx.showToast({ title: '已发送', icon: 'success' })
      this.hideForm()
      this.loadMessages()
    }).catch(() => {
      wx.showToast({ title: '发送失败', icon: 'none' })
    })
  },

  deleteMessage(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除留言', content: '确定删除吗？', confirmColor: '#E53935',
      success: (res) => {
        if (res.confirm) {
          // 先删本地
          this.setData({ messages: this.data.messages.filter(m => m._id !== id) })
          wx.cloud.database().collection('messages').doc(id).remove()
            .then(() => { wx.showToast({ title: '已删除', icon: 'success' }) })
            .catch(() => { wx.showToast({ title: '删除失败', icon: 'none' }); this.loadMessages() })
        }
      }
    })
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff/60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff/3600000) + '小时前'
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }
})
