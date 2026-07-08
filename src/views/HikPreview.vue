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
        title="当前测试设备为海康 NVR 下挂摄像头，不是直接 IPC 摄像头；当前已知 SDK 数字通道为 34。"
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
        </el-form>

        <div class="preview-panel">
          <div id="hik-preview-container">
            <span>WebSDK 播放窗口挂载区域</span>
          </div>
        </div>
      </section>

      <section class="actions">
        <el-button type="primary" @click="runAction('加载 SDK', loadSdkResources)">加载 SDK</el-button>
        <el-button @click="runAction('初始化 SDK', () => initSdk(previewContainerId))">初始化 SDK</el-button>
        <el-button @click="runAction('登录设备', () => loginDevice(form))">登录设备</el-button>
        <el-button type="success" @click="runAction('开始预览', () => startPreview(form, previewContainerId))">开始预览</el-button>
        <el-button type="warning" @click="runAction('停止预览', stopPreview)">停止预览</el-button>
        <el-button type="danger" @click="releaseResources">释放资源</el-button>
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
  initSdk,
  loadSdkResources,
  loginDevice,
  logoutDevice,
  startPreview,
  stopPreview
} from '@/services/hikWebSdkBridge'

const previewContainerId = 'hik-preview-container'
const form = reactive({ ...defaultCameraConfig })
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

async function releaseResources() {
  await runAction('释放资源', async () => {
    await stopPreview()
    await logoutDevice()
    await destroySdk()
  })
}
</script>
