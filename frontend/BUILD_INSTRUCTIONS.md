# FIND ME AI - Production Build Instructions

## Prerequisites

### 1. Firebase Setup (Required)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing: "find-me-ai"
3. Add Android app:
   - Package name: `com.findmeai.app`
   - Download `google-services.json`
   - Replace the placeholder file in `/app/frontend/google-services.json`

### 2. EAS Account Setup
```bash
cd /app/frontend
npm install -g eas-cli
eas login
# Or create account: eas register
```

### 3. Configure EAS Project
```bash
eas init --id find-me-ai-production
# This links your project to EAS
```

## Build Commands

### Option 1: Quick Production Build (Recommended)
```bash
cd /app/frontend
eas build --platform android --profile production
```

This will:
- Build Android App Bundle (.aab)
- Sign with EAS managed credentials
- Upload to EAS servers
- Provide download link

### Option 2: Local Build (Advanced)
```bash
eas build --platform android --profile production --local
```

### Option 3: Preview Build (Testing)
```bash
eas build --platform android --profile preview
# Generates APK for internal testing
```

## Build Output

After successful build:
1. Download the `.aab` file from EAS dashboard
2. File will be named: `build-XXXXX.aab`

## Google Play Console Upload

### 1. Create App Listing
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app: "Find Me AI"
3. Fill in app details, description, screenshots

### 2. Configure In-App Products
1. Navigate to: Monetization → Products → In-app products
2. Create products matching our IDs:
   - **persona_single**: $1.99 (₺79)
   - **persona_all**: $6.99 (₺299)

3. Create subscription:
   - **persona_unlimited**: $4.99/month (₺149/month)

### 3. Upload AAB
1. Go to: Release → Testing → Closed testing
2. Create new release
3. Upload the `.aab` file
4. Add release notes
5. Review and rollout to closed testing track

### 4. Configure Testers
1. Create tester list (email addresses)
2. Share opt-in URL with testers
3. Testers can install via Play Store

## Environment Variables for Production

Make sure backend `.env` has:
```
EMERGENT_LLM_KEY=sk-emergent-e043dE2Be7e6388A36
ADMIN_API_KEY=your-secure-admin-key-here
MONGO_URL=your-production-mongo-url
```

## Post-Build Checklist

- [ ] Firebase `google-services.json` configured
- [ ] EAS project initialized
- [ ] Build completed successfully
- [ ] AAB downloaded
- [ ] Google Play app created
- [ ] In-app products configured
- [ ] AAB uploaded to closed testing
- [ ] Testers added and notified
- [ ] Backend deployed and accessible
- [ ] Test on real device

## Testing the Build

1. Install via Play Store (closed testing)
2. Test full flow:
   - Take selfie
   - Complete quiz
   - Generate persona
   - View results
   - Share functionality
   - (IAP testing requires real payment setup)

## Troubleshooting

### Build Fails
```bash
# Clear cache and retry
eas build:cancel
eas build --platform android --profile production --clear-cache
```

### Firebase Not Found
- Ensure `google-services.json` is properly configured
- Package name must match: `com.findmeai.app`

### IAP Not Working
- Products must be published in Play Console
- Test with licensed testers only
- Use real payment method for testing

## Next Steps After Closed Testing

1. Gather feedback from testers
2. Fix any critical bugs
3. Increment version number in `app.json`
4. Build new version
5. Move to Open Testing or Production

## Support

For EAS Build issues: https://docs.expo.dev/build/introduction/
For Play Console: https://support.google.com/googleplay/android-developer
