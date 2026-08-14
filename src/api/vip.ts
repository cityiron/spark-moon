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

/** 套餐列表(分页) */
export function getVipPlanList(params: VipPlanQuery) {
  return request<PageResult<VipPlan>>({
    url: '/vip/plans',
    method: 'get',
    params,
  })
}

/** 新增套餐 */
export function createVipPlan(data: Partial<VipPlan>) {
  return request<VipPlan>({
    url: '/vip/plan',
    method: 'post',
    data,
  })
}

/** 更新套餐 */
export function updateVipPlan(id: number, data: Partial<VipPlan>) {
  return request<VipPlan>({
    url: `/vip/plan/${id}`,
    method: 'put',
    data,
  })
}

/** 上架/下架套餐 */
export function toggleVipPlanStatus(id: number, status: VipPlanStatus) {
  return request<void>({
    url: `/vip/plan/${id}/status`,
    method: 'patch',
    data: { status },
  })
}

/** 删除套餐 */
export function deleteVipPlan(id: number) {
  return request<void>({
    url: `/vip/plan/${id}`,
    method: 'delete',
  })
}

/** 获取套餐各球馆折扣配置 */
export function getVipPlanVenueDiscounts(id: number) {
  return request<VipPlanVenue[]>({
    url: `/vip/plan/${id}/discounts`,
    method: 'get',
  })
}

/** 批量保存套餐球馆折扣 */
export function saveVipPlanVenueDiscounts(id: number, data: VipPlanVenue[]) {
  return request<void>({
    url: `/vip/plan/${id}/discounts`,
    method: 'post',
    data,
  })
}

/** 已购 VIP 权益会员(分页) */
export function getVipMemberships(params: VipMembershipQuery) {
  return request<PageResult<VipMembership>>({
    url: '/vip/memberships',
    method: 'get',
    params,
  })
}

/** 全部球馆(折扣配置球馆选择用) - 复用 /venue/list */
export function getAllVenues() {
  return request<Venue[]>({
    url: '/venue/list',
    method: 'get',
  })
}
