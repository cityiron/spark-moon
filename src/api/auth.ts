import { request } from './request'
import type { LoginParams, LoginResult, SendSmsParams } from '@/types/api'
import type { UserInfo } from '@/types/models'

/** 账号密码 + 短信验证码登录 */
export function login(data: LoginParams) {
  return request<LoginResult>({
    url: '/auth/login',
    method: 'post',
    data,
  })
}

/** 发送短信验证码 */
export function sendSmsCode(data: SendSmsParams) {
  return request<boolean>({
    url: '/auth/sms/send',
    method: 'post',
    data,
  })
}

/** 获取当前登录用户信息 */
export function getUserInfo() {
  return request<UserInfo>({
    url: '/auth/userinfo',
    method: 'get',
  })
}

/** 退出登录 */
export function logout() {
  return request<void>({
    url: '/auth/logout',
    method: 'post',
  })
}
