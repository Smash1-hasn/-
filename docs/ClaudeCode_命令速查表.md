# Claude Code 命令速查表

---

## 一、斜杠命令（对话中输入）

| 命令 | 作用 |
|------|------|
| `/help` | 查看帮助 |
| `/clear` | 清空对话上下文 |
| `/compact` | 压缩对话，释放上下文窗口 |
| `/config` | 打开设置面板 |
| `/cost` | 查看当前会话费用 |
| `/doctor` | 诊断环境问题 |
| `/init` | 初始化项目 CLAUDE.md |
| `/memory` | 打开记忆管理 |
| `/model` | 切换模型 |
| `/permissions` | 管理权限 |
| `/plan` | 进入计划模式 |
| `/review` | 审查当前分支变更 |
| `/security-review` | 安全审查 |
| `/status` | 查看当前状态 |
| `/tasks` | 查看后台任务 |
| `/todo` | 管理待办清单 |
| `/upgrade` | 升级 Claude Code |
| `/plugin` | 管理插件 |
| `/add-dir` | 添加工作目录 |
| `/agents` | 查看后台 agent |
| `/context` | 查看上下文使用量 |
| `/output-style` | 切换输出风格 |
| `/pr-comments` | 查看 PR 评论 |
| `/release-notes` | 查看版本更新日志 |
| `/resume` | 恢复之前的会话 |
| `/terminal-setup` | 终端集成设置 |
| `/think` | 切换思考模式 |
| `/bashes` | 查看后台 bash 任务 |
| `/mcp` | 管理 MCP 服务器 |
| `/todos` | 查看待办 |
| `/export` | 导出对话 |
| `/voice` | 语音输入 |

---

## 二、终端启动命令

```bash
# 基础
claude                              # 启动交互式对话
claude "帮我写一个函数"              # 直接提问（单次）
claude -p "你的问题"                 # 同上，打印输出后退出

# 文件操作
claude file.py                      # 加载文件到对话
claude --append file.py             # 追加模式

# 模式切换
claude --plan                       # 计划模式启动
claude --auto-approve               # 自动批准模式
claude --dangerously-bypass-permissions  # 绕过所有权限（危险）

# 会话管理
claude --resume                     # 恢复上次会话
claude --continue                   # 继续上次对话
claude --no-session-persistence     # 不保存本次会话

# 工作目录
claude --add-dir /path/to/dir       # 添加工作目录
claude --cd /path/to/project        # 切换到指定目录启动

# 多模型
claude --model claude-sonnet-4-6    # 指定模型
claude --fast                       # 快速模式
claude --thinking                   # 启用思考模式

# 后台与远程
claude --background                 # 后台运行
claude --remote-control             # 启用远程控制

# 工具
claude --doctor                     # 诊断
claude --version                    # 版本
claude --upgrade                    # 升级
claude mcp                          # MCP 服务器管理
```

---

## 三、对话内键盘快捷键

| 快捷键 | 作用 |
|--------|------|
| `Ctrl+C` | 中断当前操作 |
| `Ctrl+D` | 退出 |
| `Ctrl+O` | 切换详情/简洁视图 |
| `Ctrl+L` | 清屏 |
| `Ctrl+R` | 搜索历史 |
| `Ctrl+Z` | 暂停 Claude Code |
| `↑ / ↓` | 浏览历史命令 |
| `Tab` | 自动补全文件路径 |
| `Esc` | 进入 Vim 普通模式（需开启 vim 模式）|
| `Ctrl+V` | 粘贴（部分终端 Shift+Insert）|

---

## 四、权限管理命令（对话中）

```
/allow Bash           # 允许所有 bash 命令
/deny Bash            # 禁止 bash
/allow Write          # 允许写文件
/allow Edit           # 允许编辑文件
/allow Read           # 允许读文件
/allow WebSearch      # 允许网络搜索
/allow WebFetch       # 允许抓取网页
/allow MCP            # 允许 MCP 工具
```

---

## 五、常用组合操作

```bash
# 启动即带权限
claude --dangerously-bypass-permissions "部署到服务器"

# 批量处理文件
claude --add-dir ./src --add-dir ./tests "审查所有代码"

# 后台持续运行
claude --background "监控 CI 状态，每10分钟检查一次"

# 导出对话记录
会话中输入 /export

# 恢复昨天的工作
claude --resume
```

---

## 六、配置文件位置

```
~/.claude/
├── settings.json          # 用户全局设置
├── settings.local.json    # 本地设置（不提交）
├── credentials.json       # 认证信息
├── history.jsonl          # 对话历史
├── plans/                 # 计划文件
├── skills/                # 全局 skills
└── plugins/               # 已安装插件

项目目录/.claude/
├── settings.json          # 项目设置（可提交）
├── settings.local.json    # 项目本地设置（不提交）
└── skills/                # 项目 skills
```

---

## 七、@ 提及功能

对话中使用 `@` 引用：

| 语法 | 作用 |
|------|------|
| `@file.js` | 引用文件 |
| `@folder/` | 引用文件夹 |
| `@file.js:L10-L20` | 引用文件特定行 |
| `@git` | 引用 Git 状态 |
| `@command` | 引用命令输出 |

---

## 八、CLI vs VS Code 扩展

| 功能 | CLI 终端版 | VS Code 扩展版 |
|------|-----------|---------------|
| `/plugin` | ✅ 支持 | ❌ 不支持 |
| 外部 marketplace | ✅ 支持 | ⚠️ 需手动配置 |
| 后台 agent | ✅ 支持 | ❌ 不支持 |
| `--background` | ✅ 支持 | ❌ 不支持 |
| 文件编辑 | ✅ | ✅ |
| Skills | ✅ | ✅ |
| 对话 | ✅ | ✅ |
