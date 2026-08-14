import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type {
  FinanceRecord,
  FinanceStats,
  MonthlyFinance,
  VenueFinanceSummary,
  FinanceEntryType,
  IncomeCategory,
  ExpenseCategory,
} from '@/types/models'

/** 财务记录查询参数 */
export interface FinanceQuery extends PageQuery {
  type?: FinanceEntryType
  category?: IncomeCategory | ExpenseCategory
  venueId?: number
  /** YYYY-MM */
  month?: string
}

/** 新增/编辑财务记录入参 */
export interface FinanceRecordPayload {
  type: FinanceEntryType
  category: IncomeCategory | ExpenseCategory
  /** 金额(分) */
  amount: number
  venueId?: number
  /** YYYY-MM-DD */
  recordDate: string
  /** 经办人 */
  operator?: string
  remark?: string
}

/** 财务统计 (支持按月) */
export function getFinanceStats(month?: string) {
  return request<FinanceStats>({
    url: '/finance/stats',
    method: 'get',
    params: month ? { month } : undefined,
  })
}

/** 最近 6 个月月度收支 */
export function getMonthlyFinance() {
  return request<MonthlyFinance[]>({
    url: '/finance/monthly',
    method: 'get',
  })
}

/** 球馆收支汇总 (支持按月) */
export function getVenueFinanceSummary(month?: string) {
  return request<VenueFinanceSummary[]>({
    url: '/finance/venue-summary',
    method: 'get',
    params: month ? { month } : undefined,
  })
}

/** 财务记录分页 */
export function getFinanceRecords(params: FinanceQuery) {
  return request<PageResult<FinanceRecord>>({
    url: '/finance/records',
    method: 'get',
    params,
  })
}

/** 新增财务记录 (手动记账) */
export function createFinanceRecord(data: FinanceRecordPayload) {
  return request<FinanceRecord>({
    url: '/finance/record',
    method: 'post',
    data,
  })
}

/** 更新财务记录 */
export function updateFinanceRecord(id: number, data: FinanceRecordPayload) {
  return request<FinanceRecord>({
    url: `/finance/record/${id}`,
    method: 'put',
    data,
  })
}

/** 删除财务记录 */
export function deleteFinanceRecord(id: number) {
  return request<void>({
    url: `/finance/record/${id}`,
    method: 'delete',
  })
}
