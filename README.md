# harness-login-now-koa2

Koa2 练习项目：**注册 / 登录 / 当前用户 / 登出**，`httpOnly` Cookie 会话与 **`data/users.json` 持久化**。

实现说明与 Harness 分步指引：**分步指南**与**第一版交接上下文**在 **`implement guide/V1/`**（`KOA2登录系统-Harness与Cursor分步指南.md`、`CONTEXT-V1-LLM-HANDOFF.md`）；**API 契约**在 **`implement guide/NOTES-API-CONTRACT.md`**（与 `V1/` 同级）。与 **Harness 八要素** 的一句话对照见 **`HARNESS-SELF-CHECK.md`**。

## 环境变量

| 变量 | 是否必需 | 说明 |
|------|----------|------|
| **`SESSION_KEYS`** | **生产环境强烈建议** | `koa-session` 签名用密钥；可为**逗号分隔**的多个字符串（轮换密钥时写入多个）。未设置时源码内仅有开发占位密钥，**切勿用于生产**。 |
| **`PORT`** | 否 | 监听端口，默认 **3000**。 |
| **`NODE_ENV`** | 否 | 设为 `production` 时 Cookie 使用 `Secure`，且内部错误日志不打印完整堆栈（仍**不会**记录请求体）。 |

可将上述变量写入仓库根目录 **`.env`**，由你在本机用 `export` / 进程管理器注入（本仓库**不**内置 `dotenv` 加载；需自行 `set -a && source .env && set +a` 或使用 systemd、Docker 等注入）。

### 生成随机 `SESSION_KEYS`（一行示例）

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将输出的一串十六进制作为 `SESSION_KEYS` 的值即可；多密钥用英文逗号拼接。

### 勿将 `.env` 提交到 Git

密钥与本地配置应留在本机。仓库根目录 **`.gitignore`** 已包含 **`.env`** 与 **`.env.*`**（若需提交示例文件，可使用 `.env.example` 并配合 `!.env.example` 例外规则）。

## CORS（第一版策略）

本服务**未启用**宽泛的 CORS 中间件，等价于依赖浏览器**同源策略**（与 `curl`、同源页面调试一致）。

**理由简述**：会话基于 **httpOnly Cookie**；若对任意第三方站点开放带凭证的跨域，需精确白名单并配合 `SameSite=None; Secure` 等，误配易导致会话被恶意页面滥用。第一版聚焦 **本机 / 同源** 调试；若日后前后端分离，再在服务端为**明确本地或固定域名白名单**单独配置 CORS 与 `credentials`。

## 启动

```bash
npm install
npm start
```

默认监听 `PORT` 环境变量或 **3000**。

开发环境（`NODE_ENV` 非 `production`）会在控制台打印**路由级** `[req]` 日志；请求体中的 **`password` 会以 `[REDACTED]` 代替**，不会明文落日志。未预期错误仅记录错误名与消息/堆栈（开发），**不**打印完整 `ctx.request.body`。

## 验收脚本（`npm run verify`）

在**另一终端**先执行 `npm start`，再在项目根目录执行：

```bash
npm run verify
```

脚本会串行：`POST /register`（随机用户名）→ `POST /login`（临时 Cookie 文件）→ `GET /me`（200）→ `POST /logout` → 再次 `GET /me`（401）。失败时进程退出码非 0。可通过环境变量 **`BASE_URL`** 覆盖默认的 `http://127.0.0.1:3000`（若使用其他 `PORT`，请写成完整基址，例如 `http://127.0.0.1:4000`）。

### Windows

- **PowerShell**：若已安装 `curl.exe`（Windows 10 及以上通常自带），可在仓库根目录执行  
  `pwsh -File scripts/verify-flow.ps1`  
  或  
  `powershell -File scripts/verify-flow.ps1`  
  同样支持环境变量 `BASE_URL`。
- **未安装 Bash 时**：可用 **Git Bash** 在项目根目录执行 `bash scripts/verify-flow.sh`，与 macOS/Linux 上 `npm run verify` 等价（需本机已安装 Git for Windows）。

## 用户数据路径与限制

- **文件路径**：仓库根目录下 `data/users.json`（相对路径：`data/users.json`）。
- **格式**：JSON 数组；元素字段包含 `id`（自增数字）、`username`、`passwordHash`（bcrypt）。响应中**绝不**返回密码或哈希。
- **启动行为**：进程启动时读入该文件；若文件不存在，则视为空数组并在首次成功注册时创建文件。
- **写入串行化**：对 `users.json` 的写回通过内存中的 **Promise 链队列** 串行执行，避免同一进程内并发写交错。
- **多进程 / 多实例**：本方案**不**适合多个 Node 进程或多个容器实例同时写同一 `users.json`（会互相覆盖或损坏文件）。请仅在 **单进程开发** 下使用；若需多实例，应改用数据库或共享存储并另行设计并发控制。

## HTTP 约定

- **错误响应**（JSON）：`{ "error": "<机器可读码>", "message": "<人类可读说明>" }`。
- **`POST /register`**：请求头须为 `Content-Type: application/json`；否则 **415**，错误码 `UNSUPPORTED_MEDIA_TYPE`。请求体须为合法 JSON；否则 **400**，错误码 `INVALID_JSON`。
- **成功注册**：**201**，`{ "ok": true, "user": { "id", "username" } }`。
- **用户名已存在**：**409**，`error` 为 `USERNAME_TAKEN`。
- **字段校验失败**：**400**，`error` 为 `VALIDATION_ERROR`。

## 健康检查

- `GET /health` → `{ "ok": true }`。

## 中间件顺序（应用与受保护路由）

全局 `app.use` 自上而下执行；`GET /me` 在路由层显式串联 **`requireAuth`**，保证 **先解析 Session，再校验登录，再执行业务**。

```text
请求
  │
  ▼
┌─────────────────────────┐
│ 全局错误处理（最外层）   │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ koa-bodyparser          │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ koa-session（解析 Cookie，填充 ctx.session）
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ koa-router 匹配路由      │
└───────────┬─────────────┘
            │
            │  以 GET /me 为例：
            ▼
┌─────────────────────────┐
│ requireAuth（无 userId   │  ──未通过──► 401 + 统一错误体
│ / username 则 401）      │
└───────────┬─────────────┘
            ▼ 通过
┌─────────────────────────┐
│ 业务：返回 { user: … }   │
└───────────┬─────────────┘
            ▼
        响应
```

- **`GET /me`**：已登录 **200**，`{ "user": { "id", "username" } }`；未登录 **401**，`error` 为 `UNAUTHORIZED`（与全局错误体形状一致）。

## 会话与登录相关接口（摘要）

- **`POST /login`**：成功后在 `Set-Cookie` 中下发 `app_session`。
- **`GET /me`**：须携带有效会话 Cookie；顺序上依赖全局 `session` 中间件，路由内再经 `requireAuth`。
- **`POST /logout`**：清除会话；契约约定未登录调用仍可 **200**（幂等）。

