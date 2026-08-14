import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type { TrainingSession, AutoScheduleParams } from '@/types/models'

/** 排课查询参数 */
export interface SessionQuery extends PageQuery {
  courseId?: number
  venueId?: number
  coachId?: number
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

/** 手动单节排课 */
export function createSession(data: Partial<TrainingSession>) {
  return request<TrainingSession>({
    url: '/training/session',
    method: 'post',
    data,
  })
}

/** 调整排课(已消课的不可调整, 后端返回 400) */
export function updateSession(id: number, data: Partial<TrainingSession>) {
  return request<TrainingSession>({
    url: `/training/session/${id}`,
    method: 'put',
    data,
  })
}

/** 删除排课 */
export function deleteSession(id: number) {
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
export function resolveConflict(id: number, data: Partial<TrainingSession>) {
  return request<TrainingSession>({
    url: `/training/session/${id}/resolve`,
    method: 'post',
    data,
  })
}
