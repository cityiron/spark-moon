import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type {
  VipPlan,
  VipPlanVenue,
  VipMembership,
  VipPlanStatus,
  Venue,
} from '@/types/models'

/** VIP 套餐查询参数 */
export interface VipPlanQuery extends PageQuery {
  status?: VipPlanStatus
}

/** 已购 VIP 权益会员查询参数 */
export interface VipMembershipQuery extends PageQuery {
  vipPlanId?: number
  status?: 'active' | 'expired'
}

/** 后端 VipPlanAdminVO → 前端 VipPlan 归一化 */
function normalizePlan(raw: any): VipPlan {
  return {
    ...raw,
    name: raw.name ?? '',
    price: raw.price ?? 0,
    durationMonths: raw.durationMonths ?? Math.ceil((raw.durationDays || 0) / 30),
    status: (raw.status === 1 || raw.status === 'active') ? 'active' : 'inactive',
    planType: raw.planType ?? 'venue',
  } as VipPlan
}

/** 前端 VipPlan → 后端 VipPlanSaveRequest */
function toSaveRequest(data: Partial<VipPlan>): Record<string, any> {
  return {
    name: data.name,
    planType: data.planType === 'platform' ? 'PLATFORM' : 'VENUE',
    price: data.price ?? 0,
    durationMonths: data.durationMonths ?? 12,
    description: data.description,
    status: data.status === 'active' ? 1 : 0,
  }
}

/** 套餐列表(分页) */
export async function getVipPlanList(params: VipPlanQuery) {
  const res = await request<PageResult<any>>({
    url: '/vip/plans',
    method: 'get',
    params,
  })
  return {
    ...res,
    list: (res.list || []).map(normalizePlan),
  } as PageResult<VipPlan>
}

/** 新增套餐 */
export function createVipPlan(data: Partial<VipPlan>) {
  return request<VipPlan>({
    url: '/vip/plan',
    method: 'post',
    data: toSaveRequest(data),
  })
}

/** 更新套餐 */
export function updateVipPlan(id: number, data: Partial<VipPlan>) {
  return request<VipPlan>({
    url: `/vip/plan/${id}`,
    method: 'put',
    data: toSaveRequest(data),
  })
}

/** 上架/下架套餐（后端为 query 参数） */
export function toggleVipPlanStatus(id: number, status: VipPlanStatus) {
  return request<void>({
    url: `/vip/plan/${id}/status`,
    method: 'patch',
    params: { status: status === 'active' ? 1 : 0 },
  })
}

/** 删除套餐 */
export function deleteVipPlan(id: number) {
  return request<void>({
    url: `/vip/plan/${id}`,
    method: 'delete',
  })
}

/** 获取套餐各球馆折扣配置（后端暂未实现，保留占位） */
export function getVipPlanVenueDiscounts(id: number) {
  return request<VipPlanVenue[]>({
    url: `/vip/plan/${id}/discounts`,
    method: 'get',
  })
}

/** 批量保存套餐球馆折扣（后端暂未实现，保留占位） */
export function saveVipPlanVenueDiscounts(id: number, data: VipPlanVenue[]) {
  return request<void>({
    url: `/vip/plan/${id}/discounts`,
    method: 'post',
    data,
  })
}

/** 已购 VIP 权益会员(分页) */
export async function getVipMemberships(params: VipMembershipQuery) {
  const res = await request<PageResult<any>>({
    url: '/vip/memberships',
    method: 'get',
    params,
  })
  return {
    ...res,
    list: (res.list || []).map((m: any) => ({
      ...m,
      userName: m.userName ?? '',
      userPhone: m.userPhone ?? '',
      vipPlanName: m.vipPlanName ?? '',
      status: m.status ?? 'expired',
    })),
  } as PageResult<VipMembership>
}

/** 全部球馆(折扣配置球馆选择用) - 复用 /venue/list */
export function getAllVenues() {
  return request<Venue[]>({
    url: '/venue/list',
    method: 'get',
  })
}
