import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  publicDir: 'webs',
  server: {
    host: '0.0.0.0',
    port: 5173
    // 后续如需 HTTPS，可在此处补充 https 配置。
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
