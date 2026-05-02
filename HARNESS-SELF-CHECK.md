# Harness 八要素 ↔ 本登录系统（一句话自检）

八要素命名与顺序对齐仓库内 **`harness guide/harness-practice-web-article-to-markdown.md`** 第 2 节；本页用各**一句**话说明在本 Koa2 登录工程中的落点（细节以 **`README.md`**、`implement guide/NOTES-API-CONTRACT.md`、`implement guide/V1/KOA2登录系统-Harness与Cursor分步指南.md` 为准）。

1. **任务如何被表达**：`implement guide/NOTES-API-CONTRACT.md` 与 **`README.md`** 把路径、方法、状态码、JSON 字段与 Cookie 名写死，使人或 Agent 接手时成功/失败判据不漂移。

2. **上下文如何被组织**：全局中间件顺序为「错误壳 → 解析 JSON →（开发请求日志）→ Session → 路由」，`GET /me` 再串联 **`requireAuth`**，只把「已鉴权的会话 + 当前路由」交给业务，不把整站无关状态塞进单次处理。

3. **工具如何被暴露、治理、拦截**：运行时边界由 **`package.json` 锁定依赖**（Koa、koa-router、koa-bodyparser、koa-session、bcrypt），验收侧用 **`scripts/verify-flow.sh` / `.ps1` 与 `curl`** 固定「如何证明链路」，避免把「本机碰巧装了啥」当隐含前提。

4. **状态如何被保存、恢复、裁剪**：用户长期状态落在 **`data/users.json`**（启动读入、注册写回、写队列串行化），登录态在 **`koa-session` + 内存 store + 签名 Cookie** 中恢复；响应与日志侧裁剪掉密码明文，仅暴露 `id`/`username` 等业务所需字段。

5. **反馈如何回流**：开发环境 **`[req]`** 路由级日志（`password` 脱敏）、统一 **`{ error, message }`** 错误体，以及 **`npm run verify`** 失败时非零退出码，便于从现象回到契约或实现层修正。

6. **错误如何被分类、重试、升级**：**`HttpError` / `SyntaxError` / 默认 500** 分支区分业务可预期错误与内部错误，客户端拿机器可读 **`error` 码**；内部错误日志**不**附带请求体，避免把凭据写进日志（重试策略留给调用方与运维环境）。

7. **安全边界如何被建立**：**bcrypt** 存哈希、**httpOnly** 会话、**`SESSION_KEYS` / `.gitignore` 忽略 `.env`**、README 中的 **CORS 第一版策略** 与日志脱敏，把「不可信输入与不必要暴露面」挡在约定边界内。

8. **系统如何验证「真的把事做好了」**：**`npm run verify`** 自动化串行 **注册 → 登录 → `/me` → 登出 → 再 `/me`（期望 401）**，用可复现脚本证明会话与用户持久化链路在目标环境里真的闭环。
