const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_KEY = 'sk-cd26758ee36043a69c24a9faba40f804'

const SYSTEM_PROMPT = `你是健康问答助手，专门解答老年健康相关问题。
规则：
- 每次回答前先说"以下内容仅供参考，不构成医疗诊断"
- 回答通俗易懂、具体可操作
- 涉及紧急症状时强调立即就医
- 不推荐具体药物，只给通用护理建议
- 回答控制在200字以内`

Page({
  data: {
    messages: [],
    inputText: '',
    typing: false,
    suggestedQuestions: [
      '老人膝盖疼怎么日常护理？',
      '老年人每天应该运动多久？',
      '高血压老人饮食注意什么？',
      '如何预防老人跌倒？',
      '老人失眠有什么好方法？',
      '老年人常见慢性病有哪些？'
    ]
  },

  onLoad() {
    this.setData({
      messages: [{
        role: 'bot',
        text: '您好，我是健康问答助手。可以问我关于老年健康的任何问题。\n\n⚠️ 以下所有内容仅供参考，不能替代专业医疗诊断。',
        time: this.now()
      }]
    })
  },

  sendMessage() {
    const text = this.data.inputText.trim()
    if (!text || this.data.typing) return

    const userMsg = { role: 'user', text, time: this.now() }
    const msgs = [...this.data.messages, userMsg]
    this.setData({ messages: msgs, inputText: '', typing: true })
    this.scrollToBottom()

    // 只传当前问题，不传历史，避免上下文污染
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text }
    ]

    wx.request({
      url: DEEPSEEK_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`
      },
      data: {
        model: 'deepseek-chat',
        messages: apiMessages,
        temperature: 0.3,
        max_tokens: 600
      },
      timeout: 20000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.choices) {
          const reply = res.data.choices[0].message.content.trim()
          const botMsg = { role: 'bot', text: reply, time: this.now() }
          this.setData({ messages: [...this.data.messages, botMsg], typing: false })
          this.scrollToBottom()
        } else {
          this.setData({ typing: false })
          wx.showToast({ title: '服务响应异常，请重试', icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('QA request failed:', err)
        this.setData({ typing: false })
        wx.showToast({ title: '网络连接失败，请检查后重试', icon: 'none' })
      }
    })
  },

  quickQuestion(e) {
    this.setData({ inputText: e.currentTarget.dataset.text })
    this.sendMessage()
  },

  onInput(e) { this.setData({ inputText: e.detail.value }) },

  scrollToBottom() {
    setTimeout(() => wx.pageScrollTo({ scrollTop: 99999, duration: 200 }), 100)
  },

  now() {
    const d = new Date()
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }
})
