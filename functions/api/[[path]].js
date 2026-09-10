// Cloudflare Pages Functions - 将 /api/* 请求反代到腾讯云后端
// Git 集成模式: functions/ 必须位于仓库根目录(不要在构建时复制进 dist)
// 参考: https://developers.cloudflare.com/pages/functions/

/** 后端目标地址(腾讯云后端入口; 隧道建好后可改回 https://wx.funnycode.cn) */
const BACKEND_ORIGIN = 'http://124.221.205.79:8080'

/** 版本标记, 用于确认线上运行的 functions 版本 */
const FN_VERSION = 'fn-v2-20260909'

export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  // 只代理 API, 其余交给静态资源
  if (!url.pathname.startsWith('/api/')) {
    return context.next()
  }

  // 探活标记: 用于诊断 functions 是否生效
  if (url.pathname === '/api/__ping') {
    return new Response(JSON.stringify({ pong: true, version: FN_VERSION }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  // 构造后端请求: 保留完整路径与查询参数(后端接口路径本身含 /api 前缀)
  const target = new URL(url.pathname + url.search, BACKEND_ORIGIN)
  const headers = new Headers(request.headers)
  headers.delete('host')

  // 必须剥掉 Cloudflare 边缘注入的头(cf-*, x-forwarded-*, cdn-loop 等):
  // 携带 cf-worker 等头的子请求会被 CF 边缘当作同 zone 请求拦截, 对裸 IP 目标直接报 1003
  const clientIp = request.headers.get('cf-connecting-ip')
  for (const key of [...headers.keys()]) {
    const k = key.toLowerCase()
    if (k.startsWith('cf-') || k.startsWith('x-forwarded') || k === 'x-real-ip' || k === 'cdn-loop' || k === 'true-client-ip') {
      headers.delete(key)
    }
  }
  if (clientIp) {
    headers.set('x-forwarded-for', clientIp)
  }

  let upstream
  try {
    upstream = await fetch(new Request(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'follow',
    }))
  } catch (err) {
    return new Response(JSON.stringify({ proxyError: String(err), version: FN_VERSION }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }

  // 透传后端响应(含 CORS 头, 后端 WebMvcConfig 已全放开)
  const resp = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  })
  resp.headers.set('x-fn-version', FN_VERSION)
  return resp
}
