import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'

/**
 * ID 为雪花大整数，后端统一序列化为字符串避免 JS 精度丢失，
 * 因此各接口参数类型允许 string | number，前端应优先传 string。
 */
export type ActivityIdParam = string | number

/** 活动查询参数 */
export interface ActivityAdminQuery extends PageQuery {
  title?: string
  activityType?: string
  status?: string
  isVisible?: boolean
}

/** 管理端活动 VO */
export interface ActivityAdminItem {
  id: ActivityIdParam
  operatorId: ActivityIdParam
  operatorName?: string
  operatorPhone?: string
  title: string
  activityType: 'club' | 'temp'
  /** 关联球馆ID(booking_venue.id); NULL=未绑定(仅超管可见) */
  venueId?: ActivityIdParam
  venueName?: string
  court?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  deadlineDate?: string
  deadlineTime?: string
  /** 详细地址 */
  venueAddress?: string
  /** 女士优惠开关 */
  ladyDiscount?: boolean
  /** 早鸟优惠开关 */
  earlyBird?: boolean
  /** 标签 */
  tags?: string[]
  /** 活动描述 */
  description?: string
  contactName?: string
  contactPhone?: string
  contactWechat?: string
  currentPlayers: number
  maxPlayers: number
  feeType: 'free' | 'fixed' | 'aa'
  feeAmount: number
  /** 展示价格(分) */
  price: number
  status: string
  isVisible: boolean
  createdAt?: string
}

/** 活动保存请求(新增/编辑) */
export interface ActivityAdminSave {
  /** super_admin 可指定经营者 */
  operatorId?: ActivityIdParam
  title: string
  activityType: 'club' | 'temp'
  court?: string
  /** 关联球馆ID(booking_venue.id); 非 super_admin 必填 */
  venueId?: ActivityIdParam
  venueName?: string
  venueAddress?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  deadlineDate?: string
  deadlineTime?: string
  maxParticipants?: number
  feeType: 'free' | 'fixed' | 'aa'
  /** 金额(元)，后端转分存储 */
  feeAmount?: number
  ladyDiscount?: boolean
  earlyBird?: boolean
  tags?: string[]
  description?: string
  contactName?: string
  contactPhone?: string
  contactWechat?: string
  isVisible?: boolean
  status?: string
}

/** 活动分页列表 */
export function getActivityAdminList(params: ActivityAdminQuery) {
  return request<PageResult<ActivityAdminItem>>({
    url: '/activity/manage/list',
    method: 'get',
    params,
  })
}

/** 活动详情 */
export function getActivityAdminDetail(id: ActivityIdParam) {
  return request<ActivityAdminItem>({
    url: `/activity/manage/${id}`,
    method: 'get',
  })
}

/** 新增活动 */
export function createActivityAdmin(data: ActivityAdminSave) {
  return request<ActivityAdminItem>({
    url: '/activity/manage',
    method: 'post',
    data,
  })
}

/** 编辑活动 */
export function updateActivityAdmin(id: ActivityIdParam, data: ActivityAdminSave) {
  return request<ActivityAdminItem>({
    url: `/activity/manage/${id}`,
    method: 'put',
    data,
  })
}

/** 上架/下架 */
export function setActivityVisibility(id: ActivityIdParam, visible: boolean) {
  return request<void>({
    url: `/activity/manage/${id}/visibility`,
    method: 'put',
    params: { visible },
  })
}

/** 删除活动 */
export function deleteActivityAdmin(id: ActivityIdParam) {
  return request<void>({
    url: `/activity/manage/${id}`,
    method: 'delete',
  })
}
