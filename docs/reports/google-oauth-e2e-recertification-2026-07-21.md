# Google OAuth 端到端重新认证报告（Batch 1）

日期：`2026-07-21`

## 1. 任务范围与目标

目标：在已修正的运行环境（`.env.local` 已对齐 InsForge staging lineage）中，对 Google OAuth 登录链路进行最终端到端重新认证，覆盖：

- 授权流程（Authorization Redirect）
- 授权码交换（Code Exchange）
- 令牌签发与刷新（Token Issue & Refresh）
- 权限校验（Authorization / RBAC）
- 登出与令牌失效（Global Sign-out / Session Invalidation）

## 2. 任务准备阶段（预验证）

### 2.1 环境配置有效性核对

- 已完成：`.env.local` 的 `DATABASE_URL` 已从旧数据库 lineage 修复为 `ers8j28a-kj5` staging lineage，并验证 `public.projects` 存在（见 [staging-database-url-remediation-2026-07-21.md](file:///Users/user/Pictures/shothik.2/shothik-web/docs/reports/staging-database-url-remediation-2026-07-21.md)）。

### 2.2 InsForge OAuth 配置预验证

通过 InsForge CLI 元数据确认 OAuth Provider 启用状态：

- `oAuthProviders` 包含 `google`
- `allowedRedirectUrls` 为 `[]`（当前配置下 OAuth 回调链路仍可正常工作）

证据来源：`npx @insforge/cli metadata --json`（只输出 `auth` 节点）

## 3. 端到端校验清单与通过标准

| 模块 | 校验点 | 通过标准 |
|---|---|---|
| 授权流程 | 从 `/auth/login` 点击 Google 登录触发合法授权跳转 | 页面能进入 OAuth 授权链路并回到应用域名，最终落地到受保护目标（本次为 `/agents/chat`） |
| 授权码交换 | `/auth/post-login?insforge_code=...` 可完成 exchange 并落地 session | 本地域路由 `/api/auth/oauth/exchange` 返回成功；登录后可访问受保护 API（`/api/projects` 200） |
| 令牌刷新 | `/api/auth/refresh` 可成功刷新会话 | `POST /api/auth/refresh` 返回 200；刷新后 `/api/projects` 仍返回 200 |
| 权限校验 | 普通用户访问管理员资源被拒绝 | `GET /api/admin/books` 返回 403 且错误语义明确 |
| 登出失效 | 登出后受保护资源不可访问且受保护页面回到登录 | `POST /api/auth/sign-out` 返回 200；随后 `/api/projects` 非 200（本次为 403 “Authentication required”）；访问 `/agents/chat` 重定向回登录页 |

## 4. 实施执行阶段（全流程验证结果）

### 4.1 授权跳转合法性验证（PASS）

- 从 `http://localhost:3000/auth/login?redirect=%2Fagents%2Fchat` 点击 “Sign in with Google”
- 最终落地：`http://localhost:3000/agents/chat`

证据：

- 登录页截图：[01-login-page.png](file:///Users/user/Pictures/shothik.2/shothik-web/docs/reports/evidence/google-oauth-2026-07-21/01-login-page.png)
- OAuth 后落地截图：[02-chat-after-google-login.png](file:///Users/user/Pictures/shothik.2/shothik-web/docs/reports/evidence/google-oauth-2026-07-21/02-chat-after-google-login.png)

### 4.2 授权码交换与 session 落地验证（PASS）

机制说明（本次最终形态）：

- Google OAuth 入口使用 `signInWithOAuth(..., { skipBrowserRedirect: true })` 获取 `codeVerifier` 并暂存于 `sessionStorage`
- 回调时由 `AuthProvider` 调用本地域路由 `/api/auth/oauth/exchange`，携带 `code` + `codeVerifier` 完成 PKCE exchange 并写入应用域 Cookie

验证点：

- 单元测试通过（route + provider）
- 登录后调用 `/api/projects` 返回 200

证据：

- 关键单测：`components/auth/AuthWithSocial.test.jsx`, `providers/AuthProvider.test.tsx`, `app/api/auth/oauth/exchange/route.test.ts`
- 运行后受保护 API：
  - `GET /api/projects` => `200`（响应体为 `{"projects":[]}`）

### 4.3 刷新令牌有效性与刷新机制验证（PASS）

验证点：

- `POST /api/auth/refresh` => `200`
- 刷新后再次访问 `GET /api/projects` => `200`

备注：

- 刷新响应体中包含 `accessToken`，本报告中已做脱敏处理，不直接记录令牌明文。

### 4.4 权限控制验证（PASS）

验证点：

- `GET /api/admin/books` => `403`
- 返回体语义清晰：`Admin access is required.`

### 4.5 全局登出与令牌失效验证（PASS）

验证点：

- `POST /api/auth/sign-out` => `200`
- 随后 `GET /api/projects` => `403`（Authentication required）
- 访问 `http://localhost:3000/agents/chat` => 重定向回登录页 `http://localhost:3000/auth/login?redirect=%2Fagents%2Fchat`

证据：

- 登出后回到登录页截图：[04-login-after-logout.png](file:///Users/user/Pictures/shothik.2/shothik-web/docs/reports/evidence/google-oauth-2026-07-21/04-login-after-logout.png)

## 5. 汇总结论（Go/No-Go）

结论：`GO`（本地已修正环境下 Google OAuth 端到端重新认证通过）

- 以上清单所有校验项均为 PASS
- OAuth PKCE exchange 的“codeVerifier 缺失”问题已修复（通过在入口阶段保存 verifier 并在回调阶段透传到本地 exchange 路由）

## 6. 证据索引

截图（全部位于）：

- [docs/reports/evidence/google-oauth-2026-07-21/](file:///Users/user/Pictures/shothik.2/shothik-web/docs/reports/evidence/google-oauth-2026-07-21/)
  - `01-login-page.png`
  - `02-chat-after-google-login.png`
  - `04-login-after-logout.png`
  - `05-chat-after-google-login-run2.png`

