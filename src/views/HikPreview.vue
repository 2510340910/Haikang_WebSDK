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
        title="当前测试设备为海康 NVR 下挂摄像头，不是直接 IPC 摄像头；当前已验证 SDK 数字通道为 2。"
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

      <section class="actions">
        <el-button type="success" @click="runAction('开始预览', () => startPreview(form, previewContainerId))">开始预览</el-button>
        <el-button type="warning" @click="stopAndReleasePreview">停止预览</el-button>
      </section>

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
  startPreview,
  stopPreview
} from '@/services/hikWebSdkBridge'

const previewContainerId = 'hik-preview-container'
const form = reactive({ ...defaultCameraConfig })
const selectedPreset = ref(form.presets?.[0]?.value || '')
const currentStatus = ref('等待操作')
const errorMessage = ref('')

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

async function stopAndReleasePreview() {
  await runAction('停止预览', async () => {
    await stopPreview()
    await logoutDevice()
    await destroySdk()
  })
}
</script>
