const app = getApp()

Page({
  data: { loading: false },

  onLoad() {
    // 本地有配对信息 → 直接进
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.familyGroupId && userInfo.role) {
      app.globalData.userInfo = userInfo
      app.globalData.isLoggedIn = true
      app.globalData.familyGroupId = userInfo.familyGroupId
      this.navigateByRole(userInfo.role)
    }
  },

  selectElderly() {
    // 先查云端是否有已配对的记录
    const db = wx.cloud.database()
    db.collection('users').where({ role: 'elderly' }).limit(1).get()
      .then(res => {
        if (res.data.length > 0 && res.data[0].familyGroupId && !res.data[0].familyGroupId.startsWith('SKIP_')) {
          // 云端有配对 → 恢复
          const ui = res.data[0]
          const userInfo = { nickName: '长辈用户', avatarUrl: '', role: 'elderly', familyGroupId: ui.familyGroupId }
          wx.setStorageSync('userInfo', userInfo)
          app.globalData.userInfo = userInfo; app.globalData.isLoggedIn = true; app.globalData.familyGroupId = ui.familyGroupId
          wx.redirectTo({ url: '/pages/elderly/home/home' })
        } else {
          // 云端没有 → 去配对页
          wx.navigateTo({ url: '/pages/elderly/code/code' })
        }
      }).catch(() => {
        wx.navigateTo({ url: '/pages/elderly/code/code' })
      })
  },

  selectFamily() {
    this.setData({ loading: true })
    const db = wx.cloud.database()
    const _ = db.command

    // 先查云端是否已有记录
    db.collection('users').where({ role: 'family' }).limit(1).get()
      .then(res => {
        let familyGroupId
        if (res.data.length > 0 && res.data[0].familyGroupId) {
          familyGroupId = res.data[0].familyGroupId
        } else {
          familyGroupId = 'FAM' + Date.now().toString(36).toUpperCase().slice(-6)
        }
        this.doFamilyLogin(familyGroupId)
      })
      .catch(() => {
        // 云开发不可用时降级
        this.doFamilyLogin('FAM' + Date.now().toString(36).toUpperCase().slice(-6))
      })
  },

  doFamilyLogin(familyGroupId) {
    wx.getUserProfile({
      desc: '用于显示您的头像和昵称',
      success: (res) => {
        const userInfo = {
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl,
          role: 'family',
          familyGroupId: familyGroupId,
          createTime: new Date().toISOString()
        }
        this.saveAndGo(userInfo)
      },
      fail: () => {
        const userInfo = {
          nickName: '家人用户', avatarUrl: '', role: 'family',
          familyGroupId: familyGroupId, createTime: new Date().toISOString()
        }
        this.saveAndGo(userInfo)
      }
    })
  },

  saveAndGo(userInfo) {
    wx.setStorageSync('userInfo', userInfo)
    app.globalData.userInfo = userInfo
    app.globalData.isLoggedIn = true
    app.globalData.currentRole = userInfo.role
    app.globalData.familyGroupId = userInfo.familyGroupId

    // 异步存云数据库（upsert）
    const db = wx.cloud.database()
    db.collection('users').where({ role: userInfo.role }).limit(1).get()
      .then(res => {
        if (res.data.length > 0) {
          db.collection('users').doc(res.data[0]._id).update({
            data: { nickName: userInfo.nickName, avatarUrl: userInfo.avatarUrl, familyGroupId: userInfo.familyGroupId }
          })
        } else {
          db.collection('users').add({
            data: { nickName: userInfo.nickName, avatarUrl: userInfo.avatarUrl, role: userInfo.role, familyGroupId: userInfo.familyGroupId, createTime: new Date() }
          })
        }
      }).catch(() => {})

    this.setData({ loading: false })
    if (userInfo.role === 'elderly') {
      wx.redirectTo({ url: '/pages/elderly/home/home' })
    } else {
      wx.switchTab({ url: '/pages/family/dashboard/dashboard' })
    }
  },

  navigateByRole(role) {
    if (role === 'elderly') {
      wx.redirectTo({ url: '/pages/elderly/home/home' })
    } else {
      wx.switchTab({ url: '/pages/family/dashboard/dashboard' })
    }
  }
})
