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
  /** 查询日期范围 yyyy-MM-dd(按需生成周期系列期次) */
  from?: string
  to?: string
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
  /** 重复发布系列ID(同一次每周重复发布展开的多期共享, 单次发布为 NULL) */
  seriesId?: ActivityIdParam
  /** 重复规则JSON, 如 {"repeatType":"weekly","weekdays":[2,4],"totalCount":20} */
  repeatRule?: string
  /** 期序号(周期系列期次: 第N次) */
  sessionNo?: number
  /** 单期是否被手动修改过(锁定, 周期规则修改不再覆盖) */
  isLocked?: boolean
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
  /** 每周重复发布: true 启用(创建长期延续系列, 期次按需生成, 仅新增有效) */
  repeatEnabled?: boolean
  /** 每周重复的星期(1=周一...7=周日), repeatEnabled=true 时必填, 可多选 */
  weekdays?: number[]
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

// ==================== 周期系列 ====================

/** 管理端周期系列 VO(一个系列 = 一条长期重复规则 + 按需生成的若干期次) */
export interface ActivitySeriesItem {
  id: ActivityIdParam
  operatorId: ActivityIdParam
  operatorName?: string
  operatorPhone?: string
  venueId?: ActivityIdParam
  title: string
  activityType?: 'club' | 'temp'
  venueName?: string
  venueAddress?: string
  court?: string
  startTime?: string
  endTime?: string
  maxPlayers?: number
  feeType?: 'free' | 'fixed' | 'aa'
  feeAmount?: number
  price?: number
  ladyDiscount?: boolean
  earlyBird?: boolean
  tags?: string[]
  description?: string
  contactName?: string
  contactPhone?: string
  contactWechat?: string
  /** 每周重复星期(1=周一...7=周日) */
  weekdays?: number[]
  /** 星期展示文案, 如「周二、周四」 */
  weekdayLabel?: string
  /** 规则生效日期 yyyy-MM-dd */
  effectiveDate?: string
  /** 当前共生成期数 */
  totalSessions?: number
  /** 最新一期期序号(第N次) */
  latestSessionNo?: number
  /** 最近一期日期 */
  latestDate?: string
  /** 下一期日期 */
  nextDate?: string
  isVisible?: boolean
  status?: string
  createdAt?: string
}

/** 周期系列规则修改请求(费用金额以「元」提交) */
export interface ActivitySeriesSave {
  title?: string
  activityType?: 'club' | 'temp'
  court?: string
  venueId?: ActivityIdParam
  venueName?: string
  venueAddress?: string
  startTime?: string
  endTime?: string
  maxParticipants?: number
  feeType?: 'free' | 'fixed' | 'aa'
  feeAmount?: number
  ladyDiscount?: boolean
  earlyBird?: boolean
  tags?: string[]
  description?: string
  contactName?: string
  contactPhone?: string
  contactWechat?: string
  /** 每周重复的星期(1=周一...7=周日), 必填 */
  weekdays?: number[]
  /** 规则生效日期 yyyy-MM-dd(默认今天, 不能早于今天) */
  effectiveDate?: string
  isVisible?: boolean
}

/** 周期系列分页列表 */
export function getActivitySeriesList(params: PageQuery & { title?: string }) {
  return request<PageResult<ActivitySeriesItem>>({
    url: '/activity/manage/series/list',
    method: 'get',
    params,
  })
}

/** 系列详情 */
export function getActivitySeriesDetail(id: ActivityIdParam) {
  return request<ActivitySeriesItem>({
    url: `/activity/manage/series/${id}`,
    method: 'get',
  })
}

/** 系列期次列表(查询范围内按需生成) */
export function getActivitySeriesSessions(id: ActivityIdParam, params: { from?: string; to?: string }) {
  return request<ActivityAdminItem[]>({
    url: `/activity/manage/series/${id}/sessions`,
    method: 'get',
    params,
  })
}

/** 修改系列规则(可指定生效日期, 生效前保持, 生效后按新规则生成/调整) */
export function updateActivitySeries(id: ActivityIdParam, data: ActivitySeriesSave) {
  return request<ActivitySeriesItem>({
    url: `/activity/manage/series/${id}`,
    method: 'put',
    data,
  })
}

/** 删除系列(有报名的期次下架保留, 无报名的物理删除) */
export function deleteActivitySeries(id: ActivityIdParam) {
  return request<void>({
    url: `/activity/manage/series/${id}`,
    method: 'delete',
  })
}
