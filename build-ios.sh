#!/bin/bash

# iOS 本地构建脚本（未签名版本，用于蒲公英超级签名）

set -e

echo "🚀 开始构建 iOS IPA..."

# 检查 Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ 错误: 未找到 Xcode，请先安装 Xcode"
    exit 1
fi

# 检查 CocoaPods
if ! command -v pod &> /dev/null; then
    echo "📦 安装 CocoaPods..."
    sudo gem install cocoapods
fi

# 安装依赖
echo "📦 安装 npm 依赖..."
npm install

# 预构建 iOS
echo "🔨 预构建 iOS 项目..."
npx expo prebuild --platform ios

# 进入 iOS 目录
cd ios

# 安装 CocoaPods 依赖
echo "📦 安装 CocoaPods 依赖..."
pod install

# 创建 ExportOptions.plist（未签名）
cat > ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string></string>
</dict>
</plist>
EOF

# 构建 Archive（未签名）
echo "🔨 构建 Archive..."
xcodebuild -workspace app.xcworkspace \
  -scheme app \
  -configuration Release \
  -archivePath build/app.xcarchive \
  -sdk iphoneos \
  -destination "generic/platform=iOS" \
  archive \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  PROVISIONING_PROFILE_SPECIFIER="" \
  DEVELOPMENT_TEAM="" \
  IPHONEOS_DEPLOYMENT_TARGET=15.0

# 导出 IPA（未签名）
echo "📦 导出 IPA..."
xcodebuild -exportArchive \
  -archivePath build/app.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO

echo "✅ 构建完成！"
echo "📱 IPA 文件位置: ios/build/app.ipa"
echo ""
echo "📤 下一步："
echo "1. 登录蒲公英: https://www.pgyer.com/"
echo "2. 上传 IPA 文件: ios/build/VoiceboxNew.ipa"
echo "3. 选择'超级签名'（如果已购买）"
echo "4. 等待处理完成，获取下载链接"
