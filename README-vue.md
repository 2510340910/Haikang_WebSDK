# 海康 WebSDK Vue3 + Vite 壳工程

## 说明

- 原始海康 WebSDK Demo 使用 `nginx-1.28.0` 作为本地静态服务。
- 当前新增的是 Vue3 + Vite 壳工程，用于后续逐步迁移 WebSDK Demo。
- 本阶段只完成页面壳和桥接占位，不实现真实 WebSDK 预览逻辑。
- 下一阶段再根据 `webs/cn/demo.html` 和 `webs/cn/demo.js` 迁移真实海康 WebSDK API。
- 当前测试设备是 NVR 下挂摄像头，数字通道为 `34`，不是 IPC 直连。

## 启动方式

```bash
npm install
npm run dev
```

访问地址：

```text
http://localhost:5173
```

## 静态资源说明

`vite.config.js` 使用 `publicDir: 'webs'`，让 Vite 直接把现有 `webs` 目录作为静态资源目录使用，避免复制 SDK 文件。
