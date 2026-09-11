#!/usr/bin/env bash
set -e

JSC_BIN="/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc"

if [ ! -x "$JSC_BIN" ]; then
  echo "錯誤: 找不到 JavaScriptCore (jsc) 執行檔: $JSC_BIN"
  exit 1
fi

echo "=== 執行 FetalDoppler Production Bundle 臨床單元測試 ==="
"$JSC_BIN" scripts/test_production_bundle.js
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ 測試執行失敗 (結束代碼: $EXIT_CODE)"
  exit $EXIT_CODE
else
  echo "✅ 測試執行成功 (結束代碼: 0)"
  exit 0
fi
