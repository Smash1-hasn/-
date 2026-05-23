云函数部署说明：

1. 在微信开发者工具中，右键点击每个云函数文件夹
2. 选择「上传并部署：云端安装依赖」
3. 部署顺序：先 deviceDataIngest → 再 aiHealthAnalysis → 最后 sendAlertPush

deviceDataIngest 云函数需要配置 HTTP 触发：
- 在云开发控制台 → 云函数 → deviceDataIngest → 触发器
- 添加 HTTP 触发器
- 将生成的 URL 填到 ESP32 的 config.h 的 CLOUD_FUNC_URL

sendAlertPush 云函数需要配置数据库触发器：
- 在云开发控制台 → 数据库 → alerts 集合 → 触发器
- 添加触发器，选择 sendAlertPush 云函数
- 触发条件: 新增记录时
