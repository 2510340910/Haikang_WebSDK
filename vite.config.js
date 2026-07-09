import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    publicDir: 'webs',
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            // 登录设备时，WebSDK 会请求 ISAPI 接口获取设备信息；如果直接访问设备 IP，可能会遇到跨域问题，所以这里通过 Vite 代理转发请求。
            '/ISAPI': {
                target: 'http://192.168.1.168:80',
                changeOrigin: true
            },
            '/SDK': {
                target: 'http://192.168.1.168:80',
                changeOrigin: true
            },
            // '/webSocketVideoCtrlProxy': {
            //     target: 'ws://192.168.1.168:7681',
            //     ws: true,
            //     changeOrigin: true,
            //     rewrite: path => path.replace(/^\/webSocketVideoCtrlProxy/, '/')
            // }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    }
})
