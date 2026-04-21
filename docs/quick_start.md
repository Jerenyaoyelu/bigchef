# Quick Start

## 1) 启动后端（NestJS）

```bash
cd backend-nest
Copy-Item .env.example .env
npm install
npm run prisma:generate
# 可选：若本地已准备好 PostgreSQL
# npm run prisma:push
# 可选：写入样例数据（建议）
# npm run prisma:seed
npm run start:dev
```

## 2) 启动 App（React Native + Expo）

```bash
cd mobile-app
npm install
npm run start
```

在 Expo DevTools 中选择 Android / iOS / Web 运行。

## 3) DBeaver 连接数据库

参见：`docs/database_setup_dbeaver.md`
