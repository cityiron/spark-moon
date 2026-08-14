import { request } from '@/api/request'
import type { PageQuery, PageResult } from '@/types/api'
import type {
  AdminAccount,
  AdminRole,
  MchConfigParams,
  OperatorApplication,
  OperatorStats,
  AccountStatus,
} from '@/types/models'

// ==================== 入驻申请 ====================
export interface OperatorQuery extends PageQuery {
  status?: string
  keyword?: string
}

/** 经营者提交入驻申请 (公开接口, 无需登录) */
export function submitApplication(data: {
  companyName: string
  licenseNo: string
  licenseImage?: string
  contactName: string
  contactPhone: string
  venueName: string
  venueAddress: string
  venueCourtCount: number
  venueOpenTime: string
  venueCloseTime: string
}) {
  return request({
    url: '/operator/apply',
    method: 'POST',
    data,
  })
}

/** 入驻申请列表 (分页) */
export function getOperatorList(params: OperatorQuery) {
  return request<PageResult<OperatorApplication>>({
    url: '/operator/list',
    method: 'GET',
    params,
  })
}

/** 申请详情 */
export function getOperatorDetail(id: number) {
  return request<OperatorApplication>({
    url: `/operator/${id}`,
    method: 'GET',
  })
}

/** 审核通过 */
export function approveOperator(id: number) {
  return request({
    url: `/operator/${id}/approve`,
    method: 'POST',
  })
}

/** 审核驳回 */
export function rejectOperator(id: number, rejectReason: string) {
  return request({
    url: `/operator/${id}/reject`,
    method: 'POST',
    data: { rejectReason },
  })
}

/** 配置微信支付商户号 */
export function configMch(id: number, params: MchConfigParams) {
  return request({
    url: `/operator/${id}/mch`,
    method: 'POST',
    data: params,
  })
}

/** 商户号小额验证 */
export function verifyMch(id: number) {
  return request({
    url: `/operator/${id}/mch/verify`,
    method: 'POST',
  })
}

// ==================== 账号管理 ====================
export interface AccountQuery extends PageQuery {
  operatorId?: number
  role?: AdminRole
  status?: AccountStatus
  keyword?: string
}

/** 账号列表 (分页) */
export function getAccountList(params: AccountQuery) {
  return request<PageResult<AdminAccount>>({
    url: '/operator/accounts',
    method: 'GET',
    params,
  })
}

/** 新建账号 */
export function createAccount(data: {
  operatorId: number
  username: string
  nickname: string
  phone: string
  password: string
  role: AdminRole
  venueIds: number[]
}) {
  return request({
    url: '/operator/account',
    method: 'POST',
    data,
  })
}

/** 编辑账号 */
export function updateAccount(id: number, data: Partial<{
  nickname: string
  phone: string
  password?: string
  role: AdminRole
  venueIds: number[]
}>) {
  return request({
    url: `/operator/account/${id}`,
    method: 'PUT',
    data,
  })
}

/** 切换账号状态 (启用/禁用) */
export function toggleAccountStatus(id: number) {
  return request({
    url: `/operator/account/${id}/status`,
    method: 'PATCH',
  })
}

/** 删除账号 */
export function deleteAccount(id: number) {
  return request({
    url: `/operator/account/${id}`,
    method: 'DELETE',
  })
}

/** 重置账号密码 */
export function resetPassword(id: number) {
  return request({
    url: `/operator/account/${id}/reset-password`,
    method: 'POST',
  })
}

// ==================== 统计 ====================
export function getOperatorStats() {
  return request<OperatorStats>({
    url: '/operator/stats',
    method: 'GET',
  })
}
