Page({
  data: {
    game: null,
    score: 0, bestScore: 0, streak: 0,
    // 速算
    mathA: 0, mathOp: '+', mathB: 0, mathAnswer: 0,
    mathOptions: [], mathResult: '', mathTotal: 0, mathCorrect: 0, mathAnswered: false,
    // 分类
    spotItems: [], spotAnswer: '', spotResult: '', spotTotal: 0, spotCorrect: 0,
    spotCategory: '', spotAnswered: false
  },

  onLoad() {
    this.setData({ bestScore: wx.getStorageSync('gameBestScore') || 0 })
  },

  onUnload() {
    this._timer && clearTimeout(this._timer)
  },

  showMenu() {
    this._timer && clearTimeout(this._timer)
    this.setData({ game: null, score: 0, streak: 0 })
  },

  // ======== 速算挑战 ========
  startMath() {
    // 只用加法，避免减法导致 answer=0 时的死循环
    const a = Math.floor(Math.random() * 20) + 1
    const b = Math.floor(Math.random() * 20) + 1
    const op = '+'
    const answer = a + b

    // 安全生成4个不同选项
    const options = new Set([answer])
    let tries = 0
    while (options.size < 4 && tries < 100) {
      const offset = Math.floor(Math.random() * 8) - 4
      const opt = answer + offset
      if (opt >= 1 && opt !== answer) options.add(opt)
      tries++
    }
    // 兜底：如果还不够4个，用 answer+1, answer+2...
    let fallback = 1
    while (options.size < 4) {
      options.add(answer + fallback)
      fallback++
    }
    const shuffled = [...options].sort(() => Math.random() - 0.5)

    this.setData({
      game: 'math', mathA: a, mathOp: op, mathB: b, mathAnswer: answer,
      mathOptions: shuffled, mathResult: '', mathAnswered: false
    })
  },

  pickMath(e) {
    if (this.data.mathAnswered) return
    const picked = parseInt(e.currentTarget.dataset.value)

    if (picked === this.data.mathAnswer) {
      const newScore = this.data.score + 10
      const newStreak = this.data.streak + 1
      const bonus = newStreak >= 3 ? 5 : 0
      const best = Math.max(newScore + bonus, this.data.bestScore)
      wx.setStorageSync('gameBestScore', best)
      this.setData({
        mathResult: '✅ 正确！', mathAnswered: true,
        score: newScore + bonus, bestScore: best, streak: newStreak,
        mathCorrect: this.data.mathCorrect + 1, mathTotal: this.data.mathTotal + 1
      })
      wx.vibrateShort()
    } else {
      this.setData({
        mathResult: `❌ 答案是 ${this.data.mathAnswer}`, mathAnswered: true,
        streak: 0, mathTotal: this.data.mathTotal + 1
      })
    }
  },

  nextMath() {
    if (this.data.game !== 'math') return
    this.startMath()
  },

  // ======== 物品分类 ========
  startSpot() {
    const categories = [
      { name: '水果', items: ['🍎苹果', '🍌香蕉', '🍇葡萄', '🍊橙子', '🍑桃子', '🍓草莓'] },
      { name: '蔬菜', items: ['🥬白菜', '🥕胡萝卜', '🍅番茄', '🥒黄瓜', '🌶辣椒', '🧅洋葱'] },
      { name: '动物', items: ['🐶狗', '🐱猫', '🐰兔子', '🐼熊猫', '🐘大象', '🦁狮子'] },
      { name: '衣物', items: ['👔衬衫', '👗裙子', '🧥外套', '👟鞋子', '🧣围巾', '🎒背包'] }
    ]
    const cat = categories[Math.floor(Math.random() * categories.length)]
    const other = categories.filter(c => c.name !== cat.name)[Math.floor(Math.random() * 3)]
    const intruder = other.items[Math.floor(Math.random() * other.items.length)]
    const items = [...cat.items.slice(0, 5), intruder].sort(() => Math.random() - 0.5)

    this.setData({
      game: 'spot', spotItems: items, spotAnswer: intruder,
      spotResult: '', spotAnswered: false, spotCategory: cat.name
    })
  },

  pickSpot(e) {
    if (this.data.spotAnswered) return
    const picked = e.currentTarget.dataset.item

    if (picked === this.data.spotAnswer) {
      const newScore = this.data.score + 15
      const newStreak = this.data.streak + 1
      const best = Math.max(newScore, this.data.bestScore)
      wx.setStorageSync('gameBestScore', best)
      this.setData({
        spotResult: `✅ 正确！"${picked}"不属于${this.data.spotCategory}`, spotAnswered: true,
        score: newScore, bestScore: best, streak: newStreak,
        spotCorrect: this.data.spotCorrect + 1, spotTotal: this.data.spotTotal + 1
      })
      wx.vibrateShort()
    } else {
      this.setData({
        spotResult: `❌ "${picked}"属于${this.data.spotCategory}哦`, spotAnswered: true,
        streak: 0, spotTotal: this.data.spotTotal + 1
      })
    }
  },

  nextSpot() {
    if (this.data.game !== 'spot') return
    this.startSpot()
  }
})
