---
name: ios-xcode27-standards
description: >-
  Standardized build, code signing, deployment, and verification specifications
  for iOS applications targeting iOS 27 and Xcode. Use this skill whenever
  building, compiling, signing, or installing iOS apps on physical devices
  or simulators.
---

# iOS & Xcode 27 Application Installation & Build Standard

This skill establishes the mandatory build, signing, and installation standards for iOS applications targeting **iOS 27** and the connected Apple hardware environment.

---

## 1. Environment & Device Specifications

| Parameter | Specification | Note |
| :--- | :--- | :--- |
| **Target OS** | **iOS 27.0+** | Verified on iPhone 17 Pro (iPhone18,1) |
| **Developer Tools** | `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` | Must explicitly prefix CLI commands |
| **Physical Device ID** | `A22CBAFF-09B7-5C12-AD66-853073716973` | `Eddy iPhone 17 pro` |
| **Development Team** | `33KMXYMW7J` (崇晉 羅) | Mandatory Team ID |
| **Signing Identity** | `Apple Development: eddylo.tw@yahoo.com.tw` | Valid in macOS Keychain |

---

## 2. Xcode Project Configuration (`project.pbxproj`)

Every iOS target build configuration must adhere to these settings:

```text
DEVELOPMENT_TEAM = 33KMXYMW7J;
CODE_SIGN_STYLE = Automatic;
ENABLE_PREVIEWS = NO;            // Prevents __preview.dylib linker failures in CLI builds
GENERATE_INFOPLIST_FILE = NO;
INFOPLIST_FILE = <Target>/Info.plist;
IPHONEOS_DEPLOYMENT_TARGET = 16.0; // Minimum backward compatibility
TARGETED_DEVICE_FAMILY = "1,2";   // iPhone & iPad
```

### App Icon Rules (Apple HIG & iOS 27)
- `icon_1024.png` must be **exactly 1024×1024 pixels**.
- Must be a **full-bleed square canvas**. Never draw fake rounded squircle borders or inner frames; iOS automatically applies squircle clipping.
- Clean medical / functional aesthetic without microscopic unreadable text.

---

## 3. Build & Signing Procedure

### Physical Device (iOS 27)
Always pass `-allowProvisioningUpdates` so Xcode can dynamically update the device provisioning profile for iOS 27:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild \
  -project "<Project>.xcodeproj" \
  -scheme "<Scheme>" \
  -destination 'id=A22CBAFF-09B7-5C12-AD66-853073716973' \
  -allowProvisioningUpdates \
  clean build
```

### iOS Simulator
```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild \
  -project "<Project>.xcodeproj" \
  -scheme "<Scheme>" \
  -destination 'generic/platform=iOS Simulator' \
  clean build
```

---

## 4. Deployment & Launch Procedure

### Physical Device Installation (`devicectl`)
In iOS 27, developer apps must be installed and launched via CoreDevice (`devicectl`):

```bash
# 1. Install app bundle
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcrun devicectl device install app \
  --device "A22CBAFF-09B7-5C12-AD66-853073716973" \
  "<DerivedData_Path>/Build/Products/Debug-iphoneos/<App>.app"

# 2. Launch application
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcrun devicectl device process launch \
  --device "A22CBAFF-09B7-5C12-AD66-853073716973" \
  <BUNDLE_ID>

# 3. Verify running process
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcrun devicectl device info processes -d "A22CBAFF-09B7-5C12-AD66-853073716973" | grep "<App_Name>"
```

### Simulator Installation (`simctl`)
```bash
# Refresh icon cache by uninstalling first
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl uninstall booted <BUNDLE_ID> || true

# Install fresh bundle
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl install booted "<DerivedData_Path>/Build/Products/Debug-iphonesimulator/<App>.app"

# Launch app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl launch booted <BUNDLE_ID>
```

---

## 5. Troubleshooting iOS 27 Upgrades

- **Error: `Security ("Unable to launch ... because its profile has not been explicitly trusted by the user")`**:
  1. Re-sign and re-install with `-allowProvisioningUpdates` and team `33KMXYMW7J`.
  2. If iOS prompt persists, on iPhone go to: **Settings > General > VPN & Device Management** and trust the developer profile.
  3. Ensure Developer Mode remains toggled ON in **Settings > Privacy & Security > Developer Mode**.
- **Error: `Missing project.pbxproj`**:
  Keep a dual-sync copy in repository `ios/<Project>.xcodeproj` and Desktop `/Users/eddylo/Desktop/<Project>.xcodeproj` for easy Xcode GUI access.
