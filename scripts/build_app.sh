#!/usr/bin/env bash
set -e

APP_NAME="Fetal Doppler"
APP_DIR="${APP_NAME}.app"
CONTENTS_DIR="${APP_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"

echo "=== 正在建立 macOS 原生應用程式封裝: ${APP_DIR} ==="

# 1. 建立 bundle 目錄結構
rm -rf "${APP_DIR}"
mkdir -p "${MACOS_DIR}"
mkdir -p "${RESOURCES_DIR}"

# 2. 複製 Info.plist
cp src/native/Info.plist "${CONTENTS_DIR}/Info.plist"

# 3. 複製二進制執行檔
cp FetalDopplerBin "${MACOS_DIR}/FetalDoppler"
chmod +x "${MACOS_DIR}/FetalDoppler"

# 4. 複製 AppIcon.icns
cp AppIcon.icns "${RESOURCES_DIR}/AppIcon.icns"

# 5. 複製網頁介面資源至 Resources 目錄
cp index.html "${RESOURCES_DIR}/"
cp styles.css "${RESOURCES_DIR}/"
cp test.html "${RESOURCES_DIR}/"
cp -R src "${RESOURCES_DIR}/"

# 6. 設定 PkgInfo
echo "APPL????" > "${CONTENTS_DIR}/PkgInfo"

# 7. 刷新 macOS Bundle 快取
touch "${APP_DIR}"

echo "=== 封裝完成！ ==="
ls -ld "${APP_DIR}"
echo "應用程式路徑: $(pwd)/${APP_DIR}"
