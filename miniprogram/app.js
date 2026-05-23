App({
  onLaunch() {
    // 初始化云开发（开通云开发后替换环境ID）
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud2-d2g7yeednd8ac1836',  // 替换为你的云环境ID
        traceUser: true
      })
    }

    // 检查用户登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    }

    console.log('[App] 安心守护启动', this.globalData)
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    currentRole: '',          // 'elderly' | 'family'
    deviceId: '',
    cloudEnv: 'cloud2-d2g7yeednd8ac1836' // 云环境ID
  }
})
