import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type {
  VipPlan,
  VipMembership,
  VipPlanStatus,
  VipBenefit,
  RechargeTier,
  Venue,
} from '@/types/models'

/**
 * ID 为雪花大整数，后端统一序列化为字符串避免 JS 精度丢失，
 * 因此各接口参数类型允许 string | number，前端应优先传 string。
 */
export type IdParam = string | number

/** VIP 套餐查询参数 */
export interface VipPlanQuery extends PageQuery {
  status?: VipPlanStatus
  /** 卡类型: platform 平台卡 / venue 球馆卡 */
  planType?: 'platform' | 'venue'
}

/** 已购 VIP 权益会员查询参数 */
export interface VipMembershipQuery extends PageQuery {
  vipPlanId?: IdParam
  status?: 'active' | 'expired'
  /** 卡类型: platform 平台卡 / venue 球馆卡 */
  planType?: 'platform' | 'venue'
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
export function updateVipPlan(id: IdParam, data: Partial<VipPlan>) {
  return request<VipPlan>({
    url: `/vip/plan/${id}`,
    method: 'put',
    data: toSaveRequest(data),
  })
}

/** 上架/下架套餐（后端为 query 参数） */
export function toggleVipPlanStatus(id: IdParam, status: VipPlanStatus) {
  return request<void>({
    url: `/vip/plan/${id}/status`,
    method: 'patch',
    params: { status: status === 'active' ? 1 : 0 },
  })
}

/** 删除套餐 */
export function deleteVipPlan(id: IdParam) {
  return request<void>({
    url: `/vip/plan/${id}`,
    method: 'delete',
  })
}

/** 获取卡种权益列表 */
export function getVipPlanBenefits(planId: IdParam) {
  return request<VipBenefit[]>({
    url: `/vip/plan/${planId}/benefits`,
    method: 'get',
  })
}

/** 覆盖保存卡种权益 */
export function saveVipPlanBenefits(planId: IdParam, benefits: VipBenefit[]) {
  return request<VipBenefit[]>({
    url: `/vip/plan/${planId}/benefits`,
    method: 'put',
    data: benefits,
  })
}

/** 储值等级档位列表 */
export function getRechargeTiers() {
  return request<RechargeTier[]>({
    url: '/vip/recharge-tiers',
    method: 'get',
  })
}

/** 覆盖保存储值等级档位 */
export function saveRechargeTiers(tiers: RechargeTier[]) {
  return request<RechargeTier[]>({
    url: '/vip/recharge-tiers',
    method: 'put',
    data: tiers,
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

/** 全部球馆(折扣配置球馆选择用) - 复用 /venue/all (返回数组, 经营者仅看自己俱乐部的球馆) */
export function getAllVenues() {
  return request<Venue[]>({
    url: '/venue/all',
    method: 'get',
  })
}
