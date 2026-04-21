# Mobile App (React Native + Expo)

## Quick Start

1. `npm install`
2. `npm run start:dev`
3. In Expo DevTools, run Android/iOS/Web target.

## Environment Variables

- `.env.development`
- `.env.staging`
- `.env.production`

Core variable:

- `EXPO_PUBLIC_API_BASE_URL`

Environment scripts:

- `npm run start:dev`
- `npm run start:staging`
- `npm run start:prod`

Notes:

- Build-time env var is the default source of API base URL.
- In development only, app provides a local override panel for quick real-device debugging.
