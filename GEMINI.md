# Mini Doppler Project Rules & Standards

## iOS & Xcode 27 Standards
All iOS build, signing, and installation operations in this project must strictly follow the iOS 27 standards:

1. **Target Environment**:
   - Hardware: `Eddy iPhone 17 pro` (`A22CBAFF-09B7-5C12-AD66-853073716973`) running **iOS 27.0+**.
   - Xcode CLI prefix: `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`.
2. **Code Signing & Provisioning**:
   - `DEVELOPMENT_TEAM`: Strictly `33KMXYMW7J` (崇晉 羅).
   - Identity: `Apple Development: eddylo.tw@yahoo.com.tw`.
   - `xcodebuild` flag: Always pass `-allowProvisioningUpdates`.
3. **Build Configuration**:
   - `ENABLE_PREVIEWS = NO;` for CLI build compatibility.
   - `icon_1024.png`: Strictly 1024×1024, full-bleed square canvas (no fake squircle borders, no text).
4. **Device Management**:
   - Use `xcrun devicectl device install app` and `xcrun devicectl device process launch`.
5. **Project Organization**:
   - The canonical project files are strictly consolidated within `ios/MiniDoppler.xcodeproj`. No project files or duplicate directories are kept on the Desktop.
