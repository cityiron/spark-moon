import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type { EnterpriseItem } from '@/types/models'

export type IdParam = string | number

/** 企业分页查询参数 */
export interface EnterpriseQuery extends PageQuery {
  keyword?: string
  /** 归属俱乐部, 超管可指定, 经营者忽略 */
  operatorId?: IdParam
}

/** 企业保存参数 */
export interface EnterpriseSaveParams {
  operatorId?: IdParam
  name: string
  contactName?: string
  contactPhone?: string
  /** 定场专属折扣率 0.9=9折, 空=无折扣 */
  discountRate?: number
  remark?: string
  status?: 1 | 0
}

/** 归一化企业数据 */
function normalize(e: any): EnterpriseItem {
  return {
    ...e,
    name: e.name ?? '',
    status: e.status === 0 ? 0 : 1,
    discountRate: e.discountRate != null ? Number(e.discountRate) : undefined,
  } as EnterpriseItem
}

/** 企业分页列表 */
export async function getEnterpriseList(params: EnterpriseQuery) {
  const res = await request<PageResult<any>>({
    url: '/enterprise/list',
    method: 'get',
    params,
  })
  return {
    ...res,
    list: (res.list || []).map(normalize),
  } as PageResult<EnterpriseItem>
}

/** 启用企业简单列表(供订单关联下拉) */
export async function getEnterpriseAll() {
  const res = await request<any[]>({
    url: '/enterprise/all',
    method: 'get',
  })
  return (res || []).map(normalize)
}

/** 新增企业 */
export function createEnterprise(data: EnterpriseSaveParams) {
  return request<EnterpriseItem>({
    url: '/enterprise',
    method: 'post',
    data,
  })
}

/** 更新企业 */
export function updateEnterprise(id: IdParam, data: EnterpriseSaveParams) {
  return request<EnterpriseItem>({
    url: `/enterprise/${id}`,
    method: 'put',
    data,
  })
}

/** 启用/停用企业 */
export function toggleEnterpriseStatus(id: IdParam, status: 1 | 0) {
  return request<void>({
    url: `/enterprise/${id}/status`,
    method: 'patch',
    params: { status },
  })
}

/** 删除企业 */
export function deleteEnterprise(id: IdParam) {
  return request<void>({
    url: `/enterprise/${id}`,
    method: 'delete',
  })
}
