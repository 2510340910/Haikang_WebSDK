export const defaultCameraConfig = {
  name: '测试摄像头-2通道',
  plantName: '测试污水厂',
  areaName: '测试区域',
  nvrIp: '192.168.1.168',
  webPort: 80,
  httpsPort: 443,
  sdkPort: 8000,
  rtspPort: 554,
  username: '',
  password: '',
  channel: 2,
  streamType: 'main',
  proxyPreview: false,
  ptzEnabled: true,
  presets: [
    { label: '预置点 1', value: 1 },
    { label: '预置点 2', value: 2 },
    { label: '预置点 3', value: 3 }
  ],
  aiEnabled: true
}
