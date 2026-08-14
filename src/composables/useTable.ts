import { ref, reactive, type Ref } from 'vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import type { PageResult, PageQuery } from '@/types/api'

interface UseTableOptions<Q extends PageQuery, T> {
  /** 列表请求函数 */
  fetchApi: (params: Q) => Promise<PageResult<T>>
  /** 初始查询参数 */
  initialQuery?: Partial<Q>
  /** 初始分页 */
  defaultPageSize?: number
}

/**
 * 通用表格 composable: 封装分页、loading、数据加载
 */
export function useTable<Q extends PageQuery, T>(options: UseTableOptions<Q, T>) {
  const { fetchApi, initialQuery = {}, defaultPageSize = 10 } = options

  const loading = ref(false)
  const dataList = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)

  // 使用 Record 内部承载查询参数, 避免 TS 泛型 spread 报错
  const queryParams = reactive<Record<string, unknown>>({
    page: 1,
    size: defaultPageSize,
    ...(initialQuery as Record<string, unknown>),
  }) as unknown as Q

  const pagination = reactive<TablePaginationConfig>({
    current: 1,
    pageSize: defaultPageSize,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (t: number) => `共 ${t} 条`,
    pageSizeOptions: ['10', '20', '50', '100'],
  })

  async function loadData() {
    loading.value = true
    try {
      const params = {
        ...(queryParams as Record<string, unknown>),
        page: pagination.current,
        size: pagination.pageSize,
      } as Q
      const res = await fetchApi(params)
      dataList.value = res.list || []
      total.value = res.total || 0
      pagination.total = total.value
      pagination.current = res.page || pagination.current
    } catch {
      dataList.value = []
      total.value = 0
      pagination.total = 0
    } finally {
      loading.value = false
    }
  }

  function handleTableChange(pag: TablePaginationConfig) {
    pagination.current = pag.current || 1
    pagination.pageSize = pag.pageSize || defaultPageSize
    loadData()
  }

  function refresh() {
    pagination.current = 1
    loadData()
  }

  function resetQuery() {
    const init = initialQuery as Record<string, unknown>
    Object.keys(queryParams as Record<string, unknown>).forEach((key) => {
      if (key !== 'page' && key !== 'size') {
        ;(queryParams as Record<string, unknown>)[key] = init[key] ?? undefined
      }
    })
    pagination.current = 1
    loadData()
  }

  return {
    loading,
    dataList,
    total,
    queryParams,
    pagination,
    loadData,
    refresh,
    resetQuery,
    handleTableChange,
  }
}
