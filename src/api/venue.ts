import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type { Venue, Court, CourtPriceConfig } from '@/types/models'

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

export function getVenueDetail(id: number) {
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

export function updateVenue(id: number, data: Partial<Venue>) {
  return request<Venue>({
    url: `/venue/${id}`,
    method: 'put',
    data,
  })
}

export function deleteVenue(id: number) {
  return request<void>({
    url: `/venue/${id}`,
    method: 'delete',
  })
}

/** 场地相关 */
export function getVenueCourts(venueId: number) {
  return request<Court[]>({
    url: `/venue/${venueId}/courts`,
    method: 'get',
  })
}

export function createCourt(venueId: number, data: Partial<Court>) {
  return request<Court>({
    url: `/venue/${venueId}/courts`,
    method: 'post',
    data,
  })
}

export function updateCourt(venueId: number, courtId: number, data: Partial<Court>) {
  return request<Court>({
    url: `/venue/${venueId}/courts/${courtId}`,
    method: 'put',
    data,
  })
}

export function deleteCourt(venueId: number, courtId: number) {
  return request<void>({
    url: `/venue/${venueId}/courts/${courtId}`,
    method: 'delete',
  })
}

/** 场地价格配置 */
export function getCourtPriceConfigs(courtId: number) {
  return request<CourtPriceConfig[]>({
    url: `/court/${courtId}/prices`,
    method: 'get',
  })
}

export function saveCourtPriceConfigs(courtId: number, data: CourtPriceConfig[]) {
  return request<void>({
    url: `/court/${courtId}/prices`,
    method: 'put',
    data: { configs: data },
  })
}
