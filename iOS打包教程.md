# iOS 打包分发教程（最简单方案）

## 📱 用户安装效果
扫码 → 点击安装 → 信任证书 → 完成！

---

## 🚀 一次性配置（你只需要做一次）

### 步骤1：安装 EAS CLI
```bash
npm install -g eas-cli
```

### 步骤2：登录 Expo 账号
```bash
eas login
```
（如果没账号，会提示注册，免费）

### 步骤3：在项目目录配置
```bash
cd /Users/lizhiqiang/coding-my/redbook
eas build:configure
```
选择：
- Platform: iOS
- Build profile: production

### 步骤4：配置 Apple 开发者账号
```bash
eas credentials
```
选择：
- iOS App Store
- 输入你的 Apple ID
- 输入密码

EAS 会自动创建证书和描述文件。

---

## 📦 每次打包流程（以后每次只需要这步）

### 构建 iOS IPA：
```bash
eas build --platform ios --profile production
```

等待 15-20 分钟，会显示下载链接。

---

## 🌐 上传到蒲公英分发

### 步骤1：注册蒲公英
访问：https://www.pgyer.com/
免费注册账号

### 步骤2：上传 IPA
1. 下载 EAS 构建好的 IPA
2. 登录蒲公英
3. 点击"上传应用"
4. 拖入 IPA 文件
5. 等待上传完成

### 步骤3：分享给用户
- 自动生成二维码
- 自动生成短链接
- 微信/QQ 发送都可以

---

## 👥 用户安装流程

1. 扫描二维码 或 点击链接
2. 点击"安装"按钮
3. iPhone 跳转到设置
4. 设置 → 通用 → VPN与设备管理
5. 点击你的开发者账号名称
6. 点击"信任"
7. 回到桌面，打开 App

---

## 💰 费用说明

**EAS Build：**
- 免费额度：每月 30 次构建
- 超出后：$29/月

**蒲公英：**
- 免费额度：100 次安装/天
- 付费版：¥199/年（无限制）

**建议：**
- 先用免费额度
- 用户多了再付费

---

## ⚡ 快速开始

直接运行这个命令：
```bash
cd /Users/lizhiqiang/coding-my/redbook && eas build --platform ios
```

第一次会要求配置，按提示操作即可。

---

## ❓ 常见问题

### Q: 需要 Mac 吗？
A: 不需要！EAS 在云端构建。

### Q: 需要 Xcode 吗？
A: 不需要！

### Q: 需要导出证书吗？
A: 不需要！EAS 自动管理。

### Q: 免费用户能用吗？
A: 能！每月 30 次构建免费。

### Q: 怎么更新版本？
A: 修改代码 → 运行 eas build → 上传蒲公英 → 用户重新扫码安装
