# 🔐 CalculatorVault

A secure, privacy-focused mobile application that disguises a secret vault as a simple calculator. Hide your sensitive photos, videos, and documents in plain sight with PIN protection.

## ✨ Features

- **Calculator Disguise**: Fully functional calculator that appears normal on the home screen
- **Secret Vault**: PIN-protected storage for sensitive files
- **Multi-Category Support**: Organize files into Photos, Videos, and Documents
- **Encrypted Storage**: Every file is encrypted with AES-256-GCM before it is written to disk
- **Biometric Unlock**: Optional fingerprint / Face ID unlock
- **Auto-Lock**: Locks when the app is backgrounded and after a configurable idle time
- **File Management**: 
  - Add files to vault
  - Preview files in fullscreen
  - Download files to gallery
  - Share files securely
  - Delete files permanently
- **Dark Theme**: Modern, sleek dark UI
- **Cross-Platform**: Built with React Native and Expo (iOS, Android, Web)

## 🚀 Quick Start

### Prerequisites
- Node.js 20.19 or newer
- npm
- A development build (the app uses native modules that are not available in Expo Go):
  `npx expo run:android` / `npx expo run:ios`, or `eas build --profile development`

### Installation

1. Clone the repository:
```bash
git clone https://github.com/delfiboyz/CalculatorVault.git
cd CalculatorVault
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your device:
   - **Android**: Press `a` in the terminal or run `npm run android`
   - **iOS**: Press `i` in the terminal or run `npm run ios`
   - **Web**: Press `w` in the terminal or run `npm run web`

## 📱 How to Use

### Initial Setup
1. Launch the app
2. Set your secret PIN (minimum 4 digits)
3. Confirm your PIN
4. You're ready to use the vault!

### Using the Calculator
- The main screen displays a fully functional calculator
- Use it normally for actual calculations
- **To unlock the vault**: Press `AC`, enter your PIN and press the `=` button
- **Biometric unlock** (if enabled in settings): Long-press the `=` button
- Wrong PINs give no visible feedback, so the calculator never reveals that it is a vault.
  After 5 wrong PINs the vault refuses all unlocks for 30 seconds, doubling with every further
  failure (up to 1 hour), even if the correct PIN is entered.
- Only `=` pressed on a plain number counts as an unlock attempt; normal calculations
  (e.g. `12 + 3 =`) are never counted as failed attempts.

### Managing Your Vault
Once unlocked:
- **Categories**: Switch between Photos, Videos, and Documents
- **Add Files**: Tap the `+` button to add files from your device
- **Preview**: Tap any file to view it in fullscreen
- **Download**: Tap the download icon to save to your gallery
- **Share**: Tap the share icon to send the file
- **Delete**: Tap the trash icon to permanently remove files
- **Export All**: Tap the export icon to share or download all files
- **Lock**: Tap the lock icon to lock the vault immediately
- **Security Settings** (gear icon): biometric unlock, auto-lock timeout, screenshot blocking,
  change PIN, view failed unlock attempts, and erase the vault

## 🛠️ Tech Stack

- **Framework**: React Native 0.85 (New Architecture) + React 19, TypeScript
- **Build Tool**: Expo SDK 56
- **Encryption**: `expo-crypto` (native AES-256-GCM), `@noble/hashes` (PBKDF2-SHA256)
- **Secrets**: `expo-secure-store` (iOS Keychain / Android Keystore)
- **Authentication**: `expo-local-authentication`
- **Privacy**: `expo-screen-capture`
- **Storage**: `expo-file-system` (new `File` / `Directory` API) and `expo-media-library`
- **Media**: `expo-image`, `expo-video`
- **UI**: Lucide React Native icons, `react-native-safe-area-context`

## 📦 Key Dependencies

```json
{
  "expo": "~56.0.24",
  "react": "19.2.3",
  "react-native": "0.85.3",
  "expo-crypto": "~56.0.5",
  "expo-secure-store": "~56.0.4",
  "expo-local-authentication": "~56.0.5",
  "expo-screen-capture": "~56.0.5",
  "expo-file-system": "~56.0.11",
  "expo-video": "~56.1.4",
  "@noble/hashes": "^2.4.0"
}
```

## 📄 Project Structure

```
CalculatorVault/
├── src/
│   ├── components/
│   │   ├── Calculator.tsx    # Calculator UI and logic
│   │   ├── Vault.tsx         # Vault interface and file management
│   │   ├── Settings.tsx      # Security settings
│   │   └── Setup.tsx         # Initial PIN setup
│   ├── hooks/
│   │   └── useAutoLock.ts    # Background / idle auto-lock
│   ├── security/
│   │   ├── crypto.ts         # AES-256-GCM key management and file encryption
│   │   ├── pin.ts            # PIN hashing, lockout and failed-attempt log
│   │   ├── biometrics.ts     # Fingerprint / Face ID
│   │   ├── settings.ts       # Security settings storage
│   │   ├── secureStore.ts    # Keychain / Keystore wrapper
│   │   ├── externalActivity.ts # Pauses auto-lock while pickers/share sheets are open
│   │   └── encoding.ts       # Byte helpers
│   └── utils/
│       └── storage.ts        # Encrypted vault storage
├── App.tsx                   # Main app component
├── app.json                  # Expo configuration
├── package.json              # Dependencies
└── tsconfig.json            # TypeScript configuration
```

## 🔒 Security Features

- **Encryption at rest**: Files are encrypted with AES-256-GCM in 1 MB authenticated chunks
  (large videos never need to fit in memory). File names, types and categories are stored only
  in an encrypted index; on disk the vault is just random IDs.
- **Hardware-backed key**: The random 256-bit master key lives in the iOS Keychain / Android
  Keystore, readable only while the device is unlocked and never included in backups.
- **Hashed PIN**: The PIN is stored as a salted PBKDF2-SHA256 hash (30,000 iterations) and
  compared in constant time, never in plain text.
- **Brute-force protection**: Exponential lockout after 5 wrong PINs, persisted across restarts.
- **Failed-attempt log**: Settings shows when wrong PINs were entered.
- **Biometric unlock**: Optional; device-passcode fallback is disabled so the phone's passcode
  cannot open the vault.
- **Auto-lock**: Locks immediately when the app is backgrounded and after an idle timeout.
- **Screenshot & recording blocking**: Enabled while the vault is open; the Android recent-apps
  preview is blanked and the iOS app-switcher snapshot is blurred.
- **No plain-text leftovers**: Decrypted copies used for viewing are deleted on every lock and
  app start; the picker's temporary copies are deleted after import; decrypted images are never
  written to the image cache.
- **No backups**: Android `allowBackup` is disabled so the vault cannot be pulled via backups.
- **Erase vault**: Destroys all files and the encryption key.
- **Upgrade from v1**: Existing unencrypted files and the plain-text PIN are migrated
  automatically (encrypted / hashed) on the first unlock.

## ⚙️ Available Scripts

```bash
npm start      # Start development server
npm run typecheck # Type-check the project
npm run android # Build and run on Android
npm run ios    # Build and run on iOS
npm run web    # Run on web browser
```

## 🎨 Customization

### Change PIN Length
Edit `src/security/pin.ts`:
```typescript
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;
```

### Add More Categories
Edit `src/utils/storage.ts` and add to the `categories` array:
```typescript
export const categories = ['Photos', 'Videos', 'Documents', 'Your Category'];
```

### Customize Colors
The app uses:
- Primary: `#f1a33c` (Orange)
- Background: `#000` or `#121212` (Dark)
- Text: `#fff` (White)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Disclaimer

This app is designed for privacy and organization. While it uses secure storage, users are responsible for maintaining their PIN confidentiality. The app is not a substitute for professional security solutions for highly sensitive data.

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Made with ❤️ using React Native and Expo**
