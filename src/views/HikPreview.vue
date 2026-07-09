<template>
  <main class="page-shell">
    <el-card class="preview-card" shadow="never">
      <template #header>
        <div class="card-header">
          <h1>海康 WebSDK 实时预览测试</h1>
          <span>Vue3 + Vite 壳工程</span>
        </div>
      </template>

      <el-alert
        title="当前测试设备为海康 NVR 下挂摄像头，不是直接 IPC 摄像头；当前已验证 SDK 数字通道为 2。录像回放基于 NVR 存储查询，请确认 NVR 硬盘正常、对应通道已开启录像计划。"
        type="info"
        :closable="false"
        show-icon
      />

      <section class="content-grid">
        <el-form :model="form" label-width="96px" class="config-form">
          <el-form-item label="NVR IP">
            <el-input v-model="form.nvrIp" placeholder="请输入 NVR IP" />
          </el-form-item>
          <el-form-item label="Web 端口">
            <el-input-number v-model="form.webPort" :min="1" :max="65535" />
          </el-form-item>
          <el-form-item label="用户名">
            <el-input v-model="form.username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
          </el-form-item>
          <el-form-item label="通道号">
            <el-input-number v-model="form.channel" :min="1" />
          </el-form-item>
          <el-form-item label="码流类型">
            <el-select v-model="form.streamType" placeholder="请选择码流类型">
              <el-option label="主码流" value="main" />
              <el-option label="子码流" value="sub" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.ptzEnabled" label="预置点">
            <div class="preset-control">
              <el-select v-model="selectedPreset" placeholder="请选择预置点">
                <el-option
                  v-for="preset in form.presets"
                  :key="preset.value"
                  :label="preset.label"
                  :value="preset.value"
                />
              </el-select>
              <el-button type="primary" @click="runAction('切换预置点', () => goPreset(selectedPreset))">切换</el-button>
            </div>
          </el-form-item>
        </el-form>

        <div class="preview-panel">
          <div id="hik-preview-container">
            <span>WebSDK 播放窗口挂载区域</span>
          </div>
        </div>
      </section>

      <el-tabs v-model="activeMode" class="mode-tabs">
        <el-tab-pane label="实时预览" name="preview">
          <section class="actions">
            <el-button type="success" @click="runAction('开始预览', () => startPreview(form, previewContainerId))">开始预览</el-button>
            <el-button type="warning" @click="stopAndReleasePreview">停止预览</el-button>
          </section>
        </el-tab-pane>

        <el-tab-pane label="录像回放" name="playback">
          <section class="playback-panel">
            <el-form :model="playbackForm" label-width="96px" class="playback-form">
              <el-form-item label="开始时间">
                <el-date-picker
                  v-model="playbackForm.startTime"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择开始时间"
                />
              </el-form-item>
              <el-form-item label="结束时间">
                <el-date-picker
                  v-model="playbackForm.endTime"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择结束时间"
                />
              </el-form-item>
            </el-form>

            <div class="playback-actions">
              <el-button type="primary" @click="queryPlaybackRecords">查询录像</el-button>
              <el-button type="success" @click="playSelectedTimeRange">开始回放</el-button>
              <el-button type="warning" @click="runAction('停止回放', stopPlayback)">停止回放</el-button>
              <el-button @click="runAction('暂停回放', pausePlayback)">暂停</el-button>
              <el-button @click="runAction('恢复回放', resumePlayback)">恢复</el-button>
              <el-button @click="runAction('慢放', () => setPlaybackSpeed('slow'))">慢放</el-button>
              <el-button @click="runAction('快放', () => setPlaybackSpeed('fast'))">快放</el-button>
            </div>

            <el-table
              v-if="playbackRecords.length"
              :data="playbackRecords"
              border
              size="small"
              class="playback-table"
              @row-click="selectPlaybackRecord"
            >
              <el-table-column prop="index" label="#" width="64" />
              <el-table-column prop="startTime" label="开始时间" min-width="170" />
              <el-table-column prop="endTime" label="结束时间" min-width="170" />
              <el-table-column prop="recordType" label="文件类型/录像类型" min-width="160" />
              <el-table-column prop="fileName" label="文件名" min-width="180" show-overflow-tooltip />
            </el-table>
            <el-empty v-else description="暂无录像查询结果" />
          </section>
        </el-tab-pane>
      </el-tabs>

      <el-descriptions :column="1" border class="status-box">
        <el-descriptions-item label="当前状态">{{ currentStatus }}</el-descriptions-item>
        <el-descriptions-item label="错误信息">
          <span :class="{ 'error-text': errorMessage }">{{ errorMessage || '无' }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { defaultCameraConfig } from '@/config/cameraConfig'
import {
  destroySdk,
  goPreset,
  logoutDevice,
  pausePlayback,
  resumePlayback,
  searchPlaybackRecords,
  setPlaybackSpeed,
  startPlayback,
  startPreview,
  stopPlayback,
  stopPreview
} from '@/services/hikWebSdkBridge'

const previewContainerId = 'hik-preview-container'
const form = reactive({ ...defaultCameraConfig })
const selectedPreset = ref(form.presets?.[0]?.value || '')
const activeMode = ref('preview')
const playbackForm = reactive(createDefaultPlaybackTimeRange())
const playbackRecords = ref([])
const currentStatus = ref('等待操作')
const errorMessage = ref('')

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function formatDateTime(date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate())
  ].join('-') + ' ' + [
    padNumber(date.getHours()),
    padNumber(date.getMinutes()),
    padNumber(date.getSeconds())
  ].join(':')
}

function createDefaultPlaybackTimeRange() {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  return {
    startTime: formatDateTime(startOfDay),
    endTime: formatDateTime(now)
  }
}

function getPlaybackOptions() {
  return {
    ...form,
    startTime: playbackForm.startTime,
    endTime: playbackForm.endTime
  }
}

async function runAction(label, action) {
  try {
    errorMessage.value = ''
    currentStatus.value = `${label}中...`
    await action()
    currentStatus.value = `${label}完成`
  } catch (error) {
    currentStatus.value = `${label}失败`
    errorMessage.value = error?.message || String(error)
  }
}

async function queryPlaybackRecords() {
  await runAction('查询录像', async () => {
    playbackRecords.value = await searchPlaybackRecords(getPlaybackOptions())
    currentStatus.value = `录像查询成功，共 ${playbackRecords.value.length} 段`
  })
}

function selectPlaybackRecord(record) {
  playbackForm.startTime = record.startTime
  playbackForm.endTime = record.endTime
  currentStatus.value = `已选择录像片段 ${record.startTime} 至 ${record.endTime}`
}

async function playSelectedTimeRange() {
  await runAction('开始回放', async () => {
    await stopPreview()
    await startPlayback(getPlaybackOptions())
    currentStatus.value = `正在回放 ${playbackForm.startTime} 至 ${playbackForm.endTime}`
  })
}

async function stopAndReleasePreview() {
  await runAction('停止预览', async () => {
    await stopPreview()
    await logoutDevice()
    await destroySdk()
  })
}
</script>
