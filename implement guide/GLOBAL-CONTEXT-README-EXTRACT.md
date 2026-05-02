# README 全局上下文摘录（跨会话 / 交接用）

**用途**：补充「读代码不易一眼得到」的运维与设计边界；路由、中间件顺序、错误体与接口细节以代码及 **`implement guide/NOTES-API-CONTRACT.md`** 为准。  
**其它文档**：实现快照 **`implement guide/V1/CONTEXT-V1-LLM-HANDOFF.md`**；分步 **`implement guide/V1/KOA2登录系统-Harness与Cursor分步指南.md`**；Harness 对照 **`HARNESS-SELF-CHECK.md`**。

---

## 环境变量与 `.env`

本仓库**未**内置 `dotenv`，需在 shell / systemd / Docker 等中自行注入（例如 `set -a && source .env && set +a`）。

| 变量 | 说明 |
|------|------|
| **`SESSION_KEYS`** | **生产务必配置**：`koa-session` 签名密钥，可英文逗号分隔多个。未设置时源码内仅为开发占位，**不可用于生产**。`app.keys` 的解析见 **`src/index.js`**。 |
| **`PORT` / `NODE_ENV`** | 监听端口与 Cookie `Secure`、内部错误日志等行为见 **`src/index.js`**。 |

生成随机密钥（一行）：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

勿将 **`.env`** 提交到 Git（根目录 **`.gitignore`** 已忽略 `.env`、`.env.*`）。

---

## CORS（第一版）

未做宽泛 CORS，依赖浏览器**同源**即可配合当前 **httpOnly Cookie** 会话。若日后前后端分离，应对**固定白名单**单独配置 CORS 与 `credentials`，避免任意第三方带凭证跨域。

---

## 验收

另一终端先 **`npm start`**，项目根目录执行 **`npm run verify`**（`package.json` 中指向 `scripts/verify-flow.sh`）。非默认端口时设 **`BASE_URL`**（如 `http://127.0.0.1:4000`）。Windows 可用 **`scripts/verify-flow.ps1`** 或 Git Bash 执行同名 shell 脚本。

---

## `users.json` 与多实例

用户文件路径与读写逻辑在 **`src/userStore.js`**。**勿**让多个 Node 进程或多个容器**同时写同一** `data/users.json`（会互相覆盖或损坏）；多实例需换存储与并发设计。

---

**维护**：若与根目录 `README.md` 冲突，以契约与当前代码为准；更新 README 时可同步检查本摘录是否仍反映「非代码自述」部分。
