# 海康 WebSDK Vue3 + Vite 壳工程

## 说明

- 原始海康 WebSDK Demo 使用 `nginx-1.28.0` 作为本地静态服务。
- 当前新增的是 Vue3 + Vite 壳工程，用于后续逐步迁移 WebSDK Demo。
- 当前阶段已迁移原 `webs/cn/demo.js` 中可确认的最小实时预览链路：SDK 加载、SDK 初始化、登录 NVR、单路实时预览、停止预览、注销/释放。页面只保留“开始预览”和“停止预览”，其中“开始预览”会自动串联加载 SDK、初始化 SDK 和登录设备，“停止预览”会配套执行停止、注销和释放。
- 当前尚未迁移云台、回放、录像、抓图、OSD、设备维护等高级能力。
- 当前测试设备是 NVR 下挂摄像头，已验证数字通道为 `2`，不是 IPC 直连。

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

## 已迁移的原 Demo API

当前桥接层只使用原 Demo 中已经出现过的 WebSDK API：

- `WebVideoCtrl.I_SupportNoPlugin()`
- `WebVideoCtrl.I_InitPlugin()`
- `WebVideoCtrl.I_InsertOBJECTPlugin()`
- `WebVideoCtrl.I_Login()`
- `WebVideoCtrl.I_GetDevicePort()`
- `WebVideoCtrl.I_GetWindowStatus()`
- `WebVideoCtrl.I_StartRealPlay()`
- `WebVideoCtrl.I_Stop()`
- `WebVideoCtrl.I_Logout()`
- `WebVideoCtrl.I_StopAll()`

## 当前限制

- 仅实现单路通道实时预览，默认用于 NVR 数字通道 `2`。
- 当前默认预览使用直连取流 `proxyPreview: false`，如后续切换 nginx 代理取流，再将配置改为 `proxyPreview: true` 并补充对应 nginx 代理规则。
- 原 `webs/cn/demo.js` 未出现明确销毁插件实例的 API，因此 `destroySdk()` 只调用可确认的 `I_StopAll()` 释放取流资源，并保留 TODO。
