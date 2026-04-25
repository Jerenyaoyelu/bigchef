# BigChef 短信验证码登录技术方案（V1）

## 1. 目标与范围

### 1.1 目标
- 支持手机号验证码登录（注册/登录一体化）。
- 客户端登录后获取业务 `accessToken` 与 `refreshToken`。
- 后端用户接口改为基于鉴权用户上下文（不再依赖 `demo-user` 或 query 透传）。
- 与现有 `mobile-app + backend-nest + prisma` 架构兼容，尽量小步改造。

### 1.2 非目标（V1 不做）
- 微信登录、Apple/Google 登录。
- 复杂设备管理后台与风控平台。
- 多因子认证、异地登录提醒。

---

## 2. 现状与改造原则

### 2.1 当前现状
- 前端已具备用户相关功能（收藏、浏览历史），但历史上曾存在 `demo-user` 透传。
- 后端已有用户业务接口（收藏/历史），未接入正式登录鉴权。

### 2.2 改造原则
- 先打通最小闭环：发送验证码 -> 验证码登录 -> 业务接口鉴权。
- 先保证安全基线（验证码有效期、限流、token 轮转），再做增强。
- 与现有接口风格保持一致（`/api/v1/*`）。

---

## 3. 总体架构

### 3.1 客户端（Expo / React Native）
- 新增登录页（手机号输入、验证码输入、倒计时）。
- `authStore` 维护登录态（token + user）。
- `http` 层自动携带 `Authorization: Bearer <accessToken>`。
- access 过期时自动刷新 token 并重试一次请求。

### 3.2 服务端（NestJS）
- 新增 `auth` 模块（验证码、登录、刷新、登出、me）。
- 抽象 `sms provider`（后续接阿里云或腾讯云）。
- 使用 JWT（access/refresh 双 token）。
- 使用 Guard 注入 `req.user`，业务层按 `user.id` 查询数据。

### 3.3 数据库（Prisma / PostgreSQL）
- 新增用户、验证码、会话表。
- 收藏/历史继续复用 `userId` 逻辑，后续统一关联 `User.id`。

---

## 4. 数据模型设计（Prisma）

> 命名可按项目已有风格微调，字段语义保持一致。

### 4.1 User
- `id: String @id @default(cuid())`
- `phone: String @unique`
- `nickname: String?`
- `avatar: String?`
- `createdAt: DateTime @default(now())`
- `updatedAt: DateTime @updatedAt`

### 4.2 SmsCode
- `id: String @id @default(cuid())`
- `phone: String`
- `codeHash: String`（验证码哈希，不存明文）
- `scene: String`（固定 `login`，后续可扩展）
- `expiresAt: DateTime`
- `consumedAt: DateTime?`
- `ip: String?`
- `createdAt: DateTime @default(now())`
- 索引建议：
  - `@@index([phone, createdAt])`
  - `@@index([ip, createdAt])`

### 4.3 UserSession（Refresh Token 会话）
- `id: String @id @default(cuid())`
- `userId: String`
- `refreshTokenHash: String`
- `deviceId: String?`
- `platform: String?`
- `expiresAt: DateTime`
- `revokedAt: DateTime?`
- `createdAt: DateTime @default(now())`
- `updatedAt: DateTime @updatedAt`
- 索引建议：
  - `@@index([userId, createdAt])`
  - `@@index([expiresAt])`

---

## 5. 接口设计（Auth）

## 5.1 发送验证码
- `POST /api/v1/auth/sms/send`
- Request:
```json
{
  "phone": "13800138000",
  "scene": "login"
}
```
- Response:
```json
{
  "ok": true,
  "cooldownSec": 60
}
```

### 5.2 验证码登录
- `POST /api/v1/auth/sms/login`
- Request:
```json
{
  "phone": "13800138000",
  "code": "123456",
  "deviceId": "expo-device-id-xxx"
}
```
- Response:
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "expiresIn": 7200,
  "user": {
    "id": "usr_xxx",
    "phone": "13800138000"
  }
}
```

### 5.3 刷新 Token
- `POST /api/v1/auth/refresh`
- Request:
```json
{
  "refreshToken": "<jwt>"
}
```
- Response:
```json
{
  "accessToken": "<new_jwt>",
  "refreshToken": "<new_jwt>",
  "expiresIn": 7200
}
```

### 5.4 登出
- `POST /api/v1/auth/logout`
- Request:
```json
{
  "refreshToken": "<jwt>"
}
```
- Response:
```json
{
  "ok": true
}
```

### 5.5 当前用户信息
- `GET /api/v1/auth/me`
- Header: `Authorization: Bearer <accessToken>`
- Response:
```json
{
  "id": "usr_xxx",
  "phone": "13800138000",
  "nickname": null,
  "avatar": null
}
```

---

## 6. 鉴权改造（业务接口）

### 6.1 目标
- 收藏/历史等用户态接口不再依赖 query/user header 透传身份。
- 统一依赖 JWT Guard 从 token 中解析 `userId`。

### 6.2 改造点
- 后端：
  - 新增 `JwtAuthGuard` 与 `CurrentUser` 装饰器。
  - `profile.controller` 接口移除 `userId` query 参数读取逻辑。
  - `profile.service` 接口参数改为显式 `userId`（来自 guard）。
- 前端：
  - `profileApi` 去掉 `?userId=...`。
  - `http.ts` 自动注入 bearer token。

---

## 7. 安全与风控最小基线（V1 必做）

- 验证码 6 位、5 分钟有效、单次消费。
- 验证码只存 hash（如 `sha256(phone + code + salt)`）。
- 限流：
  - 同手机号：60 秒 1 次
  - 同 IP：每小时上限（如 20 次）
- 登录失败计数：超阈值短暂封禁（如 10 分钟）。
- access token 短期（建议 2h），refresh token 长期（建议 30d）。
- refresh token 轮转（旧 token 失效）。

---

## 8. 前端实现清单（mobile-app）

### 8.1 页面与状态
- 新增 `AuthScreen`：
  - 手机号输入
  - 获取验证码按钮 + 倒计时
  - 验证码输入 + 登录按钮
- 新增 `authStore`：
  - `accessToken`
  - `refreshToken`
  - `user`
  - `login/logout/refresh`

### 8.2 网络层
- `http.ts`：
  - 自动注入 `Authorization`
  - 遇到 401 自动刷新一次并重试原请求
  - 刷新失败清空登录态并跳转登录页

### 8.3 启动流程
- App 启动：
  - 有 `refreshToken` -> 先 refresh -> 拉 `me`
  - 无 token -> 进入登录页

---

## 9. 后端实现清单（backend-nest）

### 9.1 新增模块
- `auth.module.ts`
- `auth.controller.ts`
- `auth.service.ts`
- `sms.provider.ts`（接口 + 实现）
- `jwt.strategy.ts` / `jwt.guard.ts`

### 9.2 依赖建议
- `@nestjs/jwt`
- `passport-jwt`
- `bcryptjs`（可选，用于 token hash）

### 9.3 业务改造
- `profile` 模块改为 Guard 鉴权。
- 保留匿名访问仅用于临时开发（由环境开关控制），生产关闭。

---

## 10. 环境变量

### 10.1 backend-nest `.env`
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `JWT_ACCESS_EXPIRES=2h`
- `JWT_REFRESH_EXPIRES=30d`
- `SMS_PROVIDER=aliyun|tencent`
- `SMS_ACCESS_KEY=...`
- `SMS_ACCESS_SECRET=...`
- `SMS_SIGN_NAME=...`
- `SMS_TEMPLATE_LOGIN=...`

### 10.2 mobile-app `.env.development`
- `EXPO_PUBLIC_API_BASE_URL=http://<your-ip>:8000`

---

## 11. 分阶段排期建议

### Phase 1（1~2 天）
- DB 表与 `auth` 接口最小闭环（send/login/refresh/me）。
- 前端接登录页与 token 存储。

### Phase 2（1 天）
- 业务接口全切 Guard，移除 `demo-user` 透传链路。
- 联调收藏/历史、真机验证。

### Phase 3（0.5~1 天）
- 限流、失败封禁、日志与告警补齐。

---

## 12. 与后续 AI 能力衔接

- 当前不做 AI 登录相关耦合。
- 未来“查无菜谱 -> AI 生成并入库”时，复用登录态中的 `userId` 做生成记录与行为追踪即可。

---

## 13. 验收标准（DoD）

- 用户可通过手机号验证码登录成功并拿到 token。
- 关闭 App 重开后能自动恢复登录态。
- 收藏/历史接口在未登录时返回 401（若生产模式）。
- token 过期后可自动刷新；刷新失败会退出登录。
- 真机弱网下登录与业务请求行为可预期、无崩溃。

