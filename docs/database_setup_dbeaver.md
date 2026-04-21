# Prisma + DBeaver 数据库连接指南

## 1. 先理解关系

- Prisma 不是数据库，它是 ORM 和数据模型工具。
- DBeaver 连接的是 PostgreSQL（真实数据库）。
- 你的项目里，Prisma 和 DBeaver 都连接同一个 PostgreSQL 实例即可。

## 2. 项目内配置步骤

在 `backend-nest` 目录执行：

```bash
Copy-Item .env.example .env
```

确认 `.env` 中 `DATABASE_URL` 类似如下：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cooking_ai_app?schema=public"
```

再执行：

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

说明：

- `prisma:push`：把 Prisma schema 同步到数据库建表。
- `prisma:seed`：写入样例数据（西红柿炒蛋、可乐鸡翅等）。

## 3. DBeaver 连接参数

在 DBeaver 新建 PostgreSQL 连接，填下面参数：

- Host: `localhost`
- Port: `5432`
- Database: `cooking_ai_app`
- Username: `postgres`
- Password: `postgres`

连接后刷新：

- `Schemas` -> `public` -> `Tables`

你应当能看到：

- `Dish`
- `Ingredient`
- `DishIngredient`
- `Video`

## 4. 验证是否连通

在 DBeaver 执行 SQL：

```sql
SELECT name FROM "Dish";
```

预期返回至少：

- 西红柿炒蛋
- 可乐鸡翅

## 5. 常见问题排查

1. 看不到表
   - 检查是否执行了 `npm run prisma:push`。
   - 检查 DBeaver 连接的数据库名是否是 `cooking_ai_app`。

2. 连接失败
   - PostgreSQL 服务是否已启动。
   - 端口是否真是 `5432`。
   - 用户名/密码是否与 `DATABASE_URL` 一致。

3. 看不到数据
   - 检查是否执行了 `npm run prisma:seed`。
   - 执行 `SELECT COUNT(*) FROM "Dish";` 确认记录数。
