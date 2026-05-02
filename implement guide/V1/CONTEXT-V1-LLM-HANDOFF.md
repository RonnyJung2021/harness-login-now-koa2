# 第一版实现上下文（面向大模型 / 后续 Task 交接）

**用途**：在开启新 Task 时，将本文件与下方「长期锚点」一并纳入上下文，即可在**不依赖**仓库根目录 `README.md` 等文档的前提下，恢复「已交付什么、契约是什么、代码在哪」的共识。  
**约定**：下文**唯一**将 `implement guide/` 及其子目录（当前为 **`V1/`**）内的 Markdown 视为可长期关联的规范来源；其它路径仅作事实描述，不作为「权威文档链接」。

**目录结构（避免 @ 错路径）**：第一版 Harness 分步指南与本交接文档在 **`implement guide/V1/`**；跨版本 API 契约仍放在 **`implement guide/NOTES-API-CONTRACT.md`**（与 `V1/` 同级）。

---

## 长期锚点（实现前必读）

| 文件 | 角色 |
|------|------|
| `implement guide/V1/KOA2登录系统-Harness与Cursor分步指南.md` | 分阶段目标、Harness 对照、阶段 0～7 操作说明 |
| `implement guide/NOTES-API-CONTRACT.md` | HTTP 状态码、JSON 形状、Cookie 名与属性、错误码的**单一事实来源** |
| `implement guide/V1/CONTEXT-V1-LLM-HANDOFF.md` | 本文件：第一版实现快照与中间件/验收要点 |

接口行为以 **`implement guide/NOTES-API-CONTRACT.md`** 为准；与代码不一致时应先改契约再改实现（或显式记录例外）。

---

## 与分步指南的对照（当前进度）

- **阶段 0～2**：API 契约已落盘；根目录 Node + Koa2；`GET /health` → `{ "ok": true }`；`PORT` 环境变量，默认 `3000`；**CommonJS**（`package.json` 未设 `"type":"module"`）。
- **阶段 3**：`data/users.json` 持久化；`POST /register` 201 / 校验 400 / 非 JSON Content-Type **415** / 冲突 **409**；bcrypt 存 `passwordHash`；写盘经队列串行化（`userStore.runSerialized`）。
- **阶段 4～5**：`koa-session`，Cookie 名 **`app_session`**，`httpOnly`、`SameSite=Lax`、`Path=/`；内存 `Map` 自定义 store（非 Redis）；`POST /login` 成功写 `ctx.session.userId` / `username`；`POST /logout` 幂等 200，`ctx.session = null`；`GET /me` + **`requireAuth`** 中间件。
- **阶段 6**：`npm run verify` → `bash scripts/verify-flow.sh`（需**已启动**服务；`BASE_URL` 可覆盖默认 `http://127.0.0.1:3000`）。
- **阶段 7（文档/运维）**：分步指南中的 README 自检、`.env` 说明等**不纳入本交接文件的关联范围**；以代码与 **`implement guide/V1/` 分步指南** + **`implement guide/NOTES-API-CONTRACT.md`** 为准。代码侧已具备：`SESSION_KEYS`（逗号分隔多密钥）、开发默认弱密钥、日志中对 `password` 脱敏、全局 `HttpError` JSON 化。

---

## 技术栈与入口

- **运行时**：Node；入口 `src/index.js`（`npm start`）。
- **依赖**：`koa`、`koa-router`、`koa-bodyparser`、`bcrypt`、`koa-session`（`koa-session` 使用 `.default` 引入）。
- **`npm test`**：仍为占位（失败退出），**不作为**验收路径；链路验收以 **`npm run verify`** 为准。

---

## 源码布局（职责一句话）

| 路径 | 职责 |
|------|------|
| `src/index.js` | 应用组装：错误处理 → `bodyParser` → 开发请求日志（脱敏 body）→ `session` → 路由 → 404 JSON |
| `src/userStore.js` | `loadUsers` / `findUserByUsername` / `registerUser`；`data/users.json` 读写；用户 `id` 为自增数字 |
| `src/middleware/requireAuth.js` | 未登录抛 `HttpError` 401 `UNAUTHORIZED` |
| `src/lib/httpError.js` | `{ status, error, message }` 供全局 catch 序列化 |
| `scripts/verify-flow.sh` | 注册随机用户 → 登录 → `/me` → `logout` → `/me` 期望 401 |

---

## 中间件顺序（请求路径）

自上而下：**全局 try/catch（`HttpError` + `SyntaxError` → 400 `INVALID_JSON`）** → **`koa-bodyparser`（仅 JSON）** → **（开发）请求日志** → **`koa-session`** → **路由** → **404**。

受保护路由：`router.get('/me', requireAuth, handler)`，保证 session 已解析后再鉴权。

---

## 与契约对齐的实现要点（浓缩）

- **错误体**：统一 `{ "error", "message" }`；业务错误多用 `HttpError`；非 `HttpError` 开发环境打 `[internal]` 栈，**不**打印请求 body。
- **登录失败**：用户不存在与密码错误合并为 **401** `INVALID_CREDENTIALS`。
- **登出未登录**：仍 **200** `{ "ok": true }`（幂等）。
- **Session**：signed cookie；`NODE_ENV === 'production'` 时 `secure: true`（本地 HTTP 需注意）。
- **`app.keys`**：`process.env.SESSION_KEYS` 按逗号拆分；缺省为开发用占位字符串。

---

## 下一 Task 常见延伸（非必须，仅提示）

- 替换占位 `npm test`、补充 `.env.example`、与分步指南阶段 7 完全对齐的运维文档。
- 多实例 / 生产级 session 存储、刷新会话、限流、审计日志等——均超出当前第一版范围；改动前应先更新 **`implement guide/NOTES-API-CONTRACT.md`**。

---

**版本**：与仓库当前「首次完整链路」实现同步；后续迭代请在 Task 中说明变更点并优先更新 **`implement guide/NOTES-API-CONTRACT.md`**。
