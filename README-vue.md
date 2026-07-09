# 海康 WebSDK Vue3 + Vite 壳工程

## 说明

- 原始海康 WebSDK Demo 使用 `nginx-1.28.0` 作为本地静态服务。
- 当前新增的是 Vue3 + Vite 壳工程，用于后续逐步迁移 WebSDK Demo。
- 当前阶段已迁移原 `webs/cn/demo.js` 中可确认的最小实时预览链路：SDK 加载、SDK 初始化、登录 NVR、单路实时预览、停止预览、注销/释放、录像查询和按时间段回放。页面只保留“开始预览”和“停止预览”，其中“开始预览”会自动串联加载 SDK、初始化 SDK 和登录设备，“停止预览”会配套执行停止、注销和释放。
- 当前已迁移云台预置点调用能力，以及 NVR 存储录像的查询、开始回放和停止回放；暂未迁移方向控制、变倍、变焦、光圈、录像下载、抓图、OSD、设备维护等高级能力。
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
- `WebVideoCtrl.I_RecordSearch()`
- `WebVideoCtrl.I_StartPlayback()`
- `WebVideoCtrl.I_Stop()`
- `WebVideoCtrl.I_Pause()`
- `WebVideoCtrl.I_Resume()`
- `WebVideoCtrl.I_PlaySlow()`
- `WebVideoCtrl.I_PlayFast()`
- `WebVideoCtrl.I_GoPreset()`
- `WebVideoCtrl.I_Logout()`
- `WebVideoCtrl.I_StopAll()`

## 当前限制

- 仅实现单路通道实时预览，默认用于 NVR 数字通道 `2`。
- 云台功能目前只支持调用预置点，预置点列表来自 `src/config/cameraConfig.js` 的 `presets` 配置。
- 当前默认预览使用直连取流 `proxyPreview: false`，如后续切换 nginx 代理取流，再将配置改为 `proxyPreview: true` 并补充对应 nginx 代理规则。
- 原 `webs/cn/demo.js` 未出现明确销毁插件实例的 API，因此 `destroySdk()` 只调用可确认的 `I_StopAll()` 释放取流资源，并保留 TODO。

## 实时预览与录像回放

开发阶段建议继续使用：

```bash
npm run dev
```

不需要每次修改代码后都 `npm run build` 再重启 nginx；确认功能后再构建部署即可。

实时预览使用页面中的 NVR IP、Web 端口、用户名、密码、通道号和码流类型。点击“开始预览”会自动完成 SDK 加载、初始化、登录和开始预览。

录像回放同样必须登录 NVR，而不是直接访问 IPC 摄像头。回放流程基于 NVR + 通道号 + 开始时间 + 结束时间：

1. 切换到“录像回放”页签。
2. 选择开始时间和结束时间，默认开始时间为当天 `00:00:00`，结束时间为当前时间。
3. 点击“查询录像”。
4. 如果返回录像片段，可点击片段自动填充回放时间段。
5. 点击“开始回放”进行按时间段回放，点击“停止回放”停止当前回放。

如果提示无录像，请优先检查：

- NVR 硬盘是否正常。
- 对应通道是否开启录像计划。
- 查询日期是否有录像。
- 页面通道号是否正确。
