# 🔐 CalculatorVault

A secure, privacy-focused mobile application that disguises a secret vault as a simple calculator. Hide your sensitive photos, videos, and documents in plain sight with PIN protection.

## ✨ Features

- **Calculator Disguise**: Fully functional calculator that appears normal on the home screen
- **Secret Vault**: PIN-protected storage for sensitive files
- **Multi-Category Support**: Organize files into Photos, Videos, and Documents
- **Secure Storage**: Uses device secure storage (`expo-secure-store`) to safely store sensitive data
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
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`

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
- **To unlock the vault**: Enter your PIN and press the `=` button

### Managing Your Vault
Once unlocked:
- **Categories**: Switch between Photos, Videos, and Documents
- **Add Files**: Tap the `+` button to add files from your device
- **Preview**: Tap any file to view it in fullscreen
- **Download**: Tap the download icon to save to your gallery
- **Share**: Tap the share icon to send the file
- **Delete**: Tap the trash icon to permanently remove files
- **Export All**: Tap the export icon to share or download all files

## 🛠️ Tech Stack

- **Framework**: React Native with TypeScript
- **Build Tool**: Expo
- **Security**: expo-secure-store
- **UI Components**: Lucide React Native icons
- **Storage**: File System and Media Library APIs
- **Video Support**: expo-av

## 📦 Key Dependencies

```json
{
  "expo": "~51.0.0",
  "react": "18.2.0",
  "react-native": "0.74.5",
  "expo-secure-store": "~13.0.0",
  "expo-file-system": "~17.0.1",
  "expo-image-picker": "~15.1.0",
  "expo-document-picker": "~12.0.2",
  "lucide-react-native": "^1.16.0"
}
```

## 📄 Project Structure

```
CalculatorVault/
├── src/
│   ├── components/
│   │   ├── Calculator.tsx    # Calculator UI and logic
│   │   ├── Vault.tsx         # Vault interface and file management
│   │   └── Setup.tsx         # Initial PIN setup
│   └── utils/
│       └── storage.ts        # Secure storage and file management
├── App.tsx                   # Main app component
├── app.json                  # Expo configuration
├── package.json              # Dependencies
└── tsconfig.json            # TypeScript configuration
```

## 🔒 Security Features

- **Device-Level Security**: Uses device's native secure storage
- **PIN Protection**: 4+ digit PIN required to access vault
- **Encrypted Storage**: Sensitive data stored securely
- **File Isolation**: Vault files separated from device gallery
- **No Cloud Storage**: All files stay on device

## ⚙️ Available Scripts

```bash
npm start      # Start development server
npm run android # Build and run on Android
npm run ios    # Build and run on iOS
npm run web    # Run on web browser
```

## 🎨 Customization

### Change PIN Length
Edit `src/components/Setup.tsx`:
```typescript
if (pin.length < 4) {  // Change 4 to desired minimum
  Alert.alert('Error', 'PIN must be at least 4 digits');
}
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
