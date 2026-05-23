const DEEPSEEK_KEY = 'sk-cd26758ee36043a69c24a9faba40f804'
const BAIDU_KEY = 'l5Twnu6wdP3OnFAqzQQnOLSV'
const BAIDU_SECRET = '45POv3Zvd1gOiJORy6LxnsnBeIsUnLIP'

let baiduToken = '', baiduTokenTime = 0

Page({
  data: { messages: [], inputText: '', typing: false, listening: false },

  onLoad() {
    this.setData({ messages: [
      { role: 'bot', text: '您好！我是小安。打字聊天或点🎤跟我语音对话~', time: this.now() }
    ]})
  },

  // ===== 文字发送 =====
  onSend() {
    const text = this.data.inputText.trim()
    if (!text || this.data.typing) return
    this.setData({ inputText: '', typing: true })
    this.addMsg('user', text)
    this.chat(text)
  },

  onInput(e) { this.setData({ inputText: e.detail.value }) },

  quickChat(e) {
    const t = e.currentTarget.dataset.text
    if (typeof t !== 'string') return
    this.setData({ typing: true })
    this.addMsg('user', t)
    this.chat(t)
  },

  // ===== 语音 =====
  startVoice() {
    if (this._recording) return
    this._recording = true

    const rm = wx.getRecorderManager()
    this._rm = rm

    rm.onStart(() => { console.log('REC START'); this.setData({ listening: true }) })

    rm.onStop((res) => {
      console.log('REC STOP', res.tempFilePath, res.duration)
      this._recording = false; this._rm = null
      this.setData({ listening: false })
      if (res.tempFilePath) {
        wx.showLoading({ title: '识别中...' })
        this.stt(res.tempFilePath)
      }
    })

    rm.onError((err) => {
      console.error('REC ERROR:', err)
      this._recording = false; this._rm = null
      this.setData({ listening: false })
      wx.showToast({ title: '录音失败，请授权麦克风', icon: 'none' })
    })

    rm.start({ duration: 15000, sampleRate: 16000, numberOfChannels: 1, format: 'wav' })
  },

  stopVoice() {
    if (!this._recording) return
    console.log('REC STOPPING')
    this._rm && this._rm.stop()
  },

  // ===== 百度语音识别 =====
  stt(filePath) {
    const fs = wx.getFileSystemManager()
    const data = fs.readFileSync(filePath)

    this.baiduToken().then(token => {
      wx.request({
        url: 'https://vop.baidu.com/server_api', method: 'POST',
        data: {
          format: 'wav', rate: 16000, channel: 1,
          token, cuid: 'wx_miniprogram',
          speech: wx.arrayBufferToBase64(data), len: data.byteLength
        },
        success: (res) => {
          wx.hideLoading()
          if (res.data.err_no === 0 && res.data.result?.length > 0) {
            this.setData({ typing: true })
            this.addMsg('user', res.data.result[0])
            this.chat(res.data.result[0])
          } else {
            wx.showToast({ title: res.data.err_no === 3301 ? '没听清，再说一遍' : '识别失败', icon: 'none' })
          }
        },
        fail: () => { wx.hideLoading(); wx.showToast({ title: '网络问题', icon: 'none' }) }
      })
    }).catch(() => { wx.hideLoading(); wx.showToast({ title: '语音服务异常', icon: 'none' }) })
  },

  // ===== DeepSeek AI =====
  chat(text) {
    wx.request({
      url: 'https://api.deepseek.com/v1/chat/completions', method: 'POST',
      header: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
      data: {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: '你是"小安"，温暖贴心的AI陪聊伙伴，像孙辈一样唠家常。每次3-5句话，口语化。\n老人说：' + text }
        ],
        temperature: 0.85, max_tokens: 600
      },
      timeout: 20000,
      success: (res) => {
        this.setData({ typing: false })
        if (res.statusCode === 200 && res.data?.choices) {
          const reply = res.data.choices[0].message.content.trim()
          this.addMsg('bot', reply)
          this.tts(reply)
        } else { wx.showToast({ title: '小安走神了...', icon: 'none' }) }
      },
      fail: () => { this.setData({ typing: false }); wx.showToast({ title: '网络不佳', icon: 'none' }) }
    })
  },

  // ===== 百度 TTS =====
  tts(text) {
    this.baiduToken().then(token => {
      const audio = wx.createInnerAudioContext()
      audio.src = `https://tsn.baidu.com/text2audio?tok=${token}&cuid=wx&ctp=1&lan=zh&spd=5&pit=5&vol=9&per=0&aue=3&tex=${encodeURIComponent(text.substring(0,200))}`
      audio.play()
      audio.onEnded(() => audio.destroy())
      audio.onError(() => audio.destroy())
    }).catch(() => {})
  },

  // ===== 工具 =====
  addMsg(role, text) {
    this.setData({ messages: [...this.data.messages, { role, text, time: this.now() }] })
    this.scrollBottom()
  },

  baiduToken() {
    return new Promise((resolve, reject) => {
      if (baiduToken && Date.now() - baiduTokenTime < 3600000) return resolve(baiduToken)
      wx.request({
        url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_KEY}&client_secret=${BAIDU_SECRET}`,
        success: (r) => {
          if (r.data.access_token) { baiduToken = r.data.access_token; baiduTokenTime = Date.now(); resolve(baiduToken) }
          else reject()
        },
        fail: reject
      })
    })
  },

  scrollBottom() { setTimeout(() => wx.pageScrollTo({ scrollTop: 99999, duration: 200 }), 100) },
  now() { const d = new Date(); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}` }
})
