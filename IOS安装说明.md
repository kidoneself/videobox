# iOS 安装说明

## 方案1：使用 Altstore / Sideloadly（推荐，最简单）

### 步骤：
1. **下载工具**：
   - Windows/Mac: [Sideloadly](https://sideloadly.io/)
   - Mac: [AltStore](https://altstore.io/)

2. **获取 IPA 文件**：
   - 从 GitHub Actions 下载构建好的 IPA

3. **安装到手机**：
   - 用数据线连接 iPhone
   - 打开 Sideloadly
   - 拖入 IPA 文件
   - 输入你的 Apple ID
   - 点击 Start

4. **信任证书**：
   - iPhone: 设置 → 通用 → VPN与设备管理
   - 点击你的 Apple ID
   - 点击"信任"

### 注意：
- ⚠️ 免费账号每7天需要重新签名
- ⚠️ 付费开发者账号可以1年有效

---

## 方案2：使用 AltServer（自动续签）

### 步骤：
1. 下载 [AltServer](https://altstore.io/)
2. 电脑和手机在同一WiFi
3. 启用 AltServer 自动刷新
4. **每7天自动续签**（需要电脑开机）

---

## 方案3：使用在线签名服务（付费）

如果你不想每7天重签，可以用：
- [爱思助手签名](https://www.i4.cn/)
- [超级签名服务](https://fir.im/)（约¥200-500/年）

---

## 方案4：自己搭建分发平台

使用你的开发者账号创建 Ad Hoc 或 Enterprise 分发：

### 准备工作：
1. 登录 [Apple Developer](https://developer.apple.com)
2. 创建 App ID
3. 创建 Distribution Certificate
4. 创建 Ad Hoc Provisioning Profile（添加测试设备 UDID）
5. 下载证书和描述文件

### 使用工具：
- [Diawi](https://www.diawi.com/) - 免费，上传 IPA 后生成下载链接
- [蒲公英](https://www.pgyer.com/) - 免费额度
- [fir.im](https://fir.im/) - 免费额度

---

## 推荐方案

**自用 + 免费**：
👉 **方案1（Sideloadly）** - 每周重签一次

**多人使用 + 付费**：
👉 **方案3（超级签名）** - ¥200-500/年

**技术玩家**：
👉 **方案2（AltServer）** - 自动续签

---

需要我帮你配置哪个方案？
