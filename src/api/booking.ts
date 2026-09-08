import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type { BookingOrder, CourtLock, CourtGridRow } from '@/types/models'

/**
 * ID 为雪花大整数，后端统一序列化为字符串避免 JS 精度丢失，
 * 因此各接口参数类型允许 string | number，前端应优先传 string。
 */
export type IdParam = string | number

/** 预订网格查询参数 */
export interface BookingGridQuery {
  venueId: IdParam
  date: string
}

/** 获取预订网格(场地 x 时段) */
export function getBookingGrid(params: BookingGridQuery) {
  return request<CourtGridRow[]>({
    url: '/booking/grid',
    method: 'get',
    params,
  })
}

/** 代客预订（前台代会员下单，memberPhone 指定归属会员） */
export function proxyBooking(data: Partial<BookingOrder>) {
  return request<BookingOrder>({
    url: '/booking/orders',
    method: 'post',
    data,
  })
}

/** 场地锁定 / 培训占用 */
export function lockCourt(data: CourtLock) {
  return request<CourtLock>({
    url: '/booking/lock',
    method: 'post',
    data,
  })
}

/** 解锁场地 */
export function unlockCourt(id: IdParam) {
  return request<void>({
    url: `/booking/lock/${id}`,
    method: 'delete',
  })
}

/** 取消预订 */
export function cancelBooking(id: IdParam) {
  return request<void>({
    url: `/booking/${id}/cancel`,
    method: 'post',
  })
}

/** 预订订单详情 */
export function getBookingDetail(id: IdParam) {
  return request<BookingOrder>({
    url: `/booking/${id}`,
    method: 'get',
  })
}

/** 核销预订（待支付/已支付订单核销为已核销；仅经营者可操作） */
export function verifyBooking(id: IdParam) {
  return request<BookingOrder>({
    url: `/booking/orders/${id}/verify`,
    method: 'put',
  })
}

/** 经营者取消订单（PC 后台；无用户侧的时间/退费限制，仅经营者可操作） */
export function adminCancelBooking(id: IdParam) {
  return request<BookingOrder>({
    url: `/booking/orders/${id}/admin-cancel`,
    method: 'put',
  })
}

/** 统一订单列表项(对应后端 BookingOrderVO: 金额单位为元, timeSlots 为 JSON 字符串) */
export interface AdminOrderItem {
  /** ID 为雪花大整数，后端序列化为字符串 */
  id: IdParam
  /** 统一订单号 */
  orderNo: string
  /** 订单类型: BOOKING 场地预订 / PRODUCT 商品 / TRAINING 培训 / VIP 会员卡 */
  orderType: string
  venueId: IdParam
  venueName?: string
  courtId: IdParam
  courtName?: string
  userId: IdParam
  /** 下单会员姓名(快照) */
  memberName?: string
  /** 下单会员手机号(快照) */
  memberPhone?: string
  /** 预订日期 YYYY-MM-DD */
  date: string
  /** 时段 JSON 字符串 [{startTime,endTime},...] */
  timeSlots: string
  /** 状态码: 0待支付 1已支付 2已核销 3已取消 4未到场 */
  status: number
  /** 支付方式: CARD/WECHAT/ALIPAY/OFFLINE */
  paymentMethod?: string
  /** 实付金额(元) */
  amount: number
  /** 原价(元) */
  originalAmount: number
  /** 优惠金额(元) */
  discountAmount: number
  qrcode?: string
  createdAt?: string
  updatedAt?: string
}

/** 经营者订单列表查询参数 */
export interface OrderQuery extends PageQuery {
  /** 状态码: 0待支付 1已支付 2已核销 3已取消 4未到场 */
  status?: number
  venueId?: IdParam
  /** 起始日期 YYYY-MM-DD */
  dateFrom?: string
  /** 结束日期 YYYY-MM-DD */
  dateTo?: string
  /** 关键字(订单号/会员姓名/手机号) */
  keyword?: string
}

/**
 * 经营者订单分页列表(统一订单列表)
 * 未来卖水/羽毛球/周边等商品订单接入后同样在此列表展示(orderType 区分)
 */
export function getOrders(params: OrderQuery) {
  return request<PageResult<AdminOrderItem>>({
    url: '/booking/orders',
    method: 'get',
    params,
  })
}
