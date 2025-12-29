# 🚀 FindMeAI Build Instructions

## Prerequisites
- Node.js 18+
- Yarn
- Expo account with EAS access
- `eas-cli` installed globally: `npm install -g eas-cli`

## Quick Start

### 1. Login to Expo
```bash
eas login
```

### 2. Build Preview APK (Internal Testing)
```bash
cd frontend
eas build --platform android --profile preview
```

### 3. Build Production AAB (Play Store)
```bash
cd frontend
eas build --platform android --profile production
```

## GitHub Actions (Automatic Builds)

| Trigger | Build Type |
|---------|------------|
| Push to `main` | Preview APK |
| Tag `v*` (e.g., v1.0.3) | Production AAB |
| Manual dispatch | Choose profile |

### Required Secrets
Add `EXPO_TOKEN` to GitHub repository secrets.

## Environment Variables
- `preview`: Uses development backend URL
- `production`: Uses production backend URL (api.findmeai.com.tr)
