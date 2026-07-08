export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`)

    if (existingScript) {
      resolve(existingScript)
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve(script)
    script.onerror = () => reject(new Error(`加载脚本失败：${src}`))
    document.head.appendChild(script)
  })
}

export function loadStyle(href) {
  return new Promise((resolve, reject) => {
    const existingStyle = document.querySelector(`link[href="${href}"]`)

    if (existingStyle) {
      resolve(existingStyle)
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve(link)
    link.onerror = () => reject(new Error(`加载样式失败：${href}`))
    document.head.appendChild(link)
  })
}
