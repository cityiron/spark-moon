/**
 * 业务模型类型定义 - 羽球管家
 */

/** 通用启用/禁用状态 */
export type StatusEnum = 1 | 0

/** 用户信息 */
export interface UserInfo {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  username: string
  nickname: string
  avatar?: string
  phone?: string
  email?: string
  roles: string[]
  permissions: string[]
  /** 当前激活的经营者主体 ID (super_admin 为 null/undefined) */
  activeOperatorId?: string | number | null
  /** 可切换的经营者主体列表 */
  operators?: OperatorScope[]
}

/** 管理端账号可访问的经营者主体(用于顶部主体切换) */
export interface OperatorScope {
  /** 经营者主体 ID(雪花大整数) */
  operatorId: string | number
  /** 经营者名称 */
  operatorName: string
  /** 该账号在该主体下的角色 */
  role: AdminRole
  /** 是否默认主体 */
  isDefault?: boolean
}

/** 场馆设施类型 */
export type FacilityType =
  | 'parking'
  | 'wifi'
  | 'water'
  | 'ac'
  | 'changing_room'
  | 'shower'

/** 场馆 */
export interface Venue {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  name: string
  address: string
  phone: string
  /** 营业开始时间 HH:mm */
  openTime: string
  /** 营业结束时间 HH:mm */
  closeTime: string
  /** 设施列表 */
  facilities: FacilityType[]
  /** 场地数量 */
  courtCount: number
  /** 状态: 1 营业 0 停业 */
  status: StatusEnum
  /** 是否接受平台会员卡: 1 接受 0 不接受 */
  acceptPlatformCard?: number
  /** 归属俱乐部(经营者)名称, /venue/all 返回 */
  operatorName?: string
  /** 平台卡折扣率(UI 编辑用, 0.8=8折) */
  discountRate?: number | null
  /** 备注 */
  remark?: string
  /** 创建时间 */
  createdAt?: string
  courts?: Court[]
  /** 详细地址（门牌号、楼层等） */
  detailAddress?: string
  /** 球馆简介（基本信息 Tab，短文本） */
  intro?: string
  /** 场馆详情（球馆介绍 Tab，长文本/富文本） */
  description?: string
  /** 交通指引 */
  traffic?: string
  /** 封面图 URL */
  coverImage?: string
  /** 场地平面图 URL（球馆详情展示） */
  floorPlan?: string
  /** 球馆相册（最多 9 张） */
  images?: string[]
}

/** 场地类型 */
export type CourtType = 'badminton' | 'tennis' | 'basketball' | 'table_tennis'

/** 场地类别 */
export type CourtCategory = 'normal' | 'vip'

/** 场地 */
export interface Court {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  venueId: string | number
  name: string
  /** 场地类型 */
  type: CourtType
  /** 场地类别: normal 普通 / vip 贵宾 */
  category?: CourtCategory
  /** 是否室内 */
  indoor: boolean
  /** 状态: 1 开放 0 关闭 */
  status: StatusEnum
  /** 排序 */
  sort?: number
  /** 价格分组配置列表 */
  priceGroups?: PriceGroup[]
}

/** 价格类型 */
export type PriceType = 'hourly' | 'range'

/** 价格组匹配类型 */
export type PriceGroupMatchType = 'default' | 'weekday' | 'weekend' | 'holiday' | 'custom'

/** 价格组内的时段规则 */
export interface PriceRule {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id?: string | number
  /** 开始时间 HH:mm */
  startTime: string
  /** 结束时间 HH:mm */
  endTime: string
  /** 价格类型: hourly 按小时 / range 整段一口价 */
  priceType: PriceType
  /** 价格(分) */
  price: number
  /** 最少预订时长(分钟), 仅 hourly 生效 */
  minDuration?: number
}

/** 价格组适用场地范围 */
export type CourtScope = 'all' | 'normal' | 'vip'

/** 球馆价格组: 默认价/工作日/周末/节假日/自定义, 按 priority 从高到低匹配 */
export interface PriceGroup {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id?: string | number
  venueId?: string | number
  /** 适用场地范围: all 全部 / normal 普通 / vip 贵宾 */
  courtScope?: CourtScope
  /** 组名, 如 默认价/工作日/周末/国庆 */
  name: string
  /** 匹配类型 */
  matchType: PriceGroupMatchType
  /** weekday/weekend: 适用星期 1-7, 逗号分隔, 如 "1,2,3,4,5" */
  daysOfWeek?: string
  /** holiday/custom: 起始日期 YYYY-MM-DD */
  startDate?: string
  /** holiday/custom: 结束日期 YYYY-MM-DD */
  endDate?: string
  /** 优先级, 数字越大越优先 */
  priority: number
  /** 1=启用 0=停用 */
  status?: StatusEnum
  /** 组内时段规则 */
  rules: PriceRule[]
}

/** 预订状态(网格订单返回字符串: pending/paid/verified/cancelled/absent) */
export type BookingStatus =
  | 'pending'
  | 'paid'
  | 'verified'
  | 'cancelled'
  | 'absent'

/** 单元格占用类型(用于网格视图) */
export type SlotStatus = 'free' | 'booked' | 'locked' | 'training' | 'expired'

/** 预订订单 */
export interface BookingOrder {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  orderNo: string
  venueId: string | number
  venueName?: string
  courtId: string | number
  courtName?: string
  memberId?: string | number
  memberName?: string
  memberPhone?: string
  /** 预订日期 YYYY-MM-DD */
  date: string
  /** 开始时间 HH:mm */
  startTime: string
  /** 结束时间 HH:mm */
  endTime: string
  /** 时长(分钟) */
  duration: number
  /** 订单金额(分) */
  amount: number
  /** 实付金额(分) */
  paidAmount: number
  status: BookingStatus
  /** 预订时段列表 */
  timeSlots?: { startTime: string, endTime: string }[]
  /** 支付方式: CARD / WECHAT / ALIPAY / OFFLINE */
  paymentMethod?: string
  /** 备注 */
  remark?: string
  /** 是否代客预订 */
  isProxy?: boolean
  createdAt?: string
}

/** 锁定重复类型 */
export type LockRepeatType = 'once' | 'daily' | 'weekly'

/** 场地锁定 */
export interface CourtLock {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id?: string | number
  courtId: string | number
  venueId: string | number
  /** 锁定日期 YYYY-MM-DD */
  date: string
  startTime: string
  endTime: string
  /** 锁定原因 */
  reason: string
  /** 锁定类型: lock 锁定, training 培训 */
  type: 'lock' | 'training'
  /** 重复类型: once 单次, daily 每天, weekly 每周 */
  repeatType?: LockRepeatType
}

/** 时间段网格单元格 */
export interface TimeSlot {
  /** 时间标签 HH:mm */
  label: string
  /** 开始时间 HH:mm */
  startTime: string
  /** 结束时间 HH:mm */
  endTime: string
  /** 状态 */
  status: SlotStatus
  /** RANGE 整段一口价时段标识 "HH:mm-HH:mm"，该时段整段不可拆分；非 RANGE 为 undefined */
  rangeKey?: string
  /** 本时段价格(分)：HOURLY 为单小时价格，RANGE 为整段一口价；无价格配置为 undefined */
  price?: number
  /** 关联订单(若已预订) */
  order?: BookingOrder
  /** 关联锁定ID(仅 locked/training 有值, 雪花ID为字符串) */
  lockId?: string | number
  /** 锁定原因(仅 locked/training 有值) */
  lockReason?: string
}

/** 场地网格行 */
export interface CourtGridRow {
  court: Court
  slots: TimeSlot[]
}

/**
 * 会员卡类型
 * - stored_value 储值卡：按场地价格扣减余额
 * - times_card 次卡：预付 N 次，每次扣 1 次
 * - monthly_card 月卡：月度不限次或限定次数
 */
export type CardType = 'stored_value' | 'times_card' | 'monthly_card'

/** 会员卡状态 */
export type CardStatus = 'active' | 'frozen' | 'expired' | 'disabled'

/** 会员 */
export interface Member {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  name: string
  phone: string
  gender?: 'male' | 'female'
  avatar?: string
  /** 卡片归属俱乐部(经营者) id */
  operatorId?: string | number
  /** 归属俱乐部名称 */
  operatorName?: string
  /** 用户状态: 1 正常 0 冻结 */
  status?: number
  cardType: CardType
  cardNo: string
  /** 储值卡余额(分) */
  balance: number
  /** 次卡剩余次数 */
  remainingTimes?: number
  /** 累计充值(分) */
  totalRecharge: number
  /** 累计消费(分) */
  totalConsume: number
  cardStatus: CardStatus
  /** 办卡日期 */
  joinDate: string
  /** 到期日期（次卡/月卡） */
  expireDate?: string
  remark?: string
  createdAt?: string
}

/** 充值/交易类型 */
export type TransactionType =
  | 'recharge'
  | 'consume'
  | 'refund'
  | 'adjust'
  | 'lock'
  | 'unlock'

/** 会员卡交易记录 */
export interface CardTransaction {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  memberId: string | number
  type: TransactionType
  /** 变动金额(分), 正数为增加, 负数为扣减 */
  amount: number
  /** 变动后余额(分) */
  balanceAfter: number
  /** 支付方式 */
  payMethod?: 'wechat' | 'alipay' | 'cash' | 'card' | 'balance'
  /** 关联订单号 */
  orderNo?: string
  /** 备注/原因 */
  remark?: string
  operator?: string
  createdAt: string
}

/** 充值参数 */
export interface RechargeParams {
  memberId: string | number
  /** 充值金额(分) */
  amount: number
  /** 赠送金额(分) */
  giftAmount?: number
  payMethod: 'wechat' | 'alipay' | 'cash' | 'card'
  remark?: string
}

/** 余额调整参数 */
export interface BalanceAdjustParams {
  memberId: string | number
  /** 调整金额(分), 正数为增加, 负数为扣减 */
  amount: number
  /** 调整原因 */
  reason: string
  remark?: string
}

/** 退款参数 */
export interface RefundParams {
  memberId: string | number
  /** 退款金额(分) */
  amount: number
  /** 退款方式: balance 退到会员卡余额, wechat 原路退回微信 */
  refundMethod: 'balance' | 'wechat'
  /** 退款原因 */
  reason: string
  remark?: string
}

/** 会员统计 */
export interface MemberStats {
  /** 持卡会员总数 */
  totalMembers: number
  /** 储值卡余额合计(分) */
  totalBalance: number
  /** 次卡剩余次数合计 */
  totalRemainingTimes: number
  /** 本月充值金额(分) */
  monthRecharge: number
}

/** 球友(小程序注册用户, 含未办卡) */
export interface Friend {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  nickname?: string
  phone?: string
  avatar?: string
  /** 用户状态: 0 未绑定 1 正常 2 禁用 */
  status?: number
  createdAt?: string
  lastLoginAt?: string
  /** 是否持卡 */
  hasCard: boolean
  /** 持卡归属俱乐部 */
  cardOperatorId?: string | number
  cardOperatorName?: string
  /** 主俱乐部(球友主动设置，归属俱乐部优先展示) */
  mainOperatorId?: string | number
  mainOperatorName?: string
  /** 订场次数 */
  bookingCount: number
  /** 订场金额(分) */
  bookingAmount: number
  /** 最近订场时间 */
  lastBookingAt?: string
}

/** 球友统计 */
export interface FriendStats {
  /** 球友总数 */
  totalFriends: number
  /** 本月新增 */
  monthNew: number
  /** 持卡会员数 */
  memberCount: number
  /** 有订场消费的球友数 */
  consumedFriends: number
  /** 订场总次数 */
  totalBookings: number
  /** 订场总金额(分) */
  totalBookingAmount: number
}

// ==================== VIP 权益 ====================
export type VipPlanStatus = 'active' | 'inactive'

/** VIP 权益套餐 */
export interface VipPlan {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  /** 套餐名称 */
  name: string
  /** 套餐价格(分) */
  price: number
  /** 有效期(月) */
  durationMonths: number
  /** 卡类型: platform 平台卡 / venue 球馆卡 */
  planType?: 'platform' | 'venue'
  status: VipPlanStatus
  /** 卡种描述 */
  description?: string
  /** 各球馆折扣配置 (折扣率 0.1-1.0, 未配置视为不享受折扣) */
  venueDiscounts?: Array<{ venueId: string | number, venueName?: string, discountRate: number }>
  createdAt?: string
}

/** VIP 套餐球馆折扣配置 */
export interface VipPlanVenue {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id?: string | number
  vipPlanId: string | number
  venueId: string | number
  /** 折扣率 0.10-1.00 (0.8 表示 8 折) */
  discountRate: number
}

/** 卡种级权益类型 */
export type BenefitType =
  | 'VENUE_DISCOUNT'
  | 'TRAINING_DISCOUNT'
  | 'FREE_SLOT'
  | 'ACTIVITY_DISCOUNT'

/** 卡种权益 (membership_vip_benefit) */
export interface VipBenefit {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id?: string | number
  planId: string | number
  /** 权益类型: VENUE_DISCOUNT / TRAINING_DISCOUNT / FREE_SLOT / ACTIVITY_DISCOUNT */
  benefitType: BenefitType
  /** 场地折扣按球馆配置时为球馆 ID, 其余为 null */
  venueId?: string | number | null
  venueName?: string
  /** 折扣率 0.8=8折 (折扣类权益) */
  discountRate?: number | null
  /** 每月免费场次数 (仅 FREE_SLOT) */
  freeSlots?: number | null
  remark?: string
}

/** 储值等级折扣档位 (membership_recharge_tier) */
export interface RechargeTier {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id?: string | number
  operatorId?: string | number
  /** 档位名, 如 黄金会员 */
  name?: string
  /** 累计充值下限(元), 达到即命中 */
  minRecharge: number
  /** 折扣率 0.7=7折 */
  discountRate: number
  /** 1 启用 0 停用 */
  status: 1 | 0
}

/** 已购 VIP 权益会员记录 */
export interface VipMembership {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  userId: string | number
  userName: string
  userPhone: string
  vipPlanId: string | number
  vipPlanName: string
  purchaseTime: string
  expireTime: string
  status: 'active' | 'expired'
}

// ==================== 培训课程 ====================
export type CourseType = 'class' | 'private'
export type CourseStatus = 'active' | 'inactive'

/** 教练 */
export interface Coach {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  name: string
  phone: string
  /** 专项 (如 "单打技术""双打战术""少儿启蒙") */
  specialty: string
  /** 教龄(年) */
  yearsOfExperience?: number
  /** 履历 */
  bio?: string
  /** 已排课节数 */
  sessionCount?: number
}

/** 培训课程 */
export interface TrainingCourse {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  name: string
  /** 教练 ID(雪花大整数) */
  coachId: string | number
  coachName?: string
  /** 总课时 */
  totalSessions: number
  /** 单价(分/课时), 班课使用 */
  price: number
  /** 私教 1V1 单价(分/课时/人) */
  price1v1?: number
  /** 私教 1V2 单价(分/课时/人) */
  price1v2?: number
  /** 班课最大人数 */
  maxStudents?: number
  /** 常驻球馆 ID(详情页展示) */
  defaultVenueId?: string | number
  /** 常驻球馆名称 */
  venueName?: string
  /** 所属俱乐部名称 */
  operatorName?: string
  /** 报名条件 */
  requirement?: string
  /** 课程大纲(每行一节, \n 分隔) */
  outline?: string
  description: string
  courseType: CourseType
  status: CourseStatus
  /** 已报名学员数 */
  studentCount?: number
  /** 已消课时 */
  consumedSessions?: number
  createdAt?: string
}

/** 培训报名学员 */
export interface CourseStudent {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  studentName: string
  studentPhone: string
  enrollTime: string
  totalSessions: number
  consumedSessions: number
  /** 剩余课时 */
  remainingSessions: number
  /** 消课进度 0-100 */
  progress: number
}

/** 培训课程统计 */
export interface CourseStats {
  activeCourses: number
  monthEnrollments: number
  /** 总消课率 0-100 */
  consumeRate: number
  /** 培训收入(分) */
  totalRevenue: number
}

// ==================== 课时排课 ====================
export type SessionStatus = 'scheduled' | 'consumed' | 'cancelled' | 'pending'

/** 课时排课记录 */
export interface TrainingSession {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  courseId: string | number
  courseName?: string
  venueId: string | number
  venueName?: string
  courtId: string | number
  courtName?: string
  coachId: string | number
  coachName?: string
  /** 课次编号 */
  sessionNo: number
  /** 上课日期 YYYY-MM-DD */
  date: string
  startTime: string
  endTime: string
  status: SessionStatus
  /** 冲突类型 (仅 pending 状态有值) */
  conflictType?: 'booking' | 'lock' | 'coach' | 'other_session'
  /** 消课时间 */
  consumedAt?: string
}

/** 自动排课参数 */
export interface AutoScheduleParams {
  courseId: string | number
  venueId: string | number
  courtId: string | number
  /** 每周几次 */
  weeklyTimes: number
  /** 每周星期几 [1-7] */
  weekDays: number[]
  /** 起始日期 YYYY-MM-DD */
  startDate: string
  /** 结束日期 YYYY-MM-DD (由总课时/每周次数自动推算, 只读展示) */
  endDate?: string
  /** 总课时(用于推算结束日期) */
  totalSessions: number
  /** 默认开始时间 HH:mm */
  startTime: string
  /** 默认时长(分钟) */
  duration: number
}

/** 推算排课结束日期参数 */
export interface CalcEndDateParams {
  /** 每周几次 */
  weeklyTimes: number
  /** 每周星期几 [1-7] */
  weekDays: number[]
  /** 起始日期 YYYY-MM-DD */
  startDate: string
  /** 总课时 */
  totalSessions: number
}

// ==================== 财务管理 ====================
export type FinanceEntryType = 'income' | 'expense'

export type IncomeCategory = 'booking' | 'course' | 'membership' | 'vip' | 'other'
export type ExpenseCategory = 'rent' | 'salary' | 'utility' | 'maintenance' | 'marketing' | 'other'

/** 财务记录 */
export interface FinanceRecord {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  type: FinanceEntryType
  /** 收入类别 / 支出类别(联合类型) */
  category: IncomeCategory | ExpenseCategory
  amount: number
  /** 金额(分) */
  venueId?: string | number
  venueName?: string
  recordDate: string
  /** 经办人 */
  operator?: string
  remark?: string
  createdAt?: string
}

/** 财务统计 */
export interface FinanceStats {
  /** 总收入(分) */
  totalIncome: number
  /** 总支出(分) */
  totalExpense: number
  /** 净利润(分) */
  netProfit: number
  /** 支出占比 0-100 */
  expenseRatio: number
  /** 收入环比上月变化 0-100 */
  incomeChange: number
  /** 支出环比上月变化 0-100 */
  expenseChange: number
  /** 利润率 0-100 */
  profitRatio: number
}

/** 月度收支(柱状图) */
export interface MonthlyFinance {
  month: string
  income: number
  expense: number
}

/** 球馆收支汇总 */
export interface VenueFinanceSummary {
  venueId: string | number
  venueName: string
  booking: number
  course: number
  membership: number
  other: number
  total: number
}

// ==================== 经营者入驻 / 账号管理 ====================
export type OperatorStatus = 'pending' | 'approved' | 'rejected'
export type AdminRole = 'super_admin' | 'operator' | 'admin' | 'coach' | 'front_desk' | 'partner' | 'staff'
export type AccountStatus = 'active' | 'disabled'

/** 经营者入驻申请 */
export interface OperatorApplication {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  /** 公司名称 */
  companyName: string
  /** 营业执照编号 */
  licenseNo: string
  /** 营业执照照片 URL */
  licenseImage?: string
  /** 联系人姓名 */
  contactName: string
  /** 联系电话 */
  contactPhone: string
  /** 入驻时录入的首个球馆信息 */
  venueName: string
  venueAddress: string
  venueCourtCount: number
  venueOpenTime: string
  venueCloseTime: string
  status: OperatorStatus
  /** 驳回原因 (仅 rejected 有值) */
  rejectReason?: string
  /** 微信支付商户号 (approved 后由经营者配置) */
  mchId?: string
  /** 商户号配置状态: unconfigured / configured / verified */
  mchStatus?: 'unconfigured' | 'configured' | 'verified'
  createdAt: string
  /** 审核时间 */
  reviewedAt?: string
}

/** 管理后台账号 */
export interface AdminAccount {
  /** ID 为雪花大整数，后端序列化为字符串，故允许 string | number */
  id: string | number
  /** 所属经营者 ID */
  operatorId: string | number
  /** 所属经营者名称 */
  operatorName?: string
  username: string
  nickname: string
  phone: string
  role: AdminRole
  /** 关联球馆 ID 列表(雪花大整数, 均为字符串) */
  venueIds: (string | number)[]
  /** 关联球馆名称列表 */
  venueNames?: string[]
  status: AccountStatus
  createdAt: string
  /** 最后登录时间 */
  lastLoginAt?: string
}

/** 经营者账号统计 */
export interface OperatorStats {
  /** 待审核申请数 */
  pendingCount: number
  /** 已通过经营者数 */
  approvedCount: number
  /** 已创建账号总数 */
  accountCount: number
  /** 已配置商户号经营者数 */
  mchConfiguredCount: number
}

/** 商户号配置参数 */
export interface MchConfigParams {
  mchId: string
  /** 商户 API 密钥 */
  apiKey: string
  /** 商户证书文件标识 (上传后返回的 key) */
  certKey?: string
}
