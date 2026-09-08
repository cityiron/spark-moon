import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type { Friend, FriendStats } from '@/types/models'

/**
 * ID 为雪花大整数，后端统一序列化为字符串避免 JS 精度丢失，
 * 因此各接口参数类型允许 string | number，前端应优先传 string。
 */
export type IdParam = string | number

/** 球友查询参数 */
export interface FriendQuery extends PageQuery {
  keyword?: string
  /** 是否持卡过滤 */
  hasCard?: boolean
  /** 俱乐部(经营者) id，平台角色可传以切换俱乐部 */
  operatorId?: IdParam
}

/** 后端 FriendVO → 前端 Friend 归一化 */
export function normalizeFriend(raw: any): Friend {
  return {
    ...raw,
    nickname: raw.nickname ?? '',
    hasCard: !!raw.hasCard,
    bookingCount: raw.bookingCount ?? 0,
    bookingAmount: raw.bookingAmount ?? 0,
  } as Friend
}

/** 球友列表 */
export async function getFriendList(params: FriendQuery) {
  const res = await request<PageResult<any>>({
    url: '/friend/list',
    method: 'get',
    params,
  })
  return {
    ...res,
    list: (res.list || []).map(normalizeFriend),
  } as PageResult<Friend>
}

/** 球友统计 */
export function getFriendStats(operatorId?: IdParam) {
  return request<FriendStats>({
    url: '/friend/stats',
    method: 'get',
    params: operatorId ? { operatorId } : undefined,
  })
}
