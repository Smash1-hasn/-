# 已安装的 Skills 使用指南

> 位置：`C:\Users\MR\.claude\skills\`（全局，所有项目都能用）

---

## 对本次比赛「安心守护」直接有用的

| Skill | 什么时候用 | 举例 |
|-------|-----------|------|
| **brand-guidelines** ✅已用 | 设计品牌配色/规范 | 刚做了温暖守护品牌色板 |
| **theme-factory** ✅已用 | 选主题配色/字体 | 融合了 Ocean Depths + Botanical Garden |
| **frontend-design** ✅已用 | 网页/小程序 UI 设计 | 打磨页面避免"AI模板感" |
| **doc-coauthoring** | 写比赛文档 | 5月30日前写作品说明文档 |
| **docx** | 生成Word文档 | 正式文档导出 |
| **pdf** | 生成/处理PDF | 比赛要求提交PDF作品文档 |
| **pptx** | 做答辩PPT | 6月3日决赛答辩用 |
| **webapp-testing** | 测试小程序 | 提交前全面测试功能 |
| **claude-api** | AI功能开发 | 替代/补充DeepSeek做健康分析 |
| **web-artifacts-builder** | 构建Web页面 | 可能需要管理后台页面 |

## 其他通用工具

| Skill | 用途 |
|-------|------|
| **canvas-design** | 平面设计/海报 |
| **algorithmic-art** | 生成艺术/可视化 |
| **internal-comms** | 内部沟通文档 |
| **mcp-builder** | 构建MCP服务器 |
| **skill-creator** | 创建自定义skill |
| **slack-gif-creator** | Slack GIF |
| **xlsx** | Excel表格处理 |

---

## Matt Pocock 开发工具链（新增 14 个）

> 来源：`npx skills@latest add mattpocock/skills`
> 位置：全局 `C:\Users\MR\.claude\skills\`

### 对比赛直接有用的

| Skill | 怎么用 | 举例 |
|-------|--------|------|
| **diagnose** | 排查 bug 或性能问题 | "诊断一下为什么语音识别失败" |
| **tdd** | 测试驱动开发，红-绿-重构循环 | "用 TDD 写用药提醒功能" |
| **to-prd** | 把当前对话转成 PRD 文档 | "把语音SOS功能写成 PRD 给组长" |
| **handoff** | 打包对话给另一个 AI 继续 | 换模型或交接时用 |
| **caveman** | 把复杂概念讲得像原始人也能懂 | "用 caveman 解释 FSM 跌倒算法" |

### 其他开发工具

| Skill | 用途 |
|-------|------|
| **grill-me** | 反复追问方案直到无漏洞，压力测试设计 |
| **grill-with-docs** | 用项目文档挑战设计方案 |
| **prototype** | 快速出原型验证想法 |
| **to-issues** | 把方案拆成独立可执行的 Issue |
| **triage** | 管理 Issue 流程，分类优先级 |
| **zoom-out** | 从更高视角理解代码结构和关系 |
| **write-a-skill** | 创建新的 Agent 技能 |
| **improve-codebase-architecture** | 找出架构改进点，重构建议 |
| **setup-matt-pocock-skills** | 配置项目让技能对接 Issue 系统（新项目先用这个） |

---

## Skills 目录规范

```
C:\Users\MR\.claude\skills\   ← 全局 skills（所有项目共用，共31个）
    ├── brand-guidelines/
    ├── diagnose/（新）
    ├── tdd/（新）
    ├── to-prd/（新）
    └── ... (共31个)

项目目录\.claude\skills\       ← 项目专属 skills（仅当前项目）
```

## 如何使用 Skill

在对话中直接告诉我用哪个skill，例如：
- "用 brand-guidelines 给XX设计配色"
- "用 pptx 做决赛答辩PPT"
- "用 diagnose 排查这个 bug"
- "用 tdd 开发这个功能"
- "用 to-prd 生成需求文档"
