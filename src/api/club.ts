import { request } from '@/api/request'
import type { PageQuery, PageResult } from '@/types/api'

export interface ClubAdminQuery extends PageQuery {
  keyword?: string
  /** 1 已认证 / 0 未认证 */
  certified?: number
}

/** 管理端-俱乐部列表项 */
export interface ClubAdminItem {
  id: string
  name: string
  avatar?: string
  description?: string
  phone?: string
  /** 特色标签(逗号分隔) */
  tags?: string
  ownerId?: string
  ownerName?: string
  operatorId?: string
  operatorName?: string
  certified: boolean
  memberCount: number
  /** 常去地点地址 */
  address?: string
  createdAt: string
}

/** 俱乐部分页列表 */
export function getAdminClubList(params: ClubAdminQuery) {
  return request<PageResult<ClubAdminItem>>({
    url: '/admin/club/list',
    method: 'GET',
    params,
  })
}

/** 官方认证/取消认证 (仅超级管理员) */
export function certifyClub(data: {
  clubId: string | number
  certified: boolean
  /** 认证时需指定绑定的经营者 */
  operatorId?: string | number
}) {
  return request({
    url: '/admin/club/certify',
    method: 'POST',
    data,
  })
}
