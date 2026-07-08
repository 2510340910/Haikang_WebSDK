export function loadSdkResources() {
  console.log('[HikWebSdkBridge] loadSdkResources')
  return Promise.resolve()
}

export function initSdk() {
  console.log('[HikWebSdkBridge] initSdk')
  return Promise.resolve()
}

export function loginDevice(config) {
  console.log('[HikWebSdkBridge] loginDevice', config)
  return Promise.resolve()
}

export function startPreview(config, containerId) {
  console.log('[HikWebSdkBridge] startPreview', { config, containerId })
  return Promise.resolve()
}

export function stopPreview() {
  console.log('[HikWebSdkBridge] stopPreview')
  return Promise.resolve()
}

export function logoutDevice() {
  console.log('[HikWebSdkBridge] logoutDevice')
  return Promise.resolve()
}

export function destroySdk() {
  console.log('[HikWebSdkBridge] destroySdk')
  return Promise.resolve()
}
