import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type { Venue, Court, PriceGroup } from '@/types/models'

/** 场馆查询参数 */
export interface VenueQuery extends PageQuery {
  name?: string
  status?: number
}

/** 场馆 CRUD */
export function getVenueList(params: VenueQuery) {
  return request<PageResult<Venue>>({
    url: '/venue/list',
    method: 'get',
    params,
  })
}

/** 获取全部场馆(下拉用) */
export function getAllVenues() {
  return request<Venue[]>({
    url: '/venue/all',
    method: 'get',
  })
}

/**
 * ID 为雪花大整数，后端统一序列化为字符串避免 JS 精度丢失，
 * 因此各接口参数类型允许 string | number，前端应优先传 string。
 */
export type IdParam = string | number

export function getVenueDetail(id: IdParam) {
  return request<Venue>({
    url: `/venue/${id}`,
    method: 'get',
  })
}

export function createVenue(data: Partial<Venue>) {
  return request<Venue>({
    url: '/venue',
    method: 'post',
    data,
  })
}

export function updateVenue(id: IdParam, data: Partial<Venue>) {
  return request<Venue>({
    url: `/venue/${id}`,
    method: 'put',
    data,
  })
}

export function deleteVenue(id: IdParam) {
  return request<void>({
    url: `/venue/${id}`,
    method: 'delete',
  })
}

/** 上传图片(七牛云), 返回可访问 URL */
export function uploadImage(file: File | Blob) {
  const formData = new FormData()
  formData.append('file', file)
  // 不手动设 Content-Type, 由 axios 自动带 boundary
  return request<string>({
    url: '/upload/image',
    method: 'post',
    data: formData,
  })
}

/** 场地相关 */
export function getVenueCourts(venueId: IdParam) {
  return request<Court[]>({
    url: `/venue/${venueId}/courts`,
    method: 'get',
  })
}

export function createCourt(venueId: IdParam, data: Partial<Court>) {
  return request<Court>({
    url: `/venue/${venueId}/courts`,
    method: 'post',
    data,
  })
}

export function updateCourt(venueId: IdParam, courtId: IdParam, data: Partial<Court>) {
  return request<Court>({
    url: `/venue/${venueId}/courts/${courtId}`,
    method: 'put',
    data,
  })
}

export function deleteCourt(venueId: IdParam, courtId: IdParam) {
  return request<void>({
    url: `/venue/${venueId}/courts/${courtId}`,
    method: 'delete',
  })
}

/** 球馆价格分组配置（按 priority 降序返回） */
export function getVenuePriceGroups(venueId: IdParam) {
  return request<PriceGroup[]>({
    url: `/venue/${venueId}/price-groups`,
    method: 'get',
  })
}

/** 保存球馆价格分组（全量覆盖） */
export function saveVenuePriceGroups(venueId: IdParam, data: PriceGroup[]) {
  return request<void>({
    url: `/venue/${venueId}/price-groups`,
    method: 'put',
    data,
  })
}
