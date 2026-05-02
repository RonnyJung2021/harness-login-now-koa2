# Koa2 登录系统 V2：全量 TypeScript — Harness + Cursor 分步实操（精简版）

> **仓库路径**：`implement guide/V2/KOA2登录系统-V2-TypeScript-Harness与Cursor分步指南.md`。  
> **前置**：V1 已在根目录交付可运行 **CommonJS + `src/*.js`** 链路；事实与文件布局以 **`implement guide/V1/CONTEXT-V1-LLM-HANDOFF.md`** 为准。API 行为仍以 **`implement guide/NOTES-API-CONTRACT.md`** 为单一事实来源（V2 **不改契约**，只加类型与构建链）。

> 本文面向「刚接到任务的自然人」：从零理解任务、**正向迁移**、分阶段推进；每步写明 **Cursor** 操作（面板、点击、`@`、粘贴块），并嵌 **反馈—调整**。概念对齐仓库内 Harness 材料：  
> - `harness guide/juejin-post-7620226704209592360.md`（八要素与「环境总和」）  
> - `harness guide/harness-practice-web-article-to-markdown.md`（意图、快照、验收、隔离等）

---

## V2 已定稿方案（企业级默认，全文不再二选一）

以下为本仓库 V2 的**固定技术决策**；后续阶段提示词与验收均按此执行，避免「本地一套、CI 一套」的漂移。

| 决策项 | 定稿 |
|--------|------|
| 编译与启动 | **仅**使用 `tsc` 输出到 **`dist/`**；`npm start` 固定为 **`node dist/index.js`**。不在官方脚本路径中引入 `tsx` / `ts-node` 直接跑 `src`（开发与生产**同一套产物形态**，便于 CI、镜像与排障对齐）。 |
| 本地迭代 | 推荐双终端：**终端 A** `npm run build -- --watch`（或项目内封装的 `tsc -w`）；**终端 B** 在每次成功编译后执行 `node dist/index.js`，或使用 `node --watch dist/index.js`（Node 18+）减少手工重启。可选在 `package.json` 增加 `dev` 脚本封装上述习惯，但**不得**替代 `build` + `start` 作为标准路径。 |
| `tsconfig` | **`strict: true`** 自工具链落地起启用；不采用「先关 strict 再慢慢开」的渐进策略（问题尽早暴露，减少类型债）。 |
| 模块系统 | 保持 **CommonJS**（与 V1 一致：`package.json` 不设 `"type": "module"`，或显式 `"type": "commonjs"`）。 |
| 源码形态 | `src/` 下**全部为 `.ts`**；**不**保留「部分 `.js` 由 dist 引用」的混用迁移路径。 |
| 仓库与产物 | **`dist/` 必须加入 `.gitignore`**；版本库只保留 TypeScript 源码与锁文件；部署与验收流水线执行 `npm ci`（或 `npm install`）→ `npm run build` → `npm start`。 |
| 契约与脚本 | HTTP/JSON/Cookie/错误体以 **`NOTES-API-CONTRACT.md`** 为准；**不修改** `scripts/verify-flow.sh` 的状态码期望。若脚本默认 `BASE_URL` 与本地 `PORT` 不一致，应在 **README** 中写清「启动端口」与「验证时 `BASE_URL`」的对照，避免口头约定。 |
| 知识交接 | 完成阶段 4 后**必须**新增 **`implement guide/V2/CONTEXT-V2-LLM-HANDOFF.md`**（与 V1 交接文档同级角色），作为后续 Task / 大模型的单一入口快照。 |

---

## V2 你要交付什么（输出契约）

| 能力 | 验收（人可执行） |
|------|------------------|
| 行为零回归 | `POST /register`、`POST /login`、`GET /me`、`POST /logout`、`GET /health` 与 **`implement guide/NOTES-API-CONTRACT.md`** 一致；`npm run verify` 在**已启动服务**下仍通过 |
| 源码为 TypeScript | `src/` 下业务与中间件**均为** **`.ts`**；`npm start` 仅启动 **`tsc` 编译产物**：**`node dist/index.js`** |
| 类型与构建可复现 | 根目录 `tsconfig.json`（含 **`strict: true`**）；`package.json` 含 **`build`**（`tsc` 或 `tsc -p`）与上述 **`start`**；README 写明：Node 版本（建议对齐 **Node LTS**）、`npm install`、`npm run build`、`npm start`、`npm run verify` 的**先后顺序** |

**Harness 对照**：任务表达 = 「行为不变 + 源码全 TS + 标准 build/start 与 verify」；验证 = 契约 + verify 脚本。

---

## 开始前：在 Cursor 里固定上下文

1. **File → Open Folder** 打开仓库根 `harness-login-now-koa2`。  
2. 左侧文件树保持打开或钉住：  
   - `harness guide/juejin-post-7620226704209592360.md`  
   - `harness guide/harness-practice-web-article-to-markdown.md`  
   - `implement guide/V1/CONTEXT-V1-LLM-HANDOFF.md`  
   - `implement guide/NOTES-API-CONTRACT.md`  
   - **本文** `implement guide/V2/KOA2登录系统-V2-TypeScript-Harness与Cursor分步指南.md`（含已定稿方案表）  
3. 后续所有提示词里用 **`@`** 引用上述路径（在 Chat / Composer / Agent 输入框输入 `@`，选 **Files**，点选文件），避免模型猜错目录。

**Harness 对照**：上下文组织 — 先钉住契约、V1 快照与 **V2 定稿方案**，再谈迁移。

---

## 阶段 0：意图一页纸（只聊天，不写业务逻辑）

**Harness**：意图 = 范围、输出形态、如何验收。

### Cursor 操作

1. `Cmd + L`（macOS）或 `Ctrl + L`（Windows）打开 **Chat**。  
2. **`@`** 勾选：本文 **`KOA2登录系统-V2-TypeScript-Harness与Cursor分步指南.md`**（重点：**「V2 已定稿方案」** 表）、`implement guide/V1/CONTEXT-V1-LLM-HANDOFF.md`、`implement guide/NOTES-API-CONTRACT.md`、`package.json`。  
3. **粘贴发送**（用于对齐团队理解，而非再开放技术选型）：

```text
已按仓库 V2 指南采用企业级定稿：tsc→dist、start=node dist/index.js、strict:true、CommonJS、src 全 .ts、dist 进 .gitignore、verify 脚本不改。请用简体中文复述这 6 点，并补充：若 verify 的 BASE_URL 与本地 PORT 不一致时 README 应如何写清。
```

### 反馈—调整

若端口、CI 镜像或 Node 版本有特殊约束，在 Chat 里追加一条**约束说明**即可；**不**再讨论是否改用 `tsx` 或是否关闭 `strict`。

**完成标志**：参与者能不看辩论记录，口述 **build → start → verify** 顺序与 **dist 不进库** 两条铁律。

---

## 阶段 1：工具链与隔离（package.json 为契约）

**Harness**：依赖隔离 / 环境即契约。

### Cursor 操作

1. **Terminal → New Terminal**（`` Ctrl+` ``），`cd` 到仓库根。  
2. 打开 **Composer / Agent**（如 `Cmd + I`），**Add Context**：`package.json`、`src/` 文件夹。  
3. **粘贴**：

```text
为当前 Koa2 登录项目增加 TypeScript 工具链（企业级定稿，保持 CommonJS）：
- devDependencies：typescript、与当前 Node LTS 匹配的 @types/node；为 koa、koa-router、koa-bodyparser、koa-session 安装对应 @types/*（bcrypt@6 若自带类型则不必重复安装 @types/bcrypt）。
- tsconfig.json：rootDir=src、outDir=dist、module=commonjs、target/lib 与 Node LTS 一致、strict=true、sourceMap 建议 true（便于线上栈映射）。
- package.json："main" 指向 "dist/index.js"；"build": "tsc"（或 tsc -p .）；"start": "node dist/index.js"。不要将 start 绑到 src 下的 .ts 文件。
- 将 dist/ 加入 .gitignore；若已有忽略规则则合并为一行。
不要改业务逻辑，仅保证 npm run build 能生成 dist；允许极少数有依据的断言收窄类型，避免无意义 any。
```

4. 在终端执行：`npm install`，再 `npm run build`。

### 反馈—调整

| 现象 | 在 Chat 里发（并 `@tsconfig.json` 与报错涉及的 `src/...`） |
|------|--------------------------------------------------------------|
| `npm run build` 大量红错 | `完整 tsc 输出：<粘贴>。请按「先能通过编译」优先级分批修复，第一批只动类型与导入，不改运行时行为。` |
| 缺 @types | `报错提示找不到模块 xxx 的类型。请列出应安装的 @types 包及 npm 命令。` |

**完成标志**：`npm run build` 成功生成 `dist/`（且 `dist/` 已被忽略）；`node dist/index.js` 能启动（可先未测全链路）。

**Harness**：错误分类 — 区分「缺类型」「strict 过严」「模块解析」再改。

---

## 阶段 2：checkpoint — 入口 `index.ts` 可运行

**Harness**：持久化中间产物 / 可恢复 — 先一条链路再铺开。

### Cursor 操作

1. Composer **Add Context**：`src/index.js`（迁移中的源参考）或已存在的 `src/index.ts`、`implement guide/V1/CONTEXT-V1-LLM-HANDOFF.md`。  
2. **粘贴**：

```text
将应用入口迁移为 src/index.ts，删除 src/index.js，避免 src 下同名双轨。
不采用「其余文件仍为 .js 仅从 dist 引用」的混用方案：若当前 tsc 无法单文件编译，则按依赖顺序同步把被入口直接 import 的模块改为 .ts，直到入口链可单独 build 通过。
要求：npm run build && node dist/index.js 后，curl GET /health 与 V1 行为一致（含 PORT 环境变量语义不变）。
```

3. 终端：`npm run build && node dist/index.js`，另开终端：`curl -sS http://127.0.0.1:<PORT>/health`（`<PORT>` 与当前 `.env` 或默认一致）。

### 反馈—调整

```text
/health 正常但启动有 deprecation 警告：<粘贴>。请最小改动消除警告或说明可忽略原因。
```

**完成标志**：`/health` 与 V1 一致；**入口链**已为纯 `.ts` 编译路径。

---

## 阶段 3：全量迁移 `src/**/*.ts`

**Harness**：工具治理 — 类型集中在类型层，业务分层与 V1 一致（`userStore`、`requireAuth`、`httpError` 等）。

### Cursor 操作

1. Composer **`@`**：`src/` 整个文件夹 + `implement guide/V1/CONTEXT-V1-LLM-HANDOFF.md`。  
2. **粘贴**：

```text
将 src 下剩余 .js 全部改为 .ts，删除对应 .js；确保 src 目录无遗留 .js（工具脚本与 verify 除外）。
补齐 Koa Context 上 session 的声明（模块 augmentation 或 src/types/koa.d.ts 等单一入口），避免滥用 any。
保持运行时行为与 NOTES-API-CONTRACT 一致；不要改 scripts/verify-flow.sh 的 URL 与期望状态码。
改完后列出从仓库根执行的固定顺序：npm run build →（起服务）npm start →（另终端）BASE_URL=... npm run verify。
```

3. 全量验收：终端 A `npm run build && npm start`（或先 build 再起 `node dist/index.js`）；终端 B 按 README 设定 **`BASE_URL`** 后执行 `npm run verify`。

### 反馈—调整

| 现象 | 粘贴模板 |
|------|----------|
| verify 失败 | `verify 输出：<粘贴>。请区分是服务未启动、端口、还是响应体变化，只修复与 TS 迁移相关的回归。` |
| session 类型报错 | `@src 与错误信息：koa-session 类型与 ctx.session 赋值不兼容，请给出最小 augmentation 示例。` |

**完成标志**：`npm run build`、`curl` 抽测、`npm run verify` 均符合契约；`src/**/*.ts` 无遗漏 `.js`。

---

## 阶段 4：文档与交接（README + CONTEXT-V2）

**Harness**：验证是否做好 + 熵管理 — 后人能照文档复现；**企业级要求知识显式落盘**。

### Cursor 操作

1. Composer **`@README.md`**（若无可创建），**粘贴**：

```text
更新 README：明确源码为 TypeScript；标准路径为 npm run build 再 npm start（不要写「直接 node src」）；写明推荐 Node LTS 版本、PORT 与 verify 所用 BASE_URL 的对照示例；链接 implement guide/NOTES-API-CONTRACT.md 作为 API 权威，不重复粘贴整份契约正文。
确认 dist/ 已在 .gitignore 中。
```

2. **Chat** 里 **`@`** 新 README + 两份 harness 文档 + 本文定稿表，粘贴：

```text
用 Harness 八要素各一句话对照本仓库 V2：指出任务表达、验证、反馈回流、状态保存各自对应仓库中哪一类文件或命令。
```

3. **必须**：将上述 V2 快照与定稿决策整理为 **`implement guide/V2/CONTEXT-V2-LLM-HANDOFF.md`**，结构对齐 V1 的 `CONTEXT-V1-LLM-HANDOFF.md`（技术栈、入口路径为 dist、脚本命令、中间件顺序、与契约对齐要点）。后续 Task 优先 `@CONTEXT-V2` 与 `NOTES-API-CONTRACT.md`。

**完成标志**：新同事只看 README 能完成 install → build → start → verify；**且** 仓库内已存在 **`CONTEXT-V2-LLM-HANDOFF.md`**。

---

## 附录 A：V2 与 Harness 八要素速查

| Harness 要素 | V2 落点 |
|----------------|---------|
| 任务如何被表达 | 已定稿表 + 阶段 0：行为不变 + 全 TS + **仅** dist 启动 |
| 上下文如何被组织 | Cursor 固定 `@` 契约 + V1 CONTEXT + **本文定稿** + harness 两篇 |
| 工具如何被治理 | `typescript` / `tsc` / `@types/*` 版本写入 package.json；**不**把 `tsx` 纳入标准路径 |
| 状态如何被保存、裁剪 | 仍由运行时与 `data/users.json` 负责；TS 不新增第二套状态源 |
| 反馈如何回流 | `tsc` 报错、curl、`npm run verify` 输出粘贴回 Chat |
| 错误如何分类与重试 | 类型错误 vs 运行时回归；网络/权限类同 V1 指南 |
| 安全边界 | 不因 TS 打开而泄露密码日志；契约与安全约定不变 |
| 验证是否做好 | `build` 绿 + verify 绿 + 契约 spot check + **CONTEXT-V2** 已更新 |

---

## 附录 B：Cursor 快捷键速查（macOS）

| 目标 | 快捷键 |
|------|--------|
| Chat | `Cmd + L` |
| Composer / Agent | `Cmd + I`（以本机版本为准） |
| 终端 | `` Ctrl+` `` |
| 引用文件 | 输入 `@` → Files → 选路径 |

---

## 附录 C：建议提交节奏

每完成一个阶段 **`git commit`** 一次：阶段 1（工具链）、阶段 2（入口 TS）、阶段 3（全量 TS）、阶段 4（README + **CONTEXT-V2**）。与 harness 实践中的 **checkpoint / 可恢复** 一致。

---

**文档版本**：V2 = 在 V1 可运行实现上增加 TypeScript 与 **单一**构建链（`tsc` → `dist`）；接口权威仍为 **`implement guide/NOTES-API-CONTRACT.md`**。若 Cursor UI 更名，以「Chat = 定意图与排错」「Composer/Agent = 批量改代码」映射即可。
