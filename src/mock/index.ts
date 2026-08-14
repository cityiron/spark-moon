/**
 * Mock 拦截层
 *
 * 仅在 VITE_USE_MOCK=true 时启用, 用于在后端接口未实现时预览前端.
 * 后端接口实现后, 在 .env.development 里把 VITE_USE_MOCK 改为 false 即可走真实后端.
 *
 * 实现: 用 axios 请求/响应拦截器, 命中 mock 路由时构造响应并短路请求链,
 * 未命中时透传真实请求.
 */
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import type { Result } from '@/types/api'

// ===== Mock 数据 =====
const MOCK_TOKEN = 'mock-token-admin-' + Date.now()

// 演示账号表 (username → 用户信息, 用于登录后回显)
const DEMO_ACCOUNTS: Array<{
  username: string
  password: string
  phone: string
  nickname: string
  roles: string[]
}> = [
  {
    username: 'admin',
    password: '123456',
    phone: '13800138000',
    nickname: '超级管理员',
    roles: ['super_admin'],
  },
  {
    username: 'lijg',
    password: '123456',
    phone: '13900139001',
    nickname: '李建国',
    roles: ['operator'],
  },
]

// 根据登录账号动态返回 userInfo
function buildUserInfo(username: string) {
  const acc = DEMO_ACCOUNTS.find((a) => a.username === username)
  return {
    id: acc ? (acc.username === 'admin' ? 0 : 1) : 0,
    username: acc?.username || '',
    nickname: acc?.nickname || '',
    avatar: '',
    roles: acc?.roles || [],
    permissions: ['*'],
  }
}

// 已发送的短信验证码: { phone: code }
const smsCodeMap = new Map<string, string>()

// 当前登录的用户名 (mock 单用户态, 用于 userinfo 回显)
let currentLoginUsername = 'admin'

// ===== Mock 路由表 =====
type MockContext = {
  method: string
  path: string
  query: Record<string, string>
  body: any
  params: Record<string, string>
}
type MockHandler = (ctx: MockContext) => Result

const mockRoutes: Array<{ match: RegExp, handler: MockHandler }> = [
  // 发送短信验证码
  {
    match: /POST\s+\/auth\/sms\/send$/,
    handler: ({ body }) => {
      const phone = body?.phone
      if (!phone) return { code: 400, message: '手机号不能为空', data: null }
      const code = '123456'
      smsCodeMap.set(phone, code)
      // eslint-disable-next-line no-console
      console.log(`[Mock] 短信验证码已发送: ${phone} -> ${code}`)
      return { code: 0, message: 'ok', data: true }
    },
  },
  // 登录
  {
    match: /POST\s+\/auth\/login$/,
    handler: ({ body }) => {
      const { loginType } = body || {}
      if (loginType === 'account') {
        const { username, password } = body
        const matched = DEMO_ACCOUNTS.find(
          (a) => a.username === username && a.password === password,
        )
        if (!matched) return { code: 401, message: '用户名或密码错误', data: null }
        currentLoginUsername = matched.username
        return { code: 0, message: 'ok', data: { token: MOCK_TOKEN, expiresIn: 7200 } }
      }
      if (loginType === 'sms') {
        const { phone, smsCode } = body
        const sent = smsCodeMap.get(phone)
        if (!sent || sent !== smsCode) {
          return { code: 401, message: '短信验证码错误或已过期', data: null }
        }
        smsCodeMap.delete(phone)
        const matched = DEMO_ACCOUNTS.find((a) => a.phone === phone)
        currentLoginUsername = matched?.username || 'admin'
        return { code: 0, message: 'ok', data: { token: MOCK_TOKEN, expiresIn: 7200 } }
      }
      return { code: 400, message: '不支持的登录方式', data: null }
    },
  },
  // 用户信息 (按当前登录账号返回)
  {
    match: /GET\s+\/auth\/userinfo$/,
    handler: () => ({ code: 0, message: 'ok', data: buildUserInfo(currentLoginUsername) }),
  },
  // 退出登录
  { match: /POST\s+\/auth\/logout$/, handler: () => ({ code: 0, message: 'ok', data: null }) },

  // 球馆列表
  {
    match: /GET\s+\/venue\/list$/,
    handler: () => ({
      code: 0, message: 'ok', data: [
        {
          id: 1, name: '羽球管家·高新园旗舰店', address: '深圳市南山区高新园地铁站 D 口',
          phone: '0755-12345678', openTime: '08:00', closeTime: '22:00',
          facilities: ['parking', 'wifi', 'water', 'ac', 'changing_room', 'shower'],
          courtCount: 6, status: 1, detailAddress: '科技园南区 3 栋 4 楼',
          intro: '南山区标杆羽毛球馆, 6 块专业场地, 配套齐全',
          description: '羽球管家·高新园旗舰店位于南山区科技园核心地段, 紧邻高新园地铁站 D 口, 步行约 5 分钟.\n拥有 6 块专业比赛级木地板场地, 配备专业灯光与空调系统.\n配套设施: 免费停车 / WiFi / 饮水机 / 空调 / 更衣室 / 淋浴间.',
          traffic: '地铁 1 号线高新园站 D 口 · 步行约 5 分钟',
        },
        {
          id: 2, name: '羽球管家·后海分店', address: '深圳市南山区后海大道',
          phone: '0755-87654321', openTime: '07:00', closeTime: '23:00',
          facilities: ['parking', 'wifi', 'ac'], courtCount: 4, status: 1,
          detailAddress: '后海中心 2 楼', intro: '后海片区精品球馆, 4 块场地',
          description: '羽球管家·后海分店位于后海大道旁, 交通便利, 配备 4 块专业场地.',
          traffic: '地铁 2 号线后海站 A 口 · 步行约 8 分钟',
        },
      ],
    }),
  },
  // 球馆详情
  {
    match: /GET\s+\/venue\/(\d+)$/,
    handler: ({ path }) => {
      const id = Number(path.split('/').pop())
      const venues = mockRoutes
        .find((r) => r.match.source.includes('venue\\/list'))
        ?.handler({} as MockContext).data as any[] || []
      const venue = venues.find((v) => v.id === id) || venues[0]
      return { code: 0, message: 'ok', data: venue }
    },
  },
  // 更新球馆
  { match: /PUT\s+\/venue\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  // 场地列表
  {
    match: /GET\s+\/venue\/\d+\/courts$/,
    handler: () => ({
      code: 0, message: 'ok', data: [
        { id: 101, name: '1 号场', type: 'badminton', category: 'normal', indoor: true, status: 1, sort: 1 },
        { id: 102, name: '2 号场', type: 'badminton', category: 'normal', indoor: true, status: 1, sort: 2 },
        { id: 103, name: '3 号场', type: 'badminton', category: 'normal', indoor: true, status: 1, sort: 3 },
        { id: 104, name: '4 号场', type: 'badminton', category: 'vip', indoor: false, status: 1, sort: 4 },
        { id: 105, name: '5 号场', type: 'badminton', category: 'vip', indoor: false, status: 0, sort: 5 },
        { id: 106, name: '6 号场', type: 'badminton', category: 'normal', indoor: true, status: 1, sort: 6 },
      ],
    }),
  },
  // 场地 CRUD
  { match: /POST\s+\/venue\/\d+\/court$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now() } }) },
  { match: /PUT\s+\/venue\/\d+\/court\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /DELETE\s+\/venue\/\d+\/court\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  // 时段价格（价格组 + 优先级 + 适用场地范围，匹配后端 /venue/{id}/price-groups）
  {
    match: /GET\s+\/venue\/\d+\/price-groups$/,
    handler: () => ({
      code: 0, message: 'ok', data: [
        { id: 1, venueId: 1, courtScope: 'all', name: '默认价', matchType: 'default', priority: 0, status: 1,
          rules: [{ id: 1, startTime: '09:00', endTime: '22:00', priceType: 'hourly', price: 5000, minDuration: 60 }] },
        { id: 2, venueId: 1, courtScope: 'normal', name: '工作日普通价', matchType: 'weekday', daysOfWeek: '1,2,3,4,5', priority: 5, status: 1,
          rules: [{ id: 2, startTime: '18:00', endTime: '22:00', priceType: 'range', price: 18000 }] },
        { id: 3, venueId: 1, courtScope: 'vip', name: 'VIP周末价', matchType: 'weekend', daysOfWeek: '6,7', priority: 5, status: 1,
          rules: [{ id: 3, startTime: '09:00', endTime: '22:00', priceType: 'hourly', price: 12000, minDuration: 60 }] },
      ],
    }),
  },
  { match: /PUT\s+\/venue\/\d+\/price-groups$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  // 会员列表
  {
    match: /GET\s+\/member\/list$/,
    handler: () => ({
      code: 0, message: 'ok', data: {
        list: [
          { id: 1, name: '张三', phone: '13800138001', gender: 'male', cardType: 'stored_value', cardNo: 'SV001', balance: 50000, totalRecharge: 100000, totalConsume: 50000, cardStatus: 'active', joinDate: '2025-03-15' },
          { id: 2, name: '李四', phone: '13800138002', gender: 'female', cardType: 'times_card', cardNo: 'TC001', balance: 0, remainingTimes: 8, totalRecharge: 30000, totalConsume: 20000, cardStatus: 'active', joinDate: '2025-04-01', expireDate: '2026-08-12' },
          { id: 3, name: '王五', phone: '13800138003', gender: 'male', cardType: 'monthly_card', cardNo: 'MC001', balance: 0, totalRecharge: 80000, totalConsume: 60000, cardStatus: 'active', joinDate: '2025-05-20', expireDate: '2026-08-20' },
          { id: 4, name: '赵六', phone: '13800138004', gender: 'male', cardType: 'stored_value', cardNo: 'SV002', balance: 5000, totalRecharge: 20000, totalConsume: 15000, cardStatus: 'frozen', joinDate: '2025-02-10' },
        ],
        total: 4, page: 1, size: 20,
      },
    }),
  },
  // 会员统计
  {
    match: /GET\s+\/member\/stats$/,
    handler: () => ({
      code: 0, message: 'ok', data: {
        totalMembers: 4, totalBalance: 55000, totalRemainingTimes: 8, monthRecharge: 30000,
      },
    }),
  },
  // 会员详情
  {
    match: /GET\s+\/member\/\d+$/,
    handler: ({ path }) => {
      const id = Number(path.split('/').pop())
      const listRes = mockRoutes
        .find((r) => r.match.source.includes('member\\/list'))
        ?.handler({} as MockContext).data as any
      const member = (listRes?.list || []).find((m: any) => m.id === id)
      return { code: 0, message: 'ok', data: member || null }
    },
  },
  // 会员 CRUD/状态/充值/调整/退款
  { match: /POST\s+\/member$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now() } }) },
  { match: /PUT\s+\/member\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /PATCH\s+\/member\/\d+\/status$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /POST\s+\/member\/recharge$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now(), type: 'recharge' } }) },
  { match: /POST\s+\/member\/adjust$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now(), type: 'adjust' } }) },
  { match: /POST\s+\/member\/refund$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now(), type: 'refund' } }) },
  {
    match: /GET\s+\/member\/\d+\/transactions$/,
    handler: () => ({
      code: 0, message: 'ok', data: {
        list: [
          { id: 1, type: 'recharge', amount: 100000, balanceAfter: 100000, payMethod: 'wechat', createdAt: '2025-03-15 10:00', remark: '办卡充值' },
          { id: 2, type: 'consume', amount: -5000, balanceAfter: 95000, orderNo: 'B20250320001', createdAt: '2025-03-20 14:30', remark: '预订 1 号场 2 小时' },
          { id: 3, type: 'consume', amount: -45000, balanceAfter: 50000, orderNo: 'B20250510002', createdAt: '2025-05-10 16:00', remark: '多次消费' },
        ],
        total: 3, page: 1, size: 100,
      },
    }),
  },
  // 预订网格
  {
    match: /GET\s+\/booking\/grid/,
    handler: () => ({
      code: 0, message: 'ok', data: {
        date: '2026-08-06',
        timeSlots: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
        courts: [
          { id: 101, name: '1 号场', type: 'badminton', indoor: true },
          { id: 102, name: '2 号场', type: 'badminton', indoor: true },
          { id: 103, name: '3 号场', type: 'badminton', indoor: true },
        ],
        grid: [],
      },
    }),
  },
  { match: /POST\s+\/booking\/lock$/, handler: () => ({ code: 0, message: 'ok', data: null }) },

  // ===== 经营者入驻 / 账号管理 =====
  // 经营者提交入驻申请 (公开接口, 无需登录)
  {
    match: /POST\s+\/operator\/apply$/,
    handler: ({ body }) => {
      if (!body?.companyName || !body?.licenseNo) {
        return { code: 400, message: '公司名称和营业执照编号不能为空', data: null }
      }
      // 模拟营业执照编号重复校验
      const existing = mockRoutes.find((r) => r.match.source.includes('operator\\/list'))?.handler({} as MockContext).data as any
      const list = existing?.list || []
      if (list.some((o: any) => o.licenseNo === body.licenseNo)) {
        return { code: 400, message: '该营业执照已注册, 请勿重复申请', data: null }
      }
      return { code: 0, message: 'ok', data: { id: Date.now() } }
    },
  },
  {
    match: /GET\s+\/operator\/list$/,
    handler: ({ query }) => {
      const all = [
        {
          id: 1, companyName: '深圳羽球体育文化有限公司', licenseNo: '91440300MA5ABC123',
          contactName: '李建国', contactPhone: '13900139001',
          venueName: '羽球管家·高新园旗舰店', venueAddress: '深圳市南山区高新园地铁站 D 口',
          venueCourtCount: 6, venueOpenTime: '08:00', venueCloseTime: '22:00',
          status: 'approved', mchId: '1900012345', mchStatus: 'verified',
          createdAt: '2025-01-10 10:30', reviewedAt: '2025-01-12 15:00',
        },
        {
          id: 2, companyName: '后海运动管理有限公司', licenseNo: '91440300MA5DEF456',
          contactName: '王丽华', contactPhone: '13900139002',
          venueName: '羽球管家·后海分店', venueAddress: '深圳市南山区后海大道',
          venueCourtCount: 4, venueOpenTime: '07:00', venueCloseTime: '23:00',
          status: 'approved', mchId: '1900067890', mchStatus: 'configured',
          createdAt: '2025-02-05 14:00', reviewedAt: '2025-02-07 10:30',
        },
        {
          id: 3, companyName: '南山文体发展中心', licenseNo: '91440300MA5GHI789',
          contactName: '张明', contactPhone: '13900139003',
          venueName: '南山羽毛球馆', venueAddress: '深圳市南山区南山大道 88 号',
          venueCourtCount: 8, venueOpenTime: '06:00', venueCloseTime: '23:00',
          status: 'pending', mchStatus: 'unconfigured', createdAt: '2026-08-04 09:15',
        },
        {
          id: 4, companyName: '福田区健身俱乐部', licenseNo: '91440300MA5JKL012',
          contactName: '陈强', contactPhone: '13900139004',
          venueName: '福田羽毛球中心', venueAddress: '深圳市福田区福华路 100 号',
          venueCourtCount: 5, venueOpenTime: '07:00', venueCloseTime: '22:00',
          status: 'pending', mchStatus: 'unconfigured', createdAt: '2026-08-05 16:30',
        },
        {
          id: 5, companyName: '罗湖羽球俱乐部', licenseNo: '91440300MA5MNO345',
          contactName: '刘洋', contactPhone: '13900139005',
          venueName: '罗湖羽毛球馆', venueAddress: '深圳市罗湖区深南东路',
          venueCourtCount: 3, venueOpenTime: '08:00', venueCloseTime: '22:00',
          status: 'rejected', rejectReason: '营业执照编号与已入驻经营者重复, 请核实后重新提交',
          mchStatus: 'unconfigured', createdAt: '2026-08-01 11:00', reviewedAt: '2026-08-03 14:00',
        },
      ]
      let list = all
      if (query.keyword) {
        const kw = query.keyword
        list = list.filter((o) =>
          o.companyName.includes(kw) || o.contactName.includes(kw) || o.contactPhone.includes(kw),
        )
      }
      if (query.status) list = list.filter((o) => o.status === query.status)
      return { code: 0, message: 'ok', data: { list, total: list.length, page: 1, size: 10 } }
    },
  },
  {
    match: /GET\s+\/operator\/(\d+)$/,
    handler: ({ path }) => {
      const id = Number(path.split('/').pop())
      const list = mockRoutes.find((r) => r.match.source.includes('operator\\/list'))?.handler({} as MockContext).data as any
      const app = (list?.list || []).find((o: any) => o.id === id)
      return { code: 0, message: 'ok', data: app || null }
    },
  },
  { match: /POST\s+\/operator\/(\d+)\/approve$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /POST\s+\/operator\/(\d+)\/reject$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /POST\s+\/operator\/(\d+)\/mch$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /POST\s+\/operator\/(\d+)\/mch\/verify$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  {
    match: /GET\s+\/operator\/accounts$/,
    handler: ({ query }) => {
      const all = [
        // id: 0 为平台内置超级管理员, 不可编辑/删除/禁用
        { id: 0, operatorId: 0, operatorName: '平台(内置)', username: 'admin', nickname: '超级管理员', phone: '13800138000', role: 'super_admin', venueIds: [], venueNames: [], status: 'active', createdAt: '系统初始化', lastLoginAt: '2026-08-06 09:30' },
        { id: 1, operatorId: 1, operatorName: '深圳羽球体育文化有限公司', username: 'lijg', nickname: '李建国', phone: '13900139001', role: 'operator', venueIds: [1, 2], venueNames: ['羽球管家·高新园旗舰店', '羽球管家·后海分店'], status: 'active', createdAt: '2025-01-12 15:00', lastLoginAt: '2026-08-06 09:30' },
        { id: 2, operatorId: 1, operatorName: '深圳羽球体育文化有限公司', username: 'wanglihua', nickname: '王丽华', phone: '13900139002', role: 'admin', venueIds: [1], venueNames: ['羽球管家·高新园旗舰店'], status: 'active', createdAt: '2025-01-13 10:00', lastLoginAt: '2026-08-05 18:15' },
        { id: 3, operatorId: 1, operatorName: '深圳羽球体育文化有限公司', username: 'lijie', nickname: '李教练', phone: '13900139001', role: 'coach', venueIds: [1], venueNames: ['羽球管家·高新园旗舰店'], status: 'active', createdAt: '2025-03-01 09:00', lastLoginAt: '2026-08-06 08:00' },
        { id: 4, operatorId: 2, operatorName: '后海运动管理有限公司', username: 'zhangming', nickname: '张明', phone: '13900139003', role: 'admin', venueIds: [2], venueNames: ['羽球管家·后海分店'], status: 'disabled', createdAt: '2025-02-07 11:00', lastLoginAt: '2026-07-15 14:20' },
      ]
      let list = all
      if (query.keyword) {
        const kw = query.keyword
        list = list.filter((a) =>
          a.username.includes(kw) || a.nickname.includes(kw) || a.phone.includes(kw),
        )
      }
      if (query.role) list = list.filter((a) => a.role === query.role)
      if (query.status) list = list.filter((a) => a.status === query.status)
      if (query.operatorId) list = list.filter((a) => a.operatorId === Number(query.operatorId))
      return { code: 0, message: 'ok', data: { list, total: list.length, page: 1, size: 10 } }
    },
  },
  { match: /POST\s+\/operator\/account$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now() } }) },
  { match: /PUT\s+\/operator\/account\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /PATCH\s+\/operator\/account\/\d+\/status$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /DELETE\s+\/operator\/account\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /POST\s+\/operator\/account\/\d+\/reset-password$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  {
    match: /GET\s+\/operator\/stats$/,
    handler: () => ({
      code: 0, message: 'ok', data: {
        pendingCount: 2, approvedCount: 2, accountCount: 4, mchConfiguredCount: 2,
      },
    }),
  },

  // ===== VIP 权益 =====
  {
    match: /GET\s+\/vip\/plans$/,
    handler: () => ({
      code: 0, message: 'ok', data: [
        {
          id: 1, name: '年度 VIP', price: 99000, durationMonths: 12, status: 'active', createdAt: '2025-01-10',
          venueDiscounts: [
            { venueId: 1, venueName: '羽球管家·高新园旗舰店', discountRate: 0.8 },
            { venueId: 2, venueName: '羽球管家·后海分店', discountRate: 0.85 },
          ],
        },
        {
          id: 2, name: '季度 VIP', price: 29900, durationMonths: 3, status: 'active', createdAt: '2025-03-15',
          venueDiscounts: [
            { venueId: 1, venueName: '羽球管家·高新园旗舰店', discountRate: 0.85 },
            { venueId: 2, venueName: '羽球管家·后海分店', discountRate: 0.9 },
          ],
        },
        {
          id: 3, name: '月度 VIP', price: 9900, durationMonths: 1, status: 'inactive', createdAt: '2025-05-20',
          venueDiscounts: [{ venueId: 1, venueName: '羽球管家·高新园旗舰店', discountRate: 0.9 }],
        },
      ],
    }),
  },
  { match: /POST\s+\/vip\/plan$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now() } }) },
  { match: /PUT\s+\/vip\/plan\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /PATCH\s+\/vip\/plan\/\d+\/status$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /DELETE\s+\/vip\/plan\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  {
    match: /GET\s+\/vip\/plan\/(\d+)\/discounts$/,
    handler: ({ path }) => {
      const planId = Number(path.split('/')[3])
      const plans = mockRoutes.find((r) => r.match.source.includes('vip\\/plans'))?.handler({} as MockContext).data as any[]
      const plan = plans?.find((p) => p.id === planId)
      return { code: 0, message: 'ok', data: plan?.venueDiscounts || [] }
    },
  },
  { match: /POST\s+\/vip\/plan\/\d+\/discounts$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  {
    match: /GET\s+\/vip\/memberships$/,
    handler: ({ query }) => {
      const all = [
        { id: 1, userId: 101, userName: '张三', userPhone: '13800138001', vipPlanId: 1, vipPlanName: '年度 VIP', purchaseTime: '2025-01-15 10:00', expireTime: '2026-01-15', status: 'active' },
        { id: 2, userId: 102, userName: '李四', userPhone: '13800138002', vipPlanId: 1, vipPlanName: '年度 VIP', purchaseTime: '2025-02-20 14:30', expireTime: '2026-02-20', status: 'active' },
        { id: 3, userId: 103, userName: '王五', userPhone: '13800138003', vipPlanId: 2, vipPlanName: '季度 VIP', purchaseTime: '2025-04-10 09:00', expireTime: '2025-07-10', status: 'expired' },
        { id: 4, userId: 104, userName: '赵六', userPhone: '13800138004', vipPlanId: 2, vipPlanName: '季度 VIP', purchaseTime: '2025-05-05 16:00', expireTime: '2025-08-05', status: 'expired' },
        { id: 5, userId: 105, userName: '钱七', userPhone: '13800138005', vipPlanId: 1, vipPlanName: '年度 VIP', purchaseTime: '2025-06-12 11:00', expireTime: '2026-06-12', status: 'active' },
      ]
      let list = all
      if (query.vipPlanId) list = list.filter((m) => m.vipPlanId === Number(query.vipPlanId))
      if (query.status) list = list.filter((m) => m.status === query.status)
      return { code: 0, message: 'ok', data: { list, total: list.length, page: 1, size: 20 } }
    },
  },

  // ===== 培训课程 =====
  {
    match: /GET\s+\/training\/stats$/,
    handler: () => ({
      code: 0, message: 'ok', data: {
        activeCourses: 8, monthEnrollments: 42, consumeRate: 68, totalRevenue: 8640000,
      },
    }),
  },
  {
    match: /GET\s+\/training\/courses$/,
    handler: ({ query }) => {
      const all = [
        { id: 1, name: '青少年启蒙班', coachId: 1, coachName: '李教练', totalSessions: 20, price: 15000, description: '适合 6-12 岁零基础青少年', courseType: 'class', status: 'active', studentCount: 12, consumedSessions: 156, createdAt: '2025-03-01' },
        { id: 2, name: '成人基础班', coachId: 2, coachName: '王教练', totalSessions: 16, price: 18000, description: '适合成人零基础学员', courseType: 'class', status: 'active', studentCount: 8, consumedSessions: 64, createdAt: '2025-03-15' },
        { id: 3, name: '进阶私教课', coachId: 1, coachName: '李教练', totalSessions: 10, price: 30000, description: '一对一进阶技术指导', courseType: 'private', status: 'active', studentCount: 3, consumedSessions: 18, createdAt: '2025-04-10' },
        { id: 4, name: '双打战术班', coachId: 3, coachName: '陈教练', totalSessions: 12, price: 20000, description: '双打配合与战术训练', courseType: 'class', status: 'inactive', studentCount: 6, consumedSessions: 72, createdAt: '2025-02-20' },
      ]
      let list = all
      if (query.keyword) list = list.filter((c) => c.name.includes(query.keyword))
      if (query.courseType) list = list.filter((c) => c.courseType === query.courseType)
      if (query.status) list = list.filter((c) => c.status === query.status)
      return { code: 0, message: 'ok', data: { list, total: list.length, page: 1, size: 20 } }
    },
  },
  { match: /POST\s+\/training\/course$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now() } }) },
  { match: /PUT\s+\/training\/course\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /PATCH\s+\/training\/course\/\d+\/status$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /DELETE\s+\/training\/course\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  {
    match: /GET\s+\/training\/coaches$/,
    handler: () => ({
      code: 0, message: 'ok', data: [
        { id: 1, name: '李教练', phone: '13900139001', specialty: '少儿启蒙 / 单打技术', sessionCount: 28 },
        { id: 2, name: '王教练', phone: '13900139002', specialty: '成人基础 / 体能训练', sessionCount: 16 },
        { id: 3, name: '陈教练', phone: '13900139003', specialty: '双打战术 / 比赛指导', sessionCount: 12 },
      ],
    }),
  },
  { match: /POST\s+\/training\/coach$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now() } }) },
  { match: /PUT\s+\/training\/coach\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /DELETE\s+\/training\/coach\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  {
    match: /GET\s+\/training\/course\/(\d+)\/students$/,
    handler: () => ({
      code: 0, message: 'ok', data: {
        list: [
          { id: 1, studentName: '张小明', studentPhone: '13800138001', enrollTime: '2025-03-05', totalSessions: 20, consumedSessions: 12, remainingSessions: 8, progress: 60 },
          { id: 2, studentName: '张小红', studentPhone: '13800138002', enrollTime: '2025-03-05', totalSessions: 20, consumedSessions: 15, remainingSessions: 5, progress: 75 },
          { id: 3, studentName: '王小虎', studentPhone: '13800138003', enrollTime: '2025-03-10', totalSessions: 20, consumedSessions: 8, remainingSessions: 12, progress: 40 },
          { id: 4, studentName: '李小龙', studentPhone: '13800138004', enrollTime: '2025-03-12', totalSessions: 20, consumedSessions: 20, remainingSessions: 0, progress: 100 },
        ],
        total: 4, page: 1, size: 100,
      },
    }),
  },

  // ===== 课时排课 =====
  {
    match: /GET\s+\/training\/sessions$/,
    handler: ({ query }) => {
      const today = new Date()
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const d1 = fmt(today)
      const d2 = fmt(new Date(today.getTime() + 86400000))
      const d3 = fmt(new Date(today.getTime() + 86400000 * 2))
      const all = [
        { id: 1, courseId: 1, courseName: '青少年启蒙班', venueId: 1, venueName: '高新园旗舰店', courtId: 101, courtName: '1 号场', coachId: 1, coachName: '李教练', sessionNo: 13, date: d1, startTime: '09:00', endTime: '10:00', status: 'scheduled' },
        { id: 2, courseId: 2, courseName: '成人基础班', venueId: 1, venueName: '高新园旗舰店', courtId: 102, courtName: '2 号场', coachId: 2, coachName: '王教练', sessionNo: 9, date: d1, startTime: '14:00', endTime: '15:00', status: 'scheduled' },
        { id: 3, courseId: 1, courseName: '青少年启蒙班', venueId: 2, venueName: '后海分店', courtId: 201, courtName: '1 号场', coachId: 1, coachName: '李教练', sessionNo: 14, date: d2, startTime: '10:00', endTime: '11:00', status: 'scheduled' },
        { id: 4, courseId: 3, courseName: '进阶私教课', venueId: 1, venueName: '高新园旗舰店', courtId: 103, courtName: '3 号场', coachId: 1, coachName: '李教练', sessionNo: 5, date: d3, startTime: '16:00', endTime: '17:00', status: 'scheduled' },
      ]
      let list = all
      if (query.courseId) list = list.filter((s) => s.courseId === Number(query.courseId))
      if (query.venueId) list = list.filter((s) => s.venueId === Number(query.venueId))
      if (query.coachId) list = list.filter((s) => s.coachId === Number(query.coachId))
      if (query.date) list = list.filter((s) => s.date === query.date)
      return { code: 0, message: 'ok', data: { list, total: list.length, page: 1, size: 100 } }
    },
  },
  { match: /POST\s+\/training\/sessions\/auto$/, handler: () => ({ code: 0, message: 'ok', data: 10 }) },
  { match: /POST\s+\/training\/session$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now() } }) },
  { match: /PUT\s+\/training\/session\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /DELETE\s+\/training\/session\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  {
    match: /GET\s+\/training\/sessions\/pending$/,
    handler: () => ({
      code: 0, message: 'ok', data: [
        { id: 101, courseId: 1, courseName: '青少年启蒙班', venueId: 1, venueName: '高新园旗舰店', courtId: 101, courtName: '1 号场', coachId: 1, coachName: '李教练', sessionNo: 15, date: '2026-08-10', startTime: '09:00', endTime: '10:00', status: 'pending', conflictType: 'booking' },
        { id: 102, courseId: 2, courseName: '成人基础班', venueId: 2, venueName: '后海分店', courtId: 201, courtName: '1 号场', coachId: 2, coachName: '王教练', sessionNo: 10, date: '2026-08-11', startTime: '14:00', endTime: '15:00', status: 'pending', conflictType: 'coach' },
      ],
    }),
  },
  { match: /POST\s+\/training\/session\/\d+\/resolve$/, handler: () => ({ code: 0, message: 'ok', data: null }) },

  // ===== 财务管理 =====
  {
    match: /GET\s+\/finance\/stats$/,
    handler: ({ query }) => {
      // 简化: 根据月份返回略有不同的数据
      const base = query.month || '2026-08'
      const seed = base.split('-')[1] ? Number(base.split('-')[1]) : 8
      return {
        code: 0, message: 'ok', data: {
          totalIncome: 1280000 + seed * 1000,
          totalExpense: 460000 + seed * 500,
          netProfit: 820000 + seed * 500,
          expenseRatio: 36,
          incomeChange: 12.5,
          expenseChange: -5.2,
          profitRatio: 64,
        },
      }
    },
  },
  {
    match: /GET\s+\/finance\/monthly$/,
    handler: () => ({
      code: 0, message: 'ok', data: [
        { month: '3月', income: 980000, expense: 380000 },
        { month: '4月', income: 1050000, expense: 420000 },
        { month: '5月', income: 1120000, expense: 410000 },
        { month: '6月', income: 1180000, expense: 450000 },
        { month: '7月', income: 1240000, expense: 440000 },
        { month: '8月', income: 1288000, expense: 464500 },
      ],
    }),
  },
  {
    match: /GET\s+\/finance\/venue-summary$/,
    handler: () => ({
      code: 0, message: 'ok', data: [
        { venueId: 1, venueName: '羽球管家·高新园旗舰店', booking: 680000, course: 320000, membership: 180000, other: 28000, total: 1208000 },
        { venueId: 2, venueName: '羽球管家·后海分店', booking: 420000, course: 160000, membership: 95000, other: 15000, total: 690000 },
      ],
    }),
  },
  {
    match: /GET\s+\/finance\/records$/,
    handler: ({ query }) => {
      const all = [
        { id: 1, type: 'income', category: 'booking', amount: 5000, venueId: 1, venueName: '高新园旗舰店', recordDate: '2026-08-05', operator: '系统', remark: '1 号场预订 1 小时', createdAt: '2026-08-05 14:30' },
        { id: 2, type: 'income', category: 'course', amount: 15000, venueId: 1, venueName: '高新园旗舰店', recordDate: '2026-08-05', operator: '系统', remark: '青少年启蒙班报名', createdAt: '2026-08-05 10:00' },
        { id: 3, type: 'expense', category: 'rent', amount: 30000, venueId: 1, venueName: '高新园旗舰店', recordDate: '2026-08-01', operator: 'admin', remark: '8 月场地租金', createdAt: '2026-08-01 09:00' },
        { id: 4, type: 'expense', category: 'salary', amount: 80000, venueId: 0, venueName: '', recordDate: '2026-08-05', operator: 'admin', remark: '7 月教练工资', createdAt: '2026-08-05 18:00' },
        { id: 5, type: 'income', category: 'membership', amount: 100000, venueId: 2, venueName: '后海分店', recordDate: '2026-08-04', operator: '系统', remark: '张三储值卡充值', createdAt: '2026-08-04 15:00' },
        { id: 6, type: 'expense', category: 'utility', amount: 8500, venueId: 2, venueName: '后海分店', recordDate: '2026-08-03', operator: 'admin', remark: '7 月水电费', createdAt: '2026-08-03 11:00' },
      ]
      let list = all
      if (query.type) list = list.filter((r) => r.type === query.type)
      if (query.category) list = list.filter((r) => r.category === query.category)
      if (query.venueId) list = list.filter((r) => r.venueId === Number(query.venueId))
      return { code: 0, message: 'ok', data: { list, total: list.length, page: 1, size: 20 } }
    },
  },
  { match: /POST\s+\/finance\/record$/, handler: () => ({ code: 0, message: 'ok', data: { id: Date.now() } }) },
  { match: /PUT\s+\/finance\/record\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
  { match: /DELETE\s+\/finance\/record\/\d+$/, handler: () => ({ code: 0, message: 'ok', data: null }) },
]

/** 测试路径是否命中 mock 路由 */
function matchMockRoute(config: InternalAxiosRequestConfig) {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return null

  const method = (config.method || 'get').toUpperCase()
  // 去掉 baseURL 前缀 (/api)
  const url = (config.url || '').replace(/^\/api/, '')
  const [pathOnly, queryString] = url.split('?')
  const matchKey = `${method} ${pathOnly}`

  const route = mockRoutes.find((r) => r.match.test(matchKey))
  if (!route) return null

  // 解析 query 与 body
  const query: Record<string, string> = {}
  if (queryString) {
    new URLSearchParams(queryString).forEach((v, k) => (query[k] = v))
  }
  let body: any = undefined
  if (config.data) {
    try {
      body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    } catch {
      body = config.data
    }
  }

  const ctx: MockContext = { method, path: pathOnly, query, body, params: config.params || {} }
  return route.handler(ctx)
}

// ===== 安装 Mock =====
// 请求拦截器: 命中 mock 时, reject 一个特殊结构, 由响应拦截器转成成功响应
export function setupMock(instance: AxiosInstance) {
  instance.interceptors.request.use(
    (config) => {
      const result = matchMockRoute(config)
      if (!result) return config

      // 构造 mock 响应, 通过 reject 让请求链跳过真实 HTTP
      const response: AxiosResponse = {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      }
      // 标记为 mock, 响应拦截器识别后转为 resolve
      return Promise.reject({ __isMock: true, response })
    },
    (error) => Promise.reject(error),
  )

  // 响应拦截器: 拦截 mock reject, 转为成功响应
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error && error.__isMock) {
        return Promise.resolve(error.response)
      }
      return Promise.reject(error)
    },
  )
}
