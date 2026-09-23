import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type { InvoiceApplyItem } from '@/types/models'

export type IdParam = string | number

/** 开票申请分页查询参数 */
export interface InvoiceQuery extends PageQuery {
  /** PENDING / CONFIRMED / REJECTED */
  status?: string
  keyword?: string
  /** 归属俱乐部, 超管可指定 */
  operatorId?: IdParam
}

/** 处理开票: CONFIRMED 填发票号 / REJECTED 填驳回原因 */
export interface InvoiceConfirmParams {
  status: 'CONFIRMED' | 'REJECTED'
  invoiceNo?: string
  rejectReason?: string
}

/** 归一化开票申请 */
function normalize(a: any): InvoiceApplyItem {
  return {
    ...a,
    amount: Number(a.amount ?? 0),
    status: a.status ?? 'PENDING',
    invoiceType: a.invoiceType === 'COMPANY' ? 'COMPANY' : 'PERSONAL',
  } as InvoiceApplyItem
}

/** 开票申请分页列表 */
export async function getInvoiceList(params: InvoiceQuery) {
  const res = await request<PageResult<any>>({
    url: '/invoice/list',
    method: 'get',
    params,
  })
  return {
    ...res,
    list: (res.list || []).map(normalize),
  } as PageResult<InvoiceApplyItem>
}

/** 确认开票/驳回 */
export function confirmInvoice(id: IdParam, data: InvoiceConfirmParams) {
  return request<InvoiceApplyItem>({
    url: `/invoice/${id}/confirm`,
    method: 'put',
    data,
  })
}
