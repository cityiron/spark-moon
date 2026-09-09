// Cloudflare Pages Functions - 将 /api/* 请求反代到腾讯云后端
// 部署: 构建后把 functions/ 并入部署目录(CI 或本地执行:
//       cp -r functions dist/functions && npx wrangler pages deploy dist)
// 参考: https://developers.cloudflare.com/pages/functions/

/** 后端目标地址(腾讯云后端入口; 隧道建好后可改回 https://wx.funnycode.cn) */
const BACKEND_ORIGIN = 'http://124.221.205.79:8080'

export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  // 只代理 API, 其余交给静态资源
  if (!url.pathname.startsWith('/api/')) {
    return context.next()
  }

  // 构造后端请求: 保留完整路径与查询参数(后端接口路径本身含 /api 前缀)
  const target = new URL(url.pathname + url.search, BACKEND_ORIGIN)
  const headers = new Headers(request.headers)
  headers.delete('host')

  const upstream = await fetch(new Request(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'follow',
  }))

  // 透传后端响应(含 CORS 头, 后端 WebMvcConfig 已全放开)
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  })
}
