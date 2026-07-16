# Ubuntu 虚拟机部署规划：海康 WebSDK Vue3 + Vite 项目

本文档基于当前仓库代码和以下 Ubuntu 虚拟机环境整理，用于后续部署规划、复核和交接。

## 1. 当前服务器环境

### 1.1 虚拟化环境

- VMware Workstation Pro 26H1
- Ubuntu Server 22.04.5 LTS
- Linux kernel：5.15.0-185-generic
- 主机名：`hikvision-server`
- 登录用户：`zhj0917`
- 内存：8 GB
- CPU：4 核
- 虚拟磁盘：60 GB

### 1.2 网络配置

#### ens33

- VMware 桥接模式
- IP：`192.168.1.101/24`
- 无默认网关
- 无 DNS
- 用途：专门访问海康 NVR

#### ens37

- VMware NAT 模式
- IP：`192.168.205.128/24`
- 默认网关：`192.168.205.2`
- 用途：访问互联网和下载安装依赖

#### 当前路由

```text
default via 192.168.205.2 dev ens37
192.168.1.0/24 dev ens33 src 192.168.1.101
192.168.205.0/24 dev ens37 src 192.168.205.128
```

### 1.3 海康设备信息

- NVR IP：`192.168.1.168`
- 已验证：
  - Ping 正常，0% 丢包
  - HTTP 80 端口正常，返回 `HTTP/1.1 200 OK`
  - 海康设备网络 SDK 端口 `8000` open
  - RTSP 端口 `554` open

### 1.4 SSH

Windows 可通过以下命令登录 Ubuntu：

```bash
ssh zhj0917@192.168.1.101
```

## 2. 当前仓库技术架构判断

当前仓库是 **Vue3 + Vite + Element Plus + 海康 WebSDK 静态资源** 项目。

当前仓库不是：

- Spring Boot 项目
- Java HCNetSDK 项目
- FFmpeg/ZLMediaKit 转流项目
- RTSP 转 HLS/FLV 项目
- 后端 WebSocket 转流项目

当前 `package.json` 只有前端脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0 --port 5173"
  },
  "dependencies": {
    "@vitejs/plugin-vue": "^5.2.4",
    "element-plus": "^2.10.4",
    "vite": "^5.4.19",
    "vue": "^3.5.17"
  }
}
```

当前 `vite.config.js` 使用：

```js
publicDir: 'webs'
```

因此 Vite 构建时会把现有 `webs` 目录作为静态资源目录处理，避免复制 SDK 文件。

## 3. 当前视频与控制链路

### 3.1 实时预览

当前实时预览由浏览器端海康 WebSDK 调用：

```js
WebVideoCtrl.I_StartRealPlay(...)
```

不是 Java 后端取流。

当前默认配置：

```js
proxyPreview: false
```

含义是默认浏览器直连 NVR 取流。

### 3.2 录像查询与回放

录像查询调用：

```js
WebVideoCtrl.I_RecordSearch(...)
```

录像回放调用：

```js
WebVideoCtrl.I_StartPlayback(...)
```

回放基于：

```text
NVR + 通道号 + 开始时间 + 结束时间
```

### 3.3 云台控制

当前只实现了云台预置点调用：

```js
WebVideoCtrl.I_GoPreset(...)
```

未实现方向控制、变倍、变焦、光圈等完整云台能力。

## 4. Windows 专用内容与 Linux SDK 判断

当前仓库未发现：

- `HCNetSDK.dll`
- `PlayCtrl.dll`
- `HCCore.dll`
- Linux `.so` SDK 文件
- Java 后端 SDK 调用代码

仓库中存在 Windows nginx 文件：

```text
nginx-1.28.0/nginx.exe
nginx-1.28.0/start.bat
nginx-1.28.0/stop.bat
RunHiddenConsole.exe
```

这些不能在 Ubuntu 上使用。

Ubuntu 上应使用系统 nginx：

```bash
sudo apt install nginx
```

当前代码不需要海康 Linux HCNetSDK `.so`。只有后续新增 Java 后端 SDK 取流服务时，才需要海康 Linux x86_64 SDK。

## 5. 推荐服务器目录结构

```text
/opt/hikvision-demo/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   ├── webs/
│   ├── dist/
│   └── README-vue.md
├── logs/
│   ├── nginx/
│   └── app/
└── deploy/
    └── nginx-hikvision.conf
```

当前没有后端，所以暂时不需要：

```text
/opt/hikvision-demo/backend/
/opt/hikvision-demo/sdk/
```

如果后续新增 Java 后端，再扩展：

```text
/opt/hikvision-demo/
├── frontend/
├── backend/
├── sdk/
├── logs/
└── deploy/
```

## 6. 上传代码到 Ubuntu

### 6.1 Windows 上传

假设 Windows 项目路径：

```text
C:\Users\zhj0917\Desktop\Haikang_WebSDK
```

在 Windows PowerShell 或 Git Bash 执行：

```bash
scp -r C:\Users\zhj0917\Desktop\Haikang_WebSDK zhj0917@192.168.1.101:/tmp/Haikang_WebSDK
```

### 6.2 Ubuntu 创建目录

在 Ubuntu 执行：

```bash
sudo mkdir -p /opt/hikvision-demo/frontend
sudo mkdir -p /opt/hikvision-demo/logs/nginx
sudo mkdir -p /opt/hikvision-demo/logs/app
sudo mkdir -p /opt/hikvision-demo/deploy
sudo chown -R zhj0917:zhj0917 /opt/hikvision-demo
```

复制代码：

```bash
cp -a /tmp/Haikang_WebSDK/. /opt/hikvision-demo/frontend/
```

进入项目目录：

```bash
cd /opt/hikvision-demo/frontend
```

## 7. 安装系统依赖

在 Ubuntu 执行：

```bash
sudo apt update
sudo apt install -y curl ca-certificates gnupg build-essential nginx netcat-openbsd
```

说明：

- `curl`：下载 Node.js 安装源
- `build-essential`：部分 npm 包编译备用
- `nginx`：部署前端和代理 NVR
- `netcat-openbsd`：测试端口连通性

## 8. 安装 Node.js

建议使用 Node.js 20 LTS。

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

确认版本：

```bash
node -v
npm -v
```

建议：

```text
Node.js 20.x
npm 10.x
```

## 9. JDK / Maven 判断

当前仓库没有 Java 后端，因此当前部署不需要 JDK 和 Maven。

如果公司要求统一安装，可执行：

```bash
sudo apt install -y openjdk-17-jdk maven
java -version
mvn -version
```

但当前项目不会使用这些工具。

## 10. 安装前端依赖与构建

进入项目目录：

```bash
cd /opt/hikvision-demo/frontend
```

当前仓库未发现 `package-lock.json`，因此不能使用严格的 `npm ci`。

使用：

```bash
npm install
```

如果 npm 网络较慢，可配置镜像：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

开发运行：

```bash
npm run dev
```

访问：

```text
http://192.168.1.101:5173/
```

生产构建：

```bash
npm run build
```

构建产物：

```text
/opt/hikvision-demo/frontend/dist
```

## 11. nginx 配置

创建配置：

```bash
sudo nano /etc/nginx/sites-available/hikvision-demo.conf
```

写入：

```nginx
server {
    listen 9107;
    server_name _;

    root /opt/hikvision-demo/frontend/dist;
    index index.html;

    access_log /opt/hikvision-demo/logs/nginx/access.log;
    error_log  /opt/hikvision-demo/logs/nginx/error.log;

    client_max_body_size 200m;

    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Resource-Policy "cross-origin" always;

    location / {
        try_files $uri $uri/ /index.html;

        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    location /assets/ {
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800" always;
    }

    location /codebase/ {
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800" always;
        add_header Cross-Origin-Resource-Policy "cross-origin" always;
    }

    location ~ ^/(ISAPI|SDK)/ {
        proxy_http_version 1.1;
        proxy_pass http://192.168.1.168:80;

        proxy_set_header Host 192.168.1.168;
        proxy_set_header Referer $http_referer;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_buffering off;
    }

    location ^~ /webSocketVideoCtrlProxy {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host 192.168.1.168;
        proxy_set_header Referer $http_referer;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_connect_timeout 10s;
        proxy_send_timeout 3600s;
        proxy_read_timeout 3600s;

        proxy_buffering off;

        if ($cookie_webVideoCtrlProxyWs != "") {
            proxy_pass http://$cookie_webVideoCtrlProxyWs/?$args;
            break;
        }

        if ($cookie_webVideoCtrlProxyWss != "") {
            proxy_pass https://$cookie_webVideoCtrlProxyWss/?$args;
            break;
        }

        proxy_pass http://192.168.1.168:7681/?$args;
    }

    # 当前仓库没有 Java 后端，此处仅预留。
    # location /api/ {
    #     proxy_pass http://127.0.0.1:8080/;
    #     proxy_http_version 1.1;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     proxy_connect_timeout 10s;
    #     proxy_send_timeout 60s;
    #     proxy_read_timeout 60s;
    # }
}
```

启用配置：

```bash
sudo ln -sf /etc/nginx/sites-available/hikvision-demo.conf /etc/nginx/sites-enabled/hikvision-demo.conf
sudo nginx -t
sudo systemctl reload nginx
```

访问：

```text
http://192.168.1.101:9107/
```

## 12. 防火墙端口

如果启用了 UFW：

```bash
sudo ufw allow 22/tcp
sudo ufw allow 9107/tcp
sudo ufw reload
sudo ufw status
```

开发阶段如果要访问 Vite：

```bash
sudo ufw allow 5173/tcp
```

生产建议只开放：

```text
22
9107
```

## 13. 内网测试命令

### 13.1 Ubuntu 到 NVR

```bash
ping -c 4 192.168.1.168
curl -I http://192.168.1.168
nc -vz 192.168.1.168 80
nc -vz 192.168.1.168 554
nc -vz 192.168.1.168 8000
nc -vz 192.168.1.168 7681
```

### 13.2 Ubuntu 到互联网

```bash
ping -c 4 223.5.5.5
ping -c 4 registry.npmmirror.com
curl -I https://registry.npmmirror.com
```

### 13.3 前端构建

```bash
cd /opt/hikvision-demo/frontend
npm install
npm run build
```

### 13.4 nginx 状态

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

### 13.5 浏览器测试

内网浏览器访问：

```text
http://192.168.1.101:9107/
```

测试项：

1. 页面是否打开
2. `/codebase/webVideoCtrl.js` 是否 200
3. 点击“开始预览”
4. 点击“切换预置点”
5. 切换“录像回放”
6. 查询录像
7. 开始回放

## 14. 外网映射信息

给公司网络人员：

```text
内网服务器 IP：192.168.1.101
服务端口：9107
协议：HTTP
用途：海康 WebSDK Vue 前端 + nginx 代理
```

期望公网访问：

```text
http://server.cs-xf.com:9107/
```

或：

```text
http://公网IP:9107/
```

## 15. 双网卡路由风险提醒

当前默认路由：

```text
default via 192.168.205.2 dev ens37
```

而公网映射可能从 `ens33` 进入。

如果公司网关 DNAT 到 `192.168.1.101:9107`，但不做 SNAT，Ubuntu 可能把公网源 IP 的回包从 `ens37` 发出，造成回包路径不一致。

因此需要公司网络人员确认：

```text
公网映射设备是否会对进入 192.168.1.101:9107 的请求做 SNAT。
```

推荐公司侧处理为：

```text
公网请求 → 公司网关 → SNAT 成 192.168.1.x → 192.168.1.101:9107
```

如果不做 SNAT，后续可能需要配置策略路由。但当前要求是不修改 ens33、ens37 和 Netplan，所以本文档只做风险提醒。

## 16. 功能支持判断

| 功能 | 当前代码是否支持 | Ubuntu 部署后是否可用 | 说明 |
|---|---:|---:|---|
| 实时预览 | 支持 | 内网可用，外网需代理 | `I_StartRealPlay()` |
| 云台控制 | 部分支持 | 内网可用，外网需代理 | 当前只支持预置点 `I_GoPreset()` |
| 抓图 | 未实现 | 不可用 | 需要后续迁移 |
| 录像查询 | 支持 | 内网可用，外网需代理 | `I_RecordSearch()` |
| 录像回放 | 支持 | 内网可用，外网需代理 | `I_StartPlayback()` |
| 外网访问页面 | 支持 | 需要公网映射 | nginx 暴露 `9107` |
| 外网访问视频 | 当前默认不完整 | 需要最小改造 | 当前默认 `proxyPreview: false` |

## 17. 外网视频访问的最小改造

当前默认：

```js
proxyPreview: false
```

这会让浏览器倾向直连 NVR。

外网浏览器不能直接访问：

```text
192.168.1.168
```

因此外网访问必须改为：

```text
外网浏览器 → server.cs-xf.com:9107 → nginx → 192.168.1.168
```

建议在生产配置中改为：

```js
proxyPreview: true,
proxyPlayback: true,
```

其中：

- `proxyPreview` 用于实时预览 `bProxy`
- `proxyPlayback` 用于录像回放 `bProxy`

然后重新构建：

```bash
cd /opt/hikvision-demo/frontend
npm run build
sudo systemctl reload nginx
```

## 18. 推荐执行顺序

### 阶段 1：内网直连开发

```bash
cd /opt/hikvision-demo/frontend
npm install
npm run dev
```

访问：

```text
http://192.168.1.101:5173/
```

保持：

```js
proxyPreview: false
```

先测试：

- 实时预览
- 预置点
- 录像查询
- 录像回放

### 阶段 2：nginx 静态部署

```bash
cd /opt/hikvision-demo/frontend
npm run build
sudo nginx -t
sudo systemctl reload nginx
```

访问：

```text
http://192.168.1.101:9107/
```

### 阶段 3：nginx 代理模式

修改配置：

```js
proxyPreview: true,
proxyPlayback: true,
```

重新构建：

```bash
cd /opt/hikvision-demo/frontend
npm run build
sudo systemctl reload nginx
```

检查浏览器开发者工具，请求应访问：

```text
192.168.1.101:9107
```

而不是：

```text
192.168.1.168
```

### 阶段 4：公司公网映射

提供给公司：

```text
192.168.1.101:9107
```

公司映射后访问：

```text
http://server.cs-xf.com:9107/
```

## 19. 最终结论

当前仓库可以部署到 Ubuntu 虚拟机。

当前不需要：

- Java 后端
- JDK/Maven
- HCNetSDK.dll
- Linux HCNetSDK `.so`
- FFmpeg
- ZLMediaKit

当前需要：

- Node.js 20
- npm
- nginx
- Vue 构建产物 `dist`
- nginx WebSDK 代理

内网测试可以先直连 NVR。

外网访问时，不允许浏览器直接访问私网 NVR：

```text
192.168.1.168
```

必须通过：

```text
server.cs-xf.com:9107 → nginx → 192.168.1.168
```

最小改造：

```js
proxyPreview: true,
proxyPlayback: true,
```

并配置 nginx：

```text
/ISAPI
/SDK
/webSocketVideoCtrlProxy
```

## 20. 仓库检查命令记录

```bash
find . -maxdepth 3 -type f \( ! -path './.git/*' ! -path './node_modules/*' ! -path './dist/*' \) | sed 's#^./##' | sort | head -300
```

```bash
find . -type f \( -name pom.xml -o -name build.gradle -o -name settings.gradle -o -path '*/src/main/java/*' -o -name application.yml -o -name application.yaml -o -name '*.java' \) -print | sort
```

```bash
find . -type f \( -iname '*.dll' -o -iname '*.so' -o -iname '*.so.*' -o -iname '*.a' \) -print | sort
```

```bash
cat package.json
cat vite.config.js
```

```bash
rg -n "192\.168\.1\.168|localhost|5173|HCNetSDK|PlayCtrl|HCCore|\.dll|\.so|I_StartRealPlay|I_RecordSearch|I_StartPlayback|I_GoPreset|webSocketVideoCtrlProxy|proxyPreview|proxyPlayback" src package.json vite.config.js README-vue.md index.html --glob '!node_modules/**'
```
