# 根目录 Koa2 登录系统：Harness 工程 + Cursor 分步实操指南

> **仓库路径**：`implement guide/V1/KOA2登录系统-Harness与Cursor分步指南.md`。配对的 API 契约为 **`implement guide/NOTES-API-CONTRACT.md`**（与本 `V1/` 目录同级；在 Cursor 中请 `@` 该完整路径，勿再使用已迁出 `V1/` 的旧文件名裸引用）。

> 本文档面向「刚接到任务的自然人」，从零开始、**正向实现**、分阶段推进；每一步写明在 **Cursor** 中的具体操作（点击位置、输入框粘贴内容、`@` 引用方式），并嵌入 **反馈—调整** 回路。概念与清单对齐仓库内两份 Harness 材料：  
> - `harness guide/juejin-post-7620226704209592360.md`（Harness 八要素与「环境总和」）  
> - `harness guide/harness-practice-web-article-to-markdown.md`（迷你 Harness 清单：意图、快照、验收、隔离等）

---

## 你最终要交付什么（输出契约，先写死）

在仓库**根目录**得到一套可运行的 **Node.js + Koa 2** 小服务，至少具备：

| 能力 | 验收方式（人可执行） |
|------|----------------------|
| 用户注册 | `POST /register` 成功返回 **201** 与明确 JSON，密码不落日志、不落明文响应（与 `implement guide/NOTES-API-CONTRACT.md` 一致） |
| 用户登录 | `POST /login` 成功后建立**会话**（httpOnly Cookie + 服务端 session，与 `implement guide/NOTES-API-CONTRACT.md` 一致） |
| 受保护资源 | `GET /me` 未登录返回 401；登录后返回当前用户标识 |
| 登出 | `POST /logout` 清除会话 |
| 可复现运行 | `README.md` 写清 `node` 版本、`npm install`、`npm start`、默认端口 |
| 轻量自动化验收 | 根目录提供 `npm test` 或 `npm run verify`（脚本 `scripts/verify-flow.sh`，见阶段六）（任选其一），能证明「注册→登录→/me→登出」链路 |

**Harness 对照**：这是「任务如何被表达」+「系统如何验证真的把事做好了」——先定契约，再写代码。

---

## 开始之前：在 Cursor 里固定「上下文」

### 你要做的操作

1. 用 Cursor 打开本仓库文件夹：`harness-login-now-koa2`。
2. 打开左侧文件树，**把下面两个文件钉住或保持打开**（减少 Context 漂移）：  
   - `harness guide/juejin-post-7620226704209592360.md`  
   - `harness guide/harness-practice-web-article-to-markdown.md`
3. 若使用 **Cursor Rules**：可在项目根后续按需添加 `.cursor/rules`（本指南不强制；若你希望 Agent 长期遵守「只用 Koa2、根目录实现」等，可在阶段七再补）。

**Harness 对照**：「上下文如何被组织」——先让模型/助手稳定看到 Harness 定义与契约，而不是从零口述概念。

---

## 阶段 0：把「意图」写成一页纸（只改仓库，不写业务代码）

### Harness 含义

对应实践文档里的 **意图**：URL（此处为 API 路径）、是否含登录态、输出路径、验收方式——先变成**可检查的句子**。

### 在 Cursor 中的操作

1. 键盘 `Cmd + L`（macOS）或 `Ctrl + L`（Windows）打开 **Chat**（聊天面板）。  
2. 在输入框里先输入 `@`，在列表中选择 **Folder** 或 **Files**，勾选整个仓库根目录（或至少 `harness guide` 文件夹）。  
3. **复制下面整段**粘贴到聊天输入框，发送：

```text
请只根据我选中的仓库内容，不要写代码。用简体中文输出一份「API 契约草案」到聊天里，包含：
1) POST /register / POST /login / GET /me / POST /logout 的请求体与响应体 JSON 字段约定（其中 register 成功建议 HTTP **201**）；
2) 会话方案固定为 httpOnly Cookie + 服务端 session（Cookie 名、SameSite、Path 写清）；
3) 密码存储必须用 bcrypt（或同等慢哈希），禁止明文；
4) 列出 5 条「验收用 curl 示例」（含 Cookie 罐 `-c`/`-b`）。
要求：每个接口写清成功与失败时的 HTTP 状态码。
```

4. 阅读模型输出；**不满意就再发一条**（反馈回流），例如：

```text
把 /login 成功后的 Set-Cookie 名称固定为 app_session，并在契约里写明 SameSite 与 Path。把失败情况按「用户名已存在 / 凭据错误 / 未登录」分类到不同状态码或统一 401 并说明理由。
```

### 阶段 0 完成标志

你心里认可「契约草案」；建议把定稿**复制**到仓库 **`implement guide/NOTES-API-CONTRACT.md`**（可选，便于以后熵管理时对照）。本指南不强制文件名。

**Harness 对照**：「反馈如何回流」——用自然语言迭代契约，比在代码里硬改成本低。

---

## 阶段 1：初始化 Node 工程（隔离与可复现）

### Harness 含义

对应实践文档的 **依赖隔离 / 环境即契约**：用 `package.json` + lockfile 把运行时钉住；不把「全局装了啥」当隐含前提。

### 在 Cursor 中的操作

1. 打开 **Terminal**（Cursor 菜单 **Terminal → New Terminal**，或快捷键 `` Ctrl+` ``）。  
2. 确认当前目录为仓库根目录（含 `harness guide` 的那一层）。  
3. 打开 **Chat**，`@` 引用终端当前路径或根目录，粘贴发送：

```text
我要在仓库根目录初始化一个 Node.js 项目用于 Koa2，请给出逐条终端命令（我复制执行）：npm init、安装 koa、koa-router、koa-bodyparser、bcrypt、以及会话方案所需依赖（如 koa-session 及与 Koa 2 配套的 session 存储依赖，由你列出）。不要跳过说明。目标：package.json 在根目录，入口为 src/index.js。
```

4. **按助手给出的命令在终端执行**；若遇 **EACCES / 权限** 或 **Node 版本不对**：在 Chat 里发：

```text
我执行 npm install 时报错：<粘贴完整终端输出>。请分类是网络、权限、还是 Node 版本问题，并给出最小改动的下一步命令。
```

**Harness 对照**：「错误如何被分类、重试、升级」——先归类再换策略（如换 nvm 版本、换 registry、用 `npm ci` 等）。

### 阶段 1 完成标志

- 根目录存在 `package.json`，`npm start` 或 `node src/...` 有明确脚本（可先占位）。  
- `npm install` 无报错。

---

## 阶段 2：最小 Koa「能听见回声」（checkpoint）

### Harness 含义

**持久化中间产物 / 可恢复**：先有一个能跑通 HTTP 的 checkpoint，再叠登录；避免一次改太多无法定位失败层。

### 在 Cursor 中的操作

1. 使用 **Composer**（`Cmd + I`）或 **Agent 模式**（以你当前 Cursor 版本为准：侧边栏 **Composer** 或 **Agent** 面板）。下文统称「**实现面板**」。  
2. 在实现面板顶部的 **上下文** 区域，点击 **Add Context**，加入：  
   - 文件夹：仓库根  
   - 文件：`harness guide/harness-practice-web-article-to-markdown.md`（用 `@` 输入路径快速引用）  
3. 在实现面板输入框 **粘贴**：

```text
在仓库根目录按阶段 0 的契约（若我没有 NOTES 文件则以你上次聊天里的契约为准）实现最小 Koa2 服务：
- 仅 GET /health 返回 { "ok": true }；
- 端口从环境变量 PORT 读取，默认 3000；
- 使用 CommonJS 或 ESM 请与 package.json 一致，不要混用；
- 不要实现登录，只要进程能启动。
改完后告诉我用哪条命令启动，以及用 curl 如何验收。
```

4. 若生成文件位置不对：追加一条消息（**不要新开对话**，保留上下文）：

```text
请把所有源码放在 src/ 下，不要散落在根目录；并更新 package.json 的 main/scripts。
```

5. 在 **Terminal** 运行助手给的启动命令；另开一个终端或同终端再执行：

```bash
curl -sS http://127.0.0.1:3000/health
```

### 阶段 2 反馈回路

| 现象 | 你在 Chat 里发什么 |
|------|---------------------|
| 端口占用 | `EADDRINUSE，请改为默认 3001 并同步 README` |
| ESM 报错 | `报错：<粘贴>。请统一为 CommonJS 或统一为 "type":"module"，选一种并修全仓库` |

**Harness 对照**：「轻量验收」——一行 `curl` 证明管道末端形态正确。

---

## 阶段 3：用户存储与密码哈希（状态结构化）

### Harness 含义

「**状态如何被保存、恢复、裁剪**」：第一版固定用 **`data/users.json`** 存用户列表；关键是**结构化**与**可清空重跑**（开发阶段）。

### 在 Cursor 中的操作

1. 打开实现面板，`@` 引用：`src/` 下已有文件 + `harness guide/juejin-post-7620226704209592360.md` 中「安全边界」一节（可选，提醒模型运行时校验）。  
2. 粘贴：

```text
实现用户持久化（固定方案，并在 README 说明路径与限制）：
使用 data/users.json：启动时读入（若不存在则视为空数组），注册等变更时写回磁盘；写入需串行化（例如单队列）或在 README 明确「仅单进程开发、勿多实例并发写同一文件」。
实现 POST /register：校验用户名与密码字段；密码 bcrypt hash 存储；成功返回 **201**；用户名唯一冲突返回 409。
不要实现 session 仍不要实现 /me，只做注册与查询内部函数。
每个错误返回 JSON：{ "error": "<机器可读码>", "message": "<人类可读>" }。
```

3. 用 `curl` 注册两次同一用户，第二次应失败；若 **500**：Chat 发：

```text
注册重复用户时返回 500，终端日志如下：<粘贴>。请分类是校验遗漏还是写入竞态，并给出修复 diff。
```

**Harness 对照**：「错误可解释」+「安全边界在运行时」——冲突是业务错误，不是「服务器炸了」。

---

## 阶段 4：登录与会话（Cookie + 服务端 session）——工具治理式分层

### Harness 含义

对应原文「**工具治理**」在 HTTP 服务里的类比：认证逻辑集中在 `authService` / `middleware`，路由层不堆判断；**Cookie 设置、密钥、过期时间**从环境变量读取。

### 在 Cursor 中的操作

1. 实现面板，`@` 你的 `implement guide/NOTES-API-CONTRACT.md`（若有）+ `src/`。  
2. 粘贴：

```text
实现 POST /login：
- 校验用户存在且 bcrypt.compare 通过；
- 使用 koa-session（或等价），session 里只存 userId 与 username，不要存密码；Cookie（如 app_session）设置 httpOnly、SameSite=Lax、Path=/；登录成功返回 { "ok": true, "user": { "id", "username" } }；
实现 POST /logout：清除服务端 session，并通过 Set-Cookie 使 app_session 失效（与契约一致）；未登录时调用 logout 仍返回 200 幂等（若契约如此约定）。
```

3. **验收**（按契约改路径与字段名）：

```bash
curl -sS -c cookies.txt -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"username":"u1","password":"p1"}' http://127.0.0.1:3000/login
curl -sS -b cookies.txt http://127.0.0.1:3000/me
```

若 `/me` 仍 401：Chat 发：

```text
登录后 /me 仍 401。请求与响应头如下：<粘贴 curl -v 输出>。请判断是 Cookie 未写入、域名/Path 不匹配，还是 session 中间件顺序问题，并修复。
```

**Harness 对照**：「反馈如何回流」——用 `-v` 与真实头信息驱动修复，而不是猜。

---

## 阶段 5：受保护路由与中间件顺序（上下文裁剪）

### Harness 含义

「**上下文裁剪**」：未认证请求不进入业务处理器；统一 401 体，避免每个路由复制粘贴。

### 在 Cursor 中的操作

实现面板粘贴：

```text
实现 GET /me：读取当前登录用户，返回 { "user": { "id", "username" } }；未登录 401。
抽一个 requireAuth 中间件，保证在 router 中的顺序正确（先 session 解析，再 requireAuth，再业务）。
列出中间件顺序示意图在 README 一小节。
```

**Harness 对照**：八要素里的「上下文组织」——默认少暴露内部堆栈给客户端（生产可加统一错误处理）。

---

## 阶段 6：Harness 式「轻量验收」落地（脚本或测试）

### Harness 含义

对应实践文档第 8 步：**文件/命令级验收**，证明管道末端形态；以后站点改版（此处为 API 改版）时回到脚本修契约。

### 在 Cursor 中的操作

1. 实现面板：

```text
在根目录添加 scripts/verify-flow.sh（bash），串行执行：注册新随机用户 → 登录 → 带凭证访问 /me → logout → 再访问 /me 应 401。使用 curl 与临时 cookie 文件。脚本失败 set -e 退出非 0。在 package.json 增加 "verify": "bash scripts/verify-flow.sh"。
若我是 Windows 用户，请额外提供 scripts/verify-flow.ps1 或在 README 说明用 Git Bash 跑 sh。
```

2. 终端执行：`npm run verify`。

若失败：把 **完整输出** 粘贴到 Chat，并 `@scripts/verify-flow.sh`。

**Harness 对照**：「系统如何验证真的把事做好了」——从「我觉得行」变成「脚本绿」。

---

## 阶段 7：安全边界与 README 契约（熵管理预埋）

### Harness 含义

原文：**安全不能只靠自觉**；实践文档：**写入范围限定、不可信输入不 eval**。登录系统常见雷区：明文密码日志、弱 session 密钥、把 `SESSION_KEYS` 等密钥提交进 Git。

### 在 Cursor 中的操作

实现面板：

```text
补充 README.md：必需环境变量（如 SESSION_KEYS）、生成随机密钥的一行命令示例、禁止把 .env 提交（检查 .gitignore）。
代码侧：确保错误日志不打印密码；开发环境可打印路由级 info，但不要打印 req.body.password。
若存在 CORS 需求，第一版仅允许本地调试来源或关闭跨域（说明理由）。
```

再在 **Chat** 里 `@README.md`，发：

```text
以 Harness 八要素各用一句话对照本登录系统：指出我们哪里做了任务表达、验证、错误分类、状态保存。输出到聊天即可。
```

把这条输出**另存**为 `HARNESS-SELF-CHECK.md`（可选，作为以后熵管理时的对照快照）。

**Harness 对照**：「熵管理」——README 与自检表是防止项目知识腐烂的锚点。

---

## 附录 A：各阶段与 Harness 八要素速查

| Harness 要素 | 在本任务中的落点 |
|----------------|------------------|
| 任务如何被表达 | 阶段 0 契约 + README 的 API 表 |
| 上下文如何被组织 | Cursor 里 `@` 两份 harness 文档 + 契约文件 |
| 工具如何被治理 | npm 依赖分层、中间件顺序、auth 与路由分离 |
| 状态如何被保存/裁剪 | `data/users.json` 用户文件、session 只存必要字段 |
| 反馈如何回流 | 每阶段 curl / verify 脚本 / Chat 粘贴日志 |
| 错误如何分类与重试 | 409 冲突、401 未登录、环境类错误升级 Node 或网络 |
| 安全边界 | bcrypt、httpOnly、密钥环境变量、禁打密码日志 |
| 验证是否做好 | `npm run verify` + 手动 spot check |

---

## 附录 B：你在 Cursor 里会反复用到的快捷键（macOS）

| 目标 | 快捷键 |
|------|--------|
| 打开聊天 | `Cmd + L` |
| 打开 Composer/Agent 实现面板 | `Cmd + I`（以本机 Cursor 版本为准） |
| 终端 | `` Ctrl + ` `` |
| 在输入框引用文件 | 输入 `@` 后选择文件路径 |

---

## 附录 C：若你「从零接到任务」的第一天时间线（建议）

1. **上午**：阶段 0～1（契约 + 工程初始化）。  
2. **下午**：阶段 2～4（health → 注册 → 登录）。  
3. **次日**：阶段 5～7（/me、脚本验收、README 与安全）。

每结束一个阶段就 **git commit** 一次（若使用 Git）：每个 commit 就是一个 **checkpoint**，与 harness 实践文档中的「可恢复」一致。

---

**文档版本**：与仓库 `harness guide` 两篇材料配套；实现细节以仓库内 **`implement guide/NOTES-API-CONTRACT.md`**（API 契约）为准。若 Cursor 后续改版 UI 名称，以「聊天 = 迭代契约与排错」「实现面板 = 批量改代码」二者职能为准映射即可。
