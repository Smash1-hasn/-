const app = getApp()

Page({
  data: { nickname: '' },

  onLoad() {
    this.setData({ nickname: app.globalData.userInfo?.nickName || '家人' })
  },

  goAIQA() { wx.navigateTo({ url: '/pages/family/ai-qa/ai-qa' }) },
  goMessages() { wx.navigateTo({ url: '/pages/family/messages/messages' }) },
  goReminders() { wx.navigateTo({ url: '/pages/family/reminders/reminders' }) }
})
