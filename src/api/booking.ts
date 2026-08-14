import { request } from './request'
import type { BookingOrder, CourtLock, CourtGridRow } from '@/types/models'

/** 预订网格查询参数 */
export interface BookingGridQuery {
  venueId: number
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

/** 代客预订 */
export function proxyBooking(data: Partial<BookingOrder>) {
  return request<BookingOrder>({
    url: '/booking/proxy',
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
export function unlockCourt(id: number) {
  return request<void>({
    url: `/booking/lock/${id}`,
    method: 'delete',
  })
}

/** 取消预订 */
export function cancelBooking(id: number) {
  return request<void>({
    url: `/booking/${id}/cancel`,
    method: 'post',
  })
}

/** 预订订单详情 */
export function getBookingDetail(id: number) {
  return request<BookingOrder>({
    url: `/booking/${id}`,
    method: 'get',
  })
}
