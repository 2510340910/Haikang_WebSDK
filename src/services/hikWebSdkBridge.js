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
let ptzAutoRunning = false

function hasWebVideoCtrl() {
  return Boolean(window.WebVideoCtrl)
}

function getWebVideoCtrl() {
  const webVideoCtrl = window.WebVideoCtrl

  if (!webVideoCtrl) {
    throw new Error('WebVideoCtrl 未加载，请点击“开始预览”自动加载 SDK')
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

function getXmlText(xmlDoc, tagName, index = 0) {
  return xmlDoc?.getElementsByTagName(tagName)?.[index]?.textContent || ''
}

function formatPlaybackTime(value) {
  return String(value || '').replace('T', ' ').replace('Z', '')
}

function getPlaybackFileName(playbackURI) {
  if (!playbackURI || playbackURI.indexOf('name=') < 0 || playbackURI.indexOf('&size=') < 0) {
    return ''
  }

  return playbackURI.substring(playbackURI.indexOf('name=') + 5, playbackURI.indexOf('&size='))
}

function validatePlaybackOptions(options) {
  const channel = Number(options.channel)
  const startTime = options.startTime
  const endTime = options.endTime

  if (!channel) {
    throw new Error('未选择通道，请先填写有效通道号')
  }

  if (!startTime || !endTime) {
    throw new Error('请选择录像回放开始时间和结束时间')
  }

  if (Date.parse(endTime.replace(/-/g, '/')) - Date.parse(startTime.replace(/-/g, '/')) < 0) {
    throw new Error('开始时间大于结束时间，请重新选择录像查询时间段')
  }
}

function getActiveWindowStatus(actionName = '操作') {
  const WebVideoCtrl = getWebVideoCtrl()
  const windowStatus = WebVideoCtrl.I_GetWindowStatus(selectedWindowIndex)

  if (!windowStatus) {
    throw new Error(`请先开始预览或回放，再执行${actionName}`)
  }

  return { WebVideoCtrl, windowStatus }
}

function getSafeFilePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
}

function getTimestampFileName(options, suffix) {
  const channel = Number(options?.channel) || 'channel'
  return `${activeDeviceIdentify || 'hikvision'}_${channel}_${Date.now()}${suffix}`
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
        const container = document.getElementById(containerId)

        if (container) {
          container.innerHTML = ''
        }

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
            WebVideoCtrl.I_GetDevicePort(deviceIdentify)
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
  const windowStatus = WebVideoCtrl.I_GetWindowStatus(selectedWindowIndex)

  const startRealPlay = () => toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_StartRealPlay(activeDeviceIdentify, {
      iRtspPort: Number(config.rtspPort) || undefined,
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

export async function searchPlaybackRecords(options) {
  validatePlaybackOptions(options)

  if (!activeDeviceIdentify) {
    await loginDevice(options)
  }

  const WebVideoCtrl = getWebVideoCtrl()
  const deviceIdentify = activeDeviceIdentify || getDeviceIdentify(options)
  const records = []

  const searchPage = (searchPos = 0) => toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_RecordSearch(deviceIdentify, Number(options.channel), options.startTime, options.endTime, {
      iStreamType: getStreamType(options.streamType),
      iSearchPos: searchPos,
      success: function (xmlDoc) {
        const statusText = getXmlText(xmlDoc, 'responseStatusStrg')
        const items = Array.from(xmlDoc?.getElementsByTagName('searchMatchItem') || [])

        for (const item of items) {
          const playbackURI = getXmlText(item, 'playbackURI')
          const startTime = formatPlaybackTime(getXmlText(item, 'startTime'))
          const endTime = formatPlaybackTime(getXmlText(item, 'endTime'))
          const fileName = getPlaybackFileName(playbackURI)

          if (playbackURI && startTime && endTime) {
            records.push({
              index: records.length + 1,
              fileName,
              playbackURI,
              startTime,
              endTime,
              recordType: getXmlText(item, 'metadataDescriptor') || getXmlText(item, 'recordType') || '录像文件'
            })
          }
        }

        if (statusText === 'MORE') {
          searchPage(searchPos + 40).then(resolve).catch(reject)
          return
        }

        resolve({ records, statusText })
      },
      error: function (status, xmlDoc) {
        reject(new Error(`WebSDK 回放 API 调用失败：查询录像失败，状态码：${status || '未知'}；请检查 NVR 硬盘、录像计划、查询日期和通道号`))
        console.error('[HikWebSdkBridge] I_RecordSearch error', { status, xmlDoc })
      }
    })
  })

  const result = await searchPage()

  if (!result.records.length || result.statusText === 'NO MATCHES') {
    throw new Error('查询无录像：NVR 可能无录像、硬盘异常、未开启录像计划、查询日期无录像或通道号不正确')
  }

  return result.records
}

export async function startPlayback(options) {
  validatePlaybackOptions(options)

  if (!activeDeviceIdentify) {
    await loginDevice(options)
  }

  await initSdk()

  const WebVideoCtrl = getWebVideoCtrl()
  const deviceIdentify = activeDeviceIdentify || getDeviceIdentify(options)
  const windowStatus = WebVideoCtrl.I_GetWindowStatus(selectedWindowIndex)

  const runStartPlayback = () => toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_StartPlayback(deviceIdentify, {
      iRtspPort: Number(options.rtspPort) || undefined,
      iStreamType: getStreamType(options.streamType),
      iChannelID: Number(options.channel),
      szStartTime: options.startTime,
      szEndTime: options.endTime,
      bProxy: Boolean(options.proxyPlayback),
      success: function () {
        resolve()
      },
      error: function (status, xmlDoc) {
        const message = status === 403 ? '设备不支持 Websocket 取流' : 'WebSDK 回放 API 调用失败：开始回放失败'
        reject(new Error(`${message}，状态码：${status || '未知'}`))
        console.error('[HikWebSdkBridge] I_StartPlayback error', { status, xmlDoc })
      }
    })
  })

  if (windowStatus) {
    await stopPreview()
  }

  return runStartPlayback()
}

export function stopPlayback() {
  return stopPreview()
}

export function pausePlayback() {
  const WebVideoCtrl = getWebVideoCtrl()

  return toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_Pause({
      success: function () {
        resolve()
      },
      error: function () {
        reject(new Error('WebSDK 回放 API 调用失败：暂停回放失败'))
      }
    })
  })
}

export function resumePlayback() {
  const WebVideoCtrl = getWebVideoCtrl()

  return toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_Resume({
      success: function () {
        resolve()
      },
      error: function () {
        reject(new Error('WebSDK 回放 API 调用失败：恢复回放失败'))
      }
    })
  })
}

export function setPlaybackSpeed(speed) {
  const WebVideoCtrl = getWebVideoCtrl()
  const apiName = speed === 'slow' ? 'I_PlaySlow' : speed === 'fast' ? 'I_PlayFast' : ''

  if (!apiName) {
    return Promise.reject(new Error('待根据原 demo 确认回放 API：仅确认慢放 I_PlaySlow 和快放 I_PlayFast'))
  }

  return toSdkPromise((resolve, reject) => {
    WebVideoCtrl[apiName]({
      success: function () {
        resolve()
      },
      error: function () {
        reject(new Error(`WebSDK 回放 API 调用失败：${speed === 'slow' ? '慢放' : '快放'}失败`))
      }
    })
  })
}

export function stopPreview() {
  if (!hasWebVideoCtrl()) {
    return Promise.resolve()
  }

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

export function startPtzControl(ptzIndex, speed = 4) {
  const { WebVideoCtrl } = getActiveWindowStatus('云台控制')
  let ptzSpeed = Number(speed) || 4
  const targetPtzIndex = Number(ptzIndex)

  if (targetPtzIndex === 9 && ptzAutoRunning) {
    ptzSpeed = 0
  } else if (targetPtzIndex !== 9) {
    ptzAutoRunning = false
  }

  return toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_PTZControl(targetPtzIndex, false, {
      iPTZSpeed: ptzSpeed,
      success: function () {
        if (targetPtzIndex === 9) {
          ptzAutoRunning = !ptzAutoRunning
        }
        resolve()
      },
      error: function (status, xmlDoc) {
        reject(new Error(`云台控制失败：${targetPtzIndex}，状态码：${status || '未知'}`))
        console.error('[HikWebSdkBridge] I_PTZControl start error', { status, xmlDoc, ptzIndex: targetPtzIndex })
      }
    })
  })
}

export function stopPtzControl(ptzIndex = 1) {
  const { WebVideoCtrl } = getActiveWindowStatus('停止云台')
  const targetPtzIndex = Number(ptzIndex) || 1

  return toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_PTZControl(targetPtzIndex, true, {
      success: function () {
        resolve()
      },
      error: function (status, xmlDoc) {
        reject(new Error(`停止云台失败：${targetPtzIndex}，状态码：${status || '未知'}`))
        console.error('[HikWebSdkBridge] I_PTZControl stop error', { status, xmlDoc, ptzIndex: targetPtzIndex })
      }
    })
  })
}

export function setPreset(presetId) {
  const { WebVideoCtrl } = getActiveWindowStatus('设置预置点')
  const targetPresetId = parseInt(presetId, 10)

  if (!targetPresetId) {
    return Promise.reject(new Error('请选择有效的预置点'))
  }

  return toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_SetPreset(targetPresetId, {
      success: function () {
        resolve()
      },
      error: function (status, xmlDoc) {
        reject(new Error(`设置预置点失败：${targetPresetId}，状态码：${status || '未知'}`))
        console.error('[HikWebSdkBridge] I_SetPreset error', { status, xmlDoc, presetId: targetPresetId })
      }
    })
  })
}

export function capturePicture(options = {}, type = 'jpg') {
  const { WebVideoCtrl } = getActiveWindowStatus('抓图')
  const suffix = type === 'bmp' ? '.bmp' : '.jpg'
  const fileName = getTimestampFileName(options, suffix)

  if (typeof WebVideoCtrl.I2_CapturePic !== 'function') {
    return Promise.reject(new Error('待根据原 demo 确认抓图 API：当前 WebSDK 未提供 I2_CapturePic'))
  }

  return WebVideoCtrl.I2_CapturePic(fileName, {})
}

export function downloadPlaybackRecord(record, options = {}) {
  const WebVideoCtrl = getWebVideoCtrl()
  const playbackURI = record?.playbackURI

  if (!activeDeviceIdentify) {
    return Promise.reject(new Error('未登录设备，无法下载录像'))
  }

  if (!playbackURI) {
    return Promise.reject(new Error('请选择包含 playbackURI 的录像片段后再下载'))
  }

  const channel = Number(options.channel) || 'channel'
  const fileName = getSafeFilePart(record.fileName || `record_${record.index || Date.now()}`)

  return WebVideoCtrl.I_StartDownloadRecord(activeDeviceIdentify, playbackURI, `${activeDeviceIdentify}_${channel}_${fileName}`, {
    bDateDir: true
  })
}

export function downloadPlaybackRecordByTime(record, options = {}) {
  validatePlaybackOptions(options)

  const WebVideoCtrl = getWebVideoCtrl()
  const playbackURI = record?.playbackURI

  if (!activeDeviceIdentify) {
    return Promise.reject(new Error('未登录设备，无法按时间下载录像'))
  }

  if (!playbackURI) {
    return Promise.reject(new Error('请先查询并选择录像片段，再按时间下载'))
  }

  const channel = Number(options.channel) || 'channel'
  const fileName = getSafeFilePart(record.fileName || `record_${Date.now()}`)

  return WebVideoCtrl.I_StartDownloadRecordByTime(
    activeDeviceIdentify,
    playbackURI,
    `${activeDeviceIdentify}_${channel}_${fileName}`,
    options.startTime,
    options.endTime,
    { bDateDir: true }
  )
}

export function goPreset(presetId) {
  const WebVideoCtrl = getWebVideoCtrl()
  const windowStatus = WebVideoCtrl.I_GetWindowStatus(selectedWindowIndex)
  const targetPresetId = parseInt(presetId, 10)

  if (!windowStatus) {
    return Promise.reject(new Error('请先开始预览，再切换预置点'))
  }

  if (!targetPresetId) {
    return Promise.reject(new Error('请选择有效的预置点'))
  }

  return toSdkPromise((resolve, reject) => {
    WebVideoCtrl.I_GoPreset(targetPresetId, {
      success: function () {
        resolve()
      },
      error: function (status, xmlDoc) {
        reject(new Error(`调用预置点失败：${targetPresetId}，状态码：${status || '未知'}`))
        console.error('[HikWebSdkBridge] I_GoPreset error', { status, xmlDoc, presetId: targetPresetId })
      }
    })
  })
}

export async function logoutDevice() {
  if (!activeDeviceIdentify) {
    return
  }

  if (!hasWebVideoCtrl()) {
    activeDeviceIdentify = ''
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
  if (!hasWebVideoCtrl()) {
    activeDeviceIdentify = ''
    selectedWindowIndex = 0
    return
  }

  const WebVideoCtrl = getWebVideoCtrl()

  if (typeof WebVideoCtrl.I_StopAll === 'function') {
    await WebVideoCtrl.I_StopAll()
  }

  // TODO: 原 webs/cn/demo.js 未出现销毁插件实例的 API；这里只按原 Demo 可确认的 I_StopAll 释放取流资源。
  // 不重置 sdkInitialized，避免下一次预览重复插入播放窗口导致页面被多个窗口撑高。
  activeDeviceIdentify = ''
  selectedWindowIndex = 0
}
