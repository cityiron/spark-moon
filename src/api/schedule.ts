import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type { TrainingSession, AutoScheduleParams, CalcEndDateParams } from '@/types/models'

/**
 * ID 为雪花大整数，后端统一序列化为字符串避免 JS 精度丢失，
 * 因此各接口参数类型允许 string | number，前端应优先传 string。
 */
export type IdParam = string | number

/** 排课查询参数 */
export interface SessionQuery extends PageQuery {
  courseId?: IdParam
  venueId?: IdParam
  coachId?: IdParam
  /** 单日筛选 YYYY-MM-DD */
  date?: string
}

/** 分页查询排课列表 */
export function getSessionList(params: SessionQuery) {
  return request<PageResult<TrainingSession>>({
    url: '/training/sessions',
    method: 'get',
    params,
  })
}

/** 自动排课, 返回生成的排课记录数 */
export function autoSchedule(data: AutoScheduleParams) {
  return request<number>({
    url: '/training/sessions/auto',
    method: 'post',
    data,
  })
}

/** 推算排课结束日期(跳过法定放假日), 返回 YYYY-MM-DD */
export function calcEndDate(data: CalcEndDateParams) {
  return request<string>({
    url: '/training/sessions/calc-end-date',
    method: 'post',
    data,
  })
}

/** 手动单节排课 */
export function createSession(data: Partial<TrainingSession>) {
  return request<TrainingSession>({
    url: '/training/session',
    method: 'post',
    data,
  })
}

/** 调整排课(已消课的不可调整, 后端返回 400) */
export function updateSession(id: IdParam, data: Partial<TrainingSession>) {
  return request<TrainingSession>({
    url: `/training/session/${id}`,
    method: 'put',
    data,
  })
}

/** 删除排课 */
export function deleteSession(id: IdParam) {
  return request<void>({
    url: `/training/session/${id}`,
    method: 'delete',
  })
}

/** 获取待处理冲突排课 */
export function getPendingSessions() {
  return request<TrainingSession[]>({
    url: '/training/sessions/pending',
    method: 'get',
  })
}

/** 解决冲突(可改场地或时间) */
export function resolveConflict(id: IdParam, data: Partial<TrainingSession>) {
  return request<TrainingSession>({
    url: `/training/session/${id}/resolve`,
    method: 'post',
    data,
  })
}
