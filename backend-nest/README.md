# Backend NestJS

## Quick Start

1. Copy env template:
   - `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`)
2. Install dependencies:
   - `npm install`
3. Generate prisma client:
   - `npm run prisma:generate`
4. (Optional) push schema to PostgreSQL:
   - `npm run prisma:push`
5. (Optional) seed sample data:
   - `npm run prisma:seed`
6. Community video uses **ffmpeg / ffprobe**，通过 npm 包 `ffmpeg-static` / `ffprobe-static` 提供，`npm install` 时自动下载，无需手动安装。
   - 国内网络如下载失败，可用 npmmirror 镜像：`FFMPEG_BINARIES_URL=https://cdn.npmmirror.com/binaries/ffmpeg-static npm install`
7. Start API:
   - `npm run start:dev`
   - staging run: `npm run start:staging`
   - production run: `npm run start`


API base: `http://127.0.0.1:8000`

Available endpoints:

- `GET /health`
- `POST /api/v1/recommend/by-ingredients`
- `POST /api/v1/dishes/search`

Notes:

- Services use real database data only (no mock fallback).
- Database unavailable => API returns service unavailable error.
- AI summary uses Doubao first and falls back to local rule-based summary.
- `dishes/search` returns `summarySource` (`doubao` or `local_rules`) for observability.
- DBeaver guide: `docs/database_setup_dbeaver.md`
- `ARK_API_KEY` configured => dish steps summary uses Doubao HTTP API.
- `NODE_ENV` values: `development` / `staging` / `production`.
- `staging` is pre-production testing environment (close to production, for verification before release).
