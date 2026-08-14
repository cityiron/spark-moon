import { request } from './request'
import type { PageQuery, PageResult } from '@/types/api'
import type {
  Coach,
  TrainingCourse,
  CourseStudent,
  CourseStats,
  CourseType,
  CourseStatus,
} from '@/types/models'

/** 课程查询参数 */
export interface CourseQuery extends PageQuery {
  keyword?: string
  courseType?: CourseType
  status?: CourseStatus
}

/** 教练查询参数 */
export interface CoachQuery extends PageQuery {
  keyword?: string
}

/** 培训课程统计 */
export function getCourseStats() {
  return request<CourseStats>({
    url: '/training/stats',
    method: 'get',
  })
}

/** 课程列表(分页) */
export function getCourseList(params: CourseQuery) {
  return request<PageResult<TrainingCourse>>({
    url: '/training/courses',
    method: 'get',
    params,
  })
}

/** 新建课程 */
export function createCourse(data: Partial<TrainingCourse>) {
  return request<TrainingCourse>({
    url: '/training/course',
    method: 'post',
    data,
  })
}

/** 更新课程 */
export function updateCourse(id: number, data: Partial<TrainingCourse>) {
  return request<TrainingCourse>({
    url: `/training/course/${id}`,
    method: 'put',
    data,
  })
}

/** 上下架课程 (下架时若有未消课学员, API 返回 400) */
export function toggleCourseStatus(id: number, status: CourseStatus) {
  return request<void>({
    url: `/training/course/${id}/status`,
    method: 'patch',
    data: { status },
  })
}

/** 删除课程 */
export function deleteCourse(id: number) {
  return request<void>({
    url: `/training/course/${id}`,
    method: 'delete',
  })
}

/** 教练列表 */
export function getCoachList(params?: CoachQuery) {
  return request<Coach[]>({
    url: '/training/coaches',
    method: 'get',
    params,
  })
}

/** 新建教练 */
export function createCoach(data: Partial<Coach>) {
  return request<Coach>({
    url: '/training/coach',
    method: 'post',
    data,
  })
}

/** 更新教练 */
export function updateCoach(id: number, data: Partial<Coach>) {
  return request<Coach>({
    url: `/training/coach/${id}`,
    method: 'put',
    data,
  })
}

/** 删除教练 */
export function deleteCoach(id: number) {
  return request<void>({
    url: `/training/coach/${id}`,
    method: 'delete',
  })
}

/** 课程报名学员(分页) */
export function getCourseStudents(courseId: number, params?: PageQuery) {
  return request<PageResult<CourseStudent>>({
    url: `/training/course/${courseId}/students`,
    method: 'get',
    params,
  })
}
