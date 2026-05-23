const app = getApp()

Page({
  data: { code: '', error: '' },

  onCodeInput(e) {
    this.setData({ code: e.detail.value.toUpperCase(), error: '' })
  },

  confirmCode() {
    const code = this.data.code.trim().toUpperCase()
    if (!code) { this.setData({ error: '请输入配对码' }); wx.vibrateShort(); return }
    if (code.length < 4) { this.setData({ error: '配对码至少4位' }); wx.vibrateShort(); return }

    wx.showLoading({ title: '关联中...' })
    const db = wx.cloud.database()

    // 检查云数据库中是否已有此老人记录
    db.collection('users').where({ role: 'elderly' }).limit(1).get()
      .then(res => {
        const userInfo = {
          nickName: '长辈用户', avatarUrl: '', role: 'elderly',
          familyGroupId: code, createTime: new Date().toISOString()
        }

        if (res.data.length > 0) {
          // 更新已有记录
          return db.collection('users').doc(res.data[0]._id).update({
            data: { familyGroupId: code }
          }).then(() => userInfo)
        } else {
          // 新建记录
          return db.collection('users').add({
            data: { nickName: '长辈用户', role: 'elderly', familyGroupId: code, createTime: new Date() }
          }).then(r => { userInfo._id = r._id; return userInfo })
        }
      })
      .then(userInfo => {
        wx.setStorageSync('userInfo', userInfo)
        app.globalData.userInfo = userInfo
        app.globalData.isLoggedIn = true
        app.globalData.currentRole = 'elderly'
        app.globalData.familyGroupId = code
        wx.hideLoading()
        wx.redirectTo({ url: '/pages/elderly/home/home' })
      })
      .catch(() => {
        // 云开发不可用时降级
        const userInfo = {
          nickName: '长辈用户', avatarUrl: '', role: 'elderly',
          familyGroupId: code, createTime: new Date().toISOString()
        }
        wx.setStorageSync('userInfo', userInfo)
        app.globalData.userInfo = userInfo
        app.globalData.isLoggedIn = true
        app.globalData.currentRole = 'elderly'
        app.globalData.familyGroupId = code
        wx.hideLoading()
        wx.redirectTo({ url: '/pages/elderly/home/home' })
      })
  },

  skipForNow() {
    const tempCode = 'SKIP_' + Date.now().toString(36).toUpperCase().slice(-6)
    const userInfo = {
      nickName: '长辈用户', avatarUrl: '', role: 'elderly',
      familyGroupId: tempCode, createTime: new Date().toISOString()
    }
    wx.setStorageSync('userInfo', userInfo)
    app.globalData.userInfo = userInfo
    app.globalData.isLoggedIn = true
    app.globalData.currentRole = 'elderly'
    app.globalData.familyGroupId = tempCode
    wx.redirectTo({ url: '/pages/elderly/home/home' })
  }
})
