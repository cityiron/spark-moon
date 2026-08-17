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

/** 后端 MemberVO → 前端 Member 归一化（cardType 大写转小写、金额缺省补0） */
export function normalizeMember(raw: any): Member {
  const cardTypeMap: Record<string, string> = {
    STORED_VALUE: 'stored_value',
    TIMES: 'times_card',
    MONTHLY: 'monthly_card',
  }
  return {
    ...raw,
    name: raw.name ?? raw.nickname ?? '',
    cardType: raw.cardType ? (cardTypeMap[raw.cardType] || raw.cardType.toLowerCase()) : 'stored_value',
    cardNo: raw.cardNo ?? '',
    balance: raw.balance ?? 0,
    totalRecharge: raw.totalRecharge ?? 0,
    totalConsume: raw.totalConsume ?? 0,
    cardStatus: raw.cardStatus ?? (raw.status === 1 ? 'active' : 'frozen'),
    remainingTimes: raw.remainingTimes ?? 0,
  } as Member
}

/** 会员列表 */
export async function getMemberList(params: MemberQuery) {
  const res = await request<PageResult<any>>({
    url: '/member/list',
    method: 'get',
    params,
  })
  return {
    ...res,
    list: (res.list || []).map(normalizeMember),
  } as PageResult<Member>
}

/** 会员统计 */
export function getMemberStats() {
  return request<MemberStats>({
    url: '/member/stats',
    method: 'get',
  })
}

/** 会员详情 */
export async function getMemberDetail(id: number) {
  const res = await request<any>({
    url: `/member/${id}`,
    method: 'get',
  })
  return normalizeMember(res)
}

/** 提交参数: 前端 Member → 后端 MemberSaveRequest 字段 */
function toSaveRequest(data: Partial<Member>): Record<string, any> {
  const cardTypeMap: Record<string, string> = {
    stored_value: 'STORED_VALUE',
    times_card: 'TIMES',
    monthly_card: 'MONTHLY',
  }
  const extra = data as Partial<Member> & { initAmount?: number, initTimes?: number }
  return {
    phone: data.phone,
    nickname: data.name,
    cardType: data.cardType ? (cardTypeMap[data.cardType] || data.cardType.toUpperCase()) : undefined,
    initAmount: extra.initAmount ?? data.balance ?? undefined,
    initTimes: extra.initTimes ?? undefined,
    status: data.status,
  }
}

/** 新增会员 */
export function createMember(data: Partial<Member>) {
  return request<Member>({
    url: '/member',
    method: 'post',
    data: toSaveRequest(data),
  })
}

/** 更新会员 */
export function updateMember(id: number, data: Partial<Member>) {
  return request<Member>({
    url: `/member/${id}`,
    method: 'put',
    data: toSaveRequest(data),
  })
}

/** 冻结/解冻会员卡: active->1, frozen->0 */
export function toggleMemberStatus(id: number, status: string) {
  return request<void>({
    url: `/member/${id}/status`,
    method: 'patch',
    data: { status: status === 'active' ? 1 : 0 },
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
