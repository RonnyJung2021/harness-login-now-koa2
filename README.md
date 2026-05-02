<div align="center">

# harness-login-now-koa2

**Koa2 会话登录样板** · 契约先行 · 脚本闭环验收

[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](./package.json)

</div>

---

## 这是什么

根目录下的 **Node + Koa 2** 小服务：注册 / 登录 / `GET /me` / 登出；**httpOnly Cookie** 会话、**bcrypt** 存 **`passwordHash`**、用户落盘 **`data/users.json`**。  
代码是「练习体」，仓库的重心是：**用 Harness 思路把「意图 → 契约 → 分阶段实现 → 可复现验收」跑通**，便于在 Cursor 等环境里**快速迭代、少漂移、可交接**。

---

## 为何以 Harness 工程化为轴

本仓库把「迷你 Harness」拆成可执行的文档与脚本，而不是只堆功能代码——便于你或 Agent **按阶段推进、每步有判据**。

| 实践 | 在本项目中的落点 |
|------|------------------|
| **意图先成文** | 接口与 Cookie 写进 **`implement guide/NOTES-API-CONTRACT.md`**，改行为先对契约，再改实现。 |
| **上下文可钉住** | **`implement guide/V1/`** 分步指南写明 `@` 哪些文件、阶段完成标志；交接快照见 **`CONTEXT-V1-LLM-HANDOFF.md`**。 |
| **环境即契约** | **`package.json` + lockfile`** 钉依赖；**`npm run verify`** 用 `curl` 固定「证明链路」的方式，不依赖本机隐式工具链。 |
| **小步 checkpoint** | 分步指南从 `/health`、再注册、再 session，避免一次改太多难以归因。 |
| **反馈可回流** | 统一 **`{ error, message }`**、开发日志对 **`password` 脱敏**、验收脚本**非零退出**——现象能回到契约或代码。 |
| **安全边界显式** | **`SESSION_KEYS`**、`.env` 不入库、CORS 第一版策略、多实例不写同一 **`users.json`** 等，见 **`implement guide/GLOBAL-CONTEXT-README-EXTRACT.md`** 与 **`HARNESS-SELF-CHECK.md`**。 |

更细的「八要素 ↔ 本仓库」一句话对照：**[`HARNESS-SELF-CHECK.md`](./HARNESS-SELF-CHECK.md)**。

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 运行时 | Node（建议 **≥ 18** LTS） |
| Web | **Koa 2**、`koa-router`、`koa-bodyparser` |
| 会话 | **`koa-session`**，Cookie 名 **`app_session`**（详见契约） |
| 密码 | **bcrypt** → `passwordHash` |
| 持久化 | **`data/users.json`**（单进程开发向；多实例勿共写） |

模块格式：**CommonJS**（`package.json` 未设 `"type": "module"`）。

---

## 快速开始

```bash
npm install
npm start
```

默认端口 **`3000`**，可用环境变量 **`PORT`** 覆盖。生产务必配置 **`SESSION_KEYS`**（及 **`NODE_ENV=production`**）；无内置 `dotenv`，请自行注入环境变量。摘要见 **`implement guide/GLOBAL-CONTEXT-README-EXTRACT.md`**。

---

## 验收（推荐路径）

终端 **A**：`npm start`  
终端 **B**（仓库根目录）：

```bash
npm run verify
```

覆盖非默认地址时设置 **`BASE_URL`**（例如 `http://127.0.0.1:4000`）。Windows 可用 **`scripts/verify-flow.ps1`** 或 Git Bash 执行 **`scripts/verify-flow.sh`**。

---

## 仓库导览

```
├── src/
│   ├── index.js              # 应用组装、路由、错误壳、session
│   ├── userStore.js          # users.json 读写与注册逻辑
│   ├── middleware/requireAuth.js
│   └── lib/httpError.js
├── scripts/verify-flow.sh    # 链路验收（npm run verify）
├── scripts/verify-flow.ps1
├── implement guide/          # 契约、分步、交接与全局运维摘录
├── harness guide/            # Harness 理念原文（分步指南会引用）
├── HARNESS-SELF-CHECK.md
└── README.md
```

---

## 文档索引

| 文档 | 读它当你需要… |
|------|----------------|
| [`implement guide/NOTES-API-CONTRACT.md`](./implement%20guide/NOTES-API-CONTRACT.md) | **HTTP / JSON / Cookie / 错误码** 单一事实来源 |
| [`implement guide/V1/KOA2登录系统-Harness与Cursor分步指南.md`](./implement%20guide/V1/KOA2登录系统-Harness与Cursor分步指南.md) | **从零分阶段** 在 Cursor 里复现本仓库 |
| [`implement guide/V1/CONTEXT-V1-LLM-HANDOFF.md`](./implement%20guide/V1/CONTEXT-V1-LLM-HANDOFF.md) | **新 Task / 新会话** 恢复实现快照与源码职责 |
| [`implement guide/GLOBAL-CONTEXT-README-EXTRACT.md`](./implement%20guide/GLOBAL-CONTEXT-README-EXTRACT.md) | **运维向** 摘录：密钥、`.env`、CORS、多实例边界 |
| [`HARNESS-SELF-CHECK.md`](./HARNESS-SELF-CHECK.md) | **八要素** 与本项目的一行对照 |

---

## 延伸（非本仓库义务）

替换占位 **`npm test`**、补 **`.env.example`**、接入真实 DB / Redis Session、限流与审计——均属后续迭代；**先更新契约与分步文档**，再动代码，可延续同一套 Harness 节奏。

---

<div align="center">

**ISC** · 学习与工程化实验用途为主

</div>
