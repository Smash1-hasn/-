const app = getApp()

Page({
  data: {
    userInfo: null,
    deviceId: '', deviceStatus: '',
    contacts: [],
    showAddContact: false,
    newContactName: '', newContactPhone: '', newContactRelation: '',
    familyCode: '',
    showCode: false
  },

  onLoad() {
    const ui = app.globalData.userInfo
    let code = ui?.familyGroupId || ''
    this.setData({ userInfo: ui, familyCode: code })

    // 本地没有 → 查云端
    if (!code) {
      wx.cloud.database().collection('users').where({ role: ui?.role || 'family' }).limit(1).get()
        .then(res => {
          if (res.data.length > 0 && res.data[0].familyGroupId) {
            code = res.data[0].familyGroupId
          } else {
            code = 'FAM' + Date.now().toString(36).toUpperCase().slice(-6)
            wx.cloud.database().collection('users').add({
              data: { role: 'family', familyGroupId: code, createTime: new Date() }
            }).catch(() => {})
          }
          this.setData({ familyCode: code })
          app.globalData.familyGroupId = code
        }).catch(() => {})
    }
  },

  onShow() {
    this.loadDeviceInfo()
    this.loadContacts()
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.familyCode,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  // === 设备 ===
  loadDeviceInfo() {
    wx.cloud.database().collection('devices').limit(1).get().then(res => {
      if (res.data.length > 0) {
        this.setData({
          deviceId: res.data[0].deviceId || '',
          deviceStatus: res.data[0].status || 'offline'
        })
      }
    }).catch(() => {})
  },

  bindDevice() {
    wx.showModal({
      title: '绑定设备',
      content: '请输入ESP32设备ID',
      editable: true,
      placeholderText: '例如: ESP32_001',
      success: (res) => {
        if (res.confirm && res.content) {
          wx.cloud.database().collection('devices').add({
            data: { deviceId: res.content.trim(), status: 'offline', bindTime: new Date() }
          }).then(() => {
            this.setData({ deviceId: res.content.trim() })
            wx.showToast({ title: '绑定成功', icon: 'success' })
            this.loadDeviceInfo()
          }).catch(() => wx.showToast({ title: '绑定失败', icon: 'none' }))
        }
      }
    })
  },

  // === 紧急联系人 ===
  loadContacts() {
    wx.cloud.database().collection('emergencyContacts').get().then(res => {
      this.setData({ contacts: res.data })
    }).catch(() => {})
  },

  noop() {},
  showAddForm() { this.setData({ showAddContact: true }) },
  onCancelAdd() {
    this.setData({ showAddContact: false, newContactName: '', newContactPhone: '', newContactRelation: '' })
  },
  onNameInput(e) { this.setData({ newContactName: e.detail.value }) },
  onPhoneInput(e) { this.setData({ newContactPhone: e.detail.value }) },
  onRelationInput(e) { this.setData({ newContactRelation: e.detail.value }) },

  saveContact() {
    const { newContactName, newContactPhone, newContactRelation } = this.data
    if (!newContactName || !newContactPhone) {
      wx.showToast({ title: '请填写姓名和电话', icon: 'none' }); return
    }
    wx.cloud.database().collection('emergencyContacts').add({
      data: { name: newContactName, phone: newContactPhone, relation: newContactRelation || '其他', priority: this.data.contacts.length + 1, createTime: new Date() }
    }).then(() => {
      wx.showToast({ title: '添加成功', icon: 'success' })
      this.setData({ showAddContact: false, newContactName: '', newContactPhone: '', newContactRelation: '' })
      this.loadContacts()
    }).catch(() => wx.showToast({ title: '添加失败', icon: 'none' }))
  },

  deleteContact(e) {
    wx.showModal({
      title: '确认删除', content: '确定删除此紧急联系人吗？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.database().collection('emergencyContacts').doc(e.currentTarget.dataset.id).remove()
            .then(() => { wx.showToast({ title: '已删除', icon: 'success' }); this.loadContacts() })
        }
      }
    })
  },

  // === 其他 ===
  switchRole() {
    wx.showModal({
      title: '切换角色', content: '将返回角色选择页面',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          app.globalData.userInfo = null
          app.globalData.isLoggedIn = false
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  },

  clearData() {
    wx.showModal({
      title: '清除所有数据', content: '此操作不可恢复！', confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) { wx.clearStorageSync(); wx.showToast({ title: '已清除', icon: 'success' }) }
      }
    })
  },

  showAbout() {
    wx.showModal({
      title: '关于 爱即守护',
      content: '版本: 1.0.0\n\n爱即守护是一款AI驱动的远程智慧养老陪伴平台。通过智能穿戴设备实时监测老人的活动状态，结合AI分析为子女提供风险预测和健康周报，让关爱不受距离限制。\n\n特色功能：\n• 实时状态监测\n• AI跌倒检测与风险预测\n• 一键SOS紧急求救\n• 健康周报自动生成\n• 远程多方守护',
      showCancel: false, confirmText: '知道了'
    })
  }
})
