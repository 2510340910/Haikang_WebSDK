import { loadScript } from '@/composables/useScriptLoader'

const SDK_SCRIPT_PATHS = [
  '/codebase/jsPlugin/jquery.min.js',
  '/codebase/encryption/AES.js',
  '/codebase/encryption/cryptico.min.js',
  '/codebase/encryption/crypto-3.1.2.min.js',
  '/codebase/webVideoCtrl.js'
]

let sdkLoaded = false
let sdkInitialized = false
let activeDeviceIdentify = ''
let selectedWindowIndex = 0
let activeDevicePortInfo = null

function getWebVideoCtrl() {
  const webVideoCtrl = window.WebVideoCtrl

  if (!webVideoCtrl) {
    throw new Error('WebVideoCtrl 未加载，请先点击“加载 SDK”')
  }

  return webVideoCtrl
}

function getDeviceIdentify(config) {
  return `${config.nvrIp}_${config.webPort}`
}

function getProtocol(config) {
  return config.protocol === 'https' ? 2 : 1
}

function getStreamType(streamType) {
  if (streamType === 'main') {
    return 1
  }

  if (streamType === 'third') {
    return 3
  }

  return 2
}

function toSdkPromise(executor) {
  return new Promise((resolve, reject) => {
    executor(resolve, reject)
  })
}

export async function loadSdkResources() {
  if (sdkLoaded) {
    return
  }

  for (const src of SDK_SCRIPT_PATHS) {
    await loadScript(src)
  }

  sdkLoaded = true
}

export async function initSdk(containerId = 'hik-preview-container') {
  await loadSdkResources()

  const WebVideoCtrl = getWebVideoCtrl()
  const supportNoPlugin = WebVideoCtrl.I_SupportNoPlugin()

  if (!supportNoPlugin) {
    throw new Error('当前浏览器版本过低，不支持无插件 WebSDK')
  }

  if (sdkInitialized) {
    return
  }

  await toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_InitPlugin('100%', '100%', {
      bWndFull: true,
      iPackageType: 2,
      iWndowType: 1,
      bNoPlugin: true,
      cbSelWnd: function (xmlDoc) {
        const selectedWindow = xmlDoc?.getElementsByTagName('SelectWnd')?.[0]?.textContent
        selectedWindowIndex = parseInt(selectedWindow || '0', 10)
      },
      cbInitPluginComplete: function () {
        const insertResult = WebVideoCtrl.I_InsertOBJECTPlugin(containerId)

        if (insertResult === -1) {
          reject(new Error(`WebSDK 播放窗口插入失败：${containerId}`))
          return
        }

        sdkInitialized = true
        resolve()
      },
      cbPluginErrorHandler: function (iWndIndex, iErrorCode, error) {
        console.error('[HikWebSdkBridge] WebSDK 插件错误', { iWndIndex, iErrorCode, error })
      },
      cbPerformanceLack: function () {
        console.warn('[HikWebSdkBridge] WebSDK 性能不足')
      },
      cbSecretKeyError: function (iWndIndex) {
        console.warn('[HikWebSdkBridge] WebSDK 码流加密秘钥错误', { iWndIndex })
      }
    })
  })
}

export async function loginDevice(config) {
  await initSdk()

  const WebVideoCtrl = getWebVideoCtrl()
  const deviceIdentify = getDeviceIdentify(config)

  console.log("Protocol:", getProtocol(config))
  return toSdkPromise((resolve, reject) => {
    const result = WebVideoCtrl.I_Login(
      config.nvrIp,
      getProtocol(config),
      String(config.webPort),
      config.username,
      config.password,
      {
        success: function () {
          activeDeviceIdentify = deviceIdentify

          if (typeof WebVideoCtrl.I_GetDevicePort === 'function') {
            activeDevicePortInfo = WebVideoCtrl.I_GetDevicePort(deviceIdentify)
            console.log("Device Port:", activeDevicePortInfo)
          }

          resolve({ deviceIdentify })
        },
        error: function (status, xmlDoc) {
          reject(new Error(`登录设备失败：${deviceIdentify}，状态码：${status || '未知'}`))
          console.error('[HikWebSdkBridge] I_Login error', { status, xmlDoc })
        }
      }
    )

    if (result === -1) {
      activeDeviceIdentify = deviceIdentify
      resolve({ deviceIdentify, alreadyLoggedIn: true })
    }
  })
}

export async function startPreview(config, containerId = 'hik-preview-container') {
  if (!activeDeviceIdentify) {
    await loginDevice(config)
  }

  await initSdk(containerId)

  const WebVideoCtrl = getWebVideoCtrl()
  console.log("WebVideoCtrl:", WebVideoCtrl)

  const windowStatus = WebVideoCtrl.I_GetWindowStatus(selectedWindowIndex)
  console.log("Window Status:", windowStatus)
  console.log("proxyPreview:", Boolean(config.proxyPreview))
  const startRealPlay = () => toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_StartRealPlay(activeDeviceIdentify, {
      iRtspPort: Number(config.rtspPort) || activeDevicePortInfo?.iRtspPort,
      iStreamType: getStreamType(config.streamType),
      iChannelID: Number(config.channel),
      bZeroChannel: false,
      bProxy: Boolean(config.proxyPreview),
      success: function () {
        resolve()
      },
      error: function (status, xmlDoc) {
        const message = status === 403 ? '设备不支持 Websocket 取流' : '开始预览失败'
        reject(new Error(`${message}，状态码：${status || '未知'}`))
        console.error('[HikWebSdkBridge] I_StartRealPlay error', { status, xmlDoc })
      }
    })
  })

  if (windowStatus) {
    await stopPreview()
  }

  return startRealPlay()
}

export function stopPreview() {
  const WebVideoCtrl = getWebVideoCtrl()
  const windowStatus = WebVideoCtrl.I_GetWindowStatus(selectedWindowIndex)

  if (!windowStatus) {
    return Promise.resolve()
  }

  return toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_Stop({
      success: function () {
        resolve()
      },
      error: function () {
        reject(new Error('停止预览失败'))
      }
    })
  })
}

export async function logoutDevice() {
  if (!activeDeviceIdentify) {
    return
  }

  const WebVideoCtrl = getWebVideoCtrl()

  await stopPreview()

  const result = WebVideoCtrl.I_Logout(activeDeviceIdentify)

  if (result !== 0) {
    throw new Error(`注销设备失败：${activeDeviceIdentify}`)
  }

  activeDeviceIdentify = ''
}

export async function destroySdk() {
  const WebVideoCtrl = getWebVideoCtrl()

  if (typeof WebVideoCtrl.I_StopAll === 'function') {
    await WebVideoCtrl.I_StopAll()
  }

  // TODO: 原 webs/cn/demo.js 未出现销毁插件实例的 API；这里只按原 Demo 可确认的 I_StopAll 释放取流资源。
  sdkInitialized = false
  activeDeviceIdentify = ''
  selectedWindowIndex = 0
}
