/**
 * API 通用类型定义
 */

/** 统一返回结果包装 */
export interface Result<T = unknown> {
  /** 业务状态码，0 表示成功 */
  code: number
  /** 提示信息 */
  message: string
  /** 业务数据 */
  data: T
  /** 请求追踪 ID */
  traceId?: string
}

/** 分页结果 */
export interface PageResult<T = unknown> {
  /** 当前页数据列表 */
  list: T[]
  /** 总记录数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页条数 */
  size: number
}

/** 分页查询参数 */
export interface PageQuery {
  page?: number
  size?: number
  [key: string]: unknown
}

/** 登录请求 */
export interface LoginParams {
  /** 账号密码模式下的用户名/手机号 */
  username?: string
  /** 账号密码模式下的密码 */
  password?: string
  /** 手机号验证码模式下的手机号 */
  phone?: string
  /** 手机号验证码模式下的短信验证码 */
  smsCode?: string
  /** 登录方式: account 账号密码 | sms 手机号验证码 */
  loginType: 'account' | 'sms'
}

/** 登录响应 */
export interface LoginResult {
  token: string
  refreshToken?: string
  expiresIn?: number
}

/** 发送短信验证码参数 */
export interface SendSmsParams {
  phone: string
  /** 场景类型: login | register | reset */
  scene?: string
}
