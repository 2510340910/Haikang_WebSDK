export const defaultCameraConfig = {
  name: '测试摄像头-34通道',
  plantName: '测试污水厂',
  areaName: '测试区域',

  // NVR Web 登录地址
  nvrIp: '192.168.1.168',
  webPort: 80,
  httpsPort: 443,

  // 海康设备服务端口，当前 WebSDK 登录不直接用它，但保留
  sdkPort: 8000,

  // 登录后设备返回的 RTSP 端口
  rtspPort: 554,

  username: 'admin',
  password: 'cb135246',

  // NVR 下挂摄像头数字通道
  channel: 2,

  // 先用主码流可以，但如果仍失败，建议切回 sub
  streamType: 'main',

  // 当前环境建议先走代理取流
  proxyPreview: false,

  ptzEnabled: true,
  aiEnabled: true
}