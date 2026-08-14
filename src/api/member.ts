import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type {
  Member,
  CardTransaction,
  RechargeParams,
  BalanceAdjustParams,
  RefundParams,
  MemberStats,
} from '@/types/models'

/** 会员查询参数 */
export interface MemberQuery extends PageQuery {
  keyword?: string
  cardType?: string
  cardStatus?: string
}

/** 会员列表 */
export function getMemberList(params: MemberQuery) {
  return request<PageResult<Member>>({
    url: '/member/list',
    method: 'get',
    params,
  })
}

/** 会员统计 */
export function getMemberStats() {
  return request<MemberStats>({
    url: '/member/stats',
    method: 'get',
  })
}

/** 会员详情 */
export function getMemberDetail(id: number) {
  return request<Member>({
    url: `/member/${id}`,
    method: 'get',
  })
}

/** 新增会员 */
export function createMember(data: Partial<Member>) {
  return request<Member>({
    url: '/member',
    method: 'post',
    data,
  })
}

/** 更新会员 */
export function updateMember(id: number, data: Partial<Member>) {
  return request<Member>({
    url: `/member/${id}`,
    method: 'put',
    data,
  })
}

/** 冻结/解冻会员卡 */
export function toggleMemberStatus(id: number, status: string) {
  return request<void>({
    url: `/member/${id}/status`,
    method: 'patch',
    data: { status },
  })
}

/** 充值 */
export function recharge(data: RechargeParams) {
  return request<CardTransaction>({
    url: '/member/recharge',
    method: 'post',
    data,
  })
}

/** 余额调整 */
export function adjustBalance(data: BalanceAdjustParams) {
  return request<CardTransaction>({
    url: '/member/adjust',
    method: 'post',
    data,
  })
}

/** 退款 */
export function refundMember(data: RefundParams) {
  return request<CardTransaction>({
    url: '/member/refund',
    method: 'post',
    data,
  })
}

/** 会员卡交易记录 */
export function getMemberTransactions(memberId: number, params?: PageQuery) {
  return request<PageResult<CardTransaction>>({
    url: `/member/${memberId}/transactions`,
    method: 'get',
    params,
  })
}
