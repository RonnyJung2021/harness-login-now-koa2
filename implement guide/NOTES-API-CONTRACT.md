# API 契约草案（Koa2 登录系统）

依据仓库内 **`implement guide/V1/KOA2登录系统-Harness与Cursor分步指南.md`** 与 **`harness guide`** 中的交付目标与 Harness 思路整理：**仅契约说明，不含实现代码**。

---

## 一、全局约定

- **Base URL（开发）**：`http://127.0.0.1:3000`（若服务使用环境变量 `PORT`，示例中的端口需按实际替换）。
- **JSON API**：`POST` 类接口请求头需包含 `Content-Type: application/json`；请求体为 JSON；响应体为 JSON（除另有说明）。
- **错误体（统一形状）**：`{ "error": "<机器可读码>", "message": "<人类可读说明>" }`。
- **密码**：永不出现在响应 JSON 中；不落日志；服务端仅存 **bcrypt（或同等慢哈希）** 的哈希串，**禁止明文或可逆加密**。
- **用户持久化（与分步指南一致）**：开发期固定使用仓库内 **`data/users.json`**（JSON 数组，元素含 `id`、`username`、`passwordHash` 等实现所需字段）；进程启动时读入，变更后写回；**不采用** SQLite / better-sqlite3。并发写入须串行化，或约定单进程开发并在 README 写明。

---

## 二、会话方案：httpOnly Cookie + 服务端 Session

与分步指南「推荐」一致，**本文唯一采用**本方案。

- **优点**：令牌不交给 JS 读写，默认降低 XSS 窃取会话风险；服务端可立即作废会话（登出、封禁）；与浏览器带 Cookie 请求模型一致。
- **缺点**：跨域需处理 CORS 与 `credentials`；纯 API 客户端需显式管理 Cookie；多实例时需共享 session 存储才能水平扩展（第一版单进程可用内存 session）。

**Cookie 名**：`app_session`。

**Cookie 属性（契约建议）**：`HttpOnly; Path=/; SameSite=Lax`（本地 `127.0.0.1` 调试；若将来跨站再评估 `SameSite=None; Secure`）。

---

## 三、接口契约（含成功/失败 HTTP 状态码）

### 1）`POST /register` — 注册

| 情况 | HTTP | 请求体 | 响应体 |
|------|------|--------|--------|
| 成功 | **201** | `{ "username": string, "password": string }` | `{ "ok": true, "user": { "id": string \| number, "username": string } }`（**不得**含 `password`） |
| 字段缺失/格式不合法 | **400** | 同上 | 统一错误体；`error` 建议 `VALIDATION_ERROR` |
| 用户名已存在 | **409** | 同上 | 统一错误体；`error` 建议 `USERNAME_TAKEN` |
| 非 JSON 或缺少正确 `Content-Type` | **400** 或 **415**（实现时二选一并写 README） | — | 统一错误体 |

### 2）`POST /login` — 登录

| 情况 | HTTP | 请求体 | 响应体 / 头 |
|------|------|--------|-------------|
| 成功 | **200** | `{ "username": string, "password": string }` | 响应体：`{ "ok": true, "user": { "id", "username" } }`；响应头 **`Set-Cookie: app_session=...`**（`HttpOnly; Path=/; SameSite=Lax`） |
| 字段校验失败 | **400** | 同上 | 统一错误体 |
| 用户不存在或密码错误（对外不区分） | **401** | 同上 | 统一错误体；`error` 建议 `INVALID_CREDENTIALS` |

### 3）`GET /me` — 当前用户

| 情况 | HTTP | 请求体 | 响应体 |
|------|------|--------|--------|
| 已登录 | **200** | 无 | `{ "user": { "id", "username" } }` |
| 未登录或 Session 无效 | **401** | 无 | 统一错误体；`error` 建议 `UNAUTHORIZED` |

### 4）`POST /logout` — 登出

| 情况 | HTTP | 请求体 | 响应体 |
|------|------|--------|--------|
| 成功清除服务端会话并使 Cookie 失效 | **200** | 无或 `{}` | `{ "ok": true }`；并 **`Set-Cookie`** 清除或覆盖 `app_session`（过期、`Max-Age=0` 等，实现方式在 README 写明） |
| 未登录时调用登出（**定稿**） | **200** | 无或 `{}` | `{ "ok": true }`（幂等、避免信息侧信道；不返回 401） |

---

## 四、密码存储（契约重申）

- 仅存 **`passwordHash`**（bcrypt 等）；禁止存 `password` 明文。
- 校验使用 **`bcrypt.compare`**（或等价 API）。
- 安全边界在运行时与存储层落实，不依赖「自觉不写日志」。

---

## 五、验收用 curl 示例（Cookie 罐）

假定服务在 `http://127.0.0.1:3000`，Cookie 写入当前目录 `./cookies.txt`。

### 1. 注册成功（期望 201）

```bash
curl -sS -i -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}' \
  http://127.0.0.1:3000/register
```

### 2. 重复注册同一用户名（期望 409）

```bash
curl -sS -i -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"any"}' \
  http://127.0.0.1:3000/register
```

### 3. 登录并写入 Cookie 罐（期望 200，响应头含 Set-Cookie）

```bash
curl -sS -i -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}' \
  http://127.0.0.1:3000/login
```

### 4. 携带 Cookie 访问 `/me`（期望 200）

```bash
curl -sS -i -b cookies.txt http://127.0.0.1:3000/me
```

### 5. 登出后再访问 `/me`（期望第一次 200，第二次 `/me` 为 401）

```bash
curl -sS -i -b cookies.txt -c cookies.txt -X POST http://127.0.0.1:3000/logout
curl -sS -i -b cookies.txt http://127.0.0.1:3000/me
```

---

## 六、与 Harness 文档的对应（备忘）

- **任务表达 / 验证**：HTTP 状态码与 JSON 形状写死，便于脚本化验收（对齐分步指南「输出契约」与 harness 实践中的轻量验收）。
- **安全边界**：Cookie 属性 + bcrypt + 密码不出响应。

---

**文档用途**：实现与 `npm run verify` 类脚本时以本文件为单一事实来源；若变更接口，先改本契约再改代码。
