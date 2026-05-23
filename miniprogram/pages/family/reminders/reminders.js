const app = getApp()

Page({
  data: {
    reminders: [],
    showForm: false,
    medName: '', dosage: '', time: '08:00',
    repeat: 'daily',
    medHistory: [],
    medSuggestions: [],
    showSuggestions: false
  },

  onShow() {
    this.loadReminders()
    this.loadMedHistory()
  },

  loadMedHistory() {
    const history = wx.getStorageSync('medHistory') || []
    this.setData({ medHistory: history })
  },

  loadReminders() {
    wx.cloud.database().collection('reminders')
      .orderBy('time', 'asc')
      .get()
      .then(res => {
        this.setData({ reminders: res.data })
      })
      .catch(() => {
        // 加载demo数据
        this.setData({
          reminders: [
            { _id: 'demo1', medName: '降压药', dosage: '1片', time: '08:00', repeat: 'daily', active: true },
            { _id: 'demo2', medName: '钙片', dosage: '2片', time: '12:30', repeat: 'daily', active: true }
          ]
        })
      })
  },

  noop() {},
  showAdd() { this.setData({ showForm: true }) },
  hideForm() {
    this.setData({ showForm: false, medName: '', dosage: '', time: '08:00', showSuggestions: false, medSuggestions: [] })
  },

  onMedName(e) {
    const val = e.detail.value
    this.setData({ medName: val })
    // 输入时联想
    if (val.trim()) {
      const matches = this.data.medHistory
        .filter(item => item.name.includes(val))
        .slice(0, 5)
      this.setData({ medSuggestions: matches, showSuggestions: matches.length > 0 })
    } else {
      this.setData({ medSuggestions: [], showSuggestions: false })
    }
  },

  selectMedSuggestion(e) {
    const { name, dosage } = e.currentTarget.dataset
    this.setData({
      medName: name,
      dosage: dosage || '',
      showSuggestions: false
    })
  },
  onDosage(e) { this.setData({ dosage: e.detail.value }) },
  onTime(e) { this.setData({ time: e.detail.value }) },

  saveReminder() {
    const { medName, dosage, time, repeat } = this.data
    if (!medName || !time) {
      wx.showToast({ title: '请填写药品名和时间', icon: 'none' })
      return
    }
    wx.cloud.database().collection('reminders').add({
      data: { medName, dosage, time, repeat, active: true, createTime: new Date() }
    }).then(() => {
      // 保存到用药历史（去重）
      const history = this.data.medHistory.filter(h => h.name !== medName)
      history.unshift({ name: medName, dosage })
      if (history.length > 20) history.pop()
      wx.setStorageSync('medHistory', history)

      wx.showToast({ title: '已添加提醒', icon: 'success' })
      this.hideForm()
      this.loadReminders()
      this.loadMedHistory()
    }).catch(() => {
      wx.showToast({ title: '添加失败', icon: 'none' })
    })
  },

  toggleReminder(e) {
    const { id, active } = e.currentTarget.dataset
    wx.cloud.database().collection('reminders').doc(id).update({
      data: { active: !active }
    }).then(() => this.loadReminders())
  },

  deleteReminder(e) {
    wx.showModal({
      title: '删除提醒',
      content: '确定删除此用药提醒吗？',
      confirmColor: '#E53935',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.database().collection('reminders').doc(e.currentTarget.dataset.id).remove()
            .then(() => { wx.showToast({ title: '已删除', icon: 'success' }); this.loadReminders() })
        }
      }
    })
  }
})
