# AGENTS.md

羽球管家 PC 端（管理端/运营后台）。前后端拆分开发，接口契约以 sun 后端为准，约定如下。

## 仓库拓扑

- `sun`：Java 后端（Spring Boot，唯一接口实现方）
- `star`：微信小程序（C 端）
- `moon`：PC 端（本仓库，管理/运营后台）

## 后端接口契约（唯一事实源）

- 后端默认 local profile 跑在 `http://localhost:8080`，零外部依赖（H2 + 嵌入式 Redis），`mvn spring-boot:run` 即可启动。
- 契约文档：Swagger UI `http://localhost:8080/swagger-ui.html`
- 机器可读契约：`http://localhost:8080/v3/api-docs`——对接一律以这份 JSON 为准，**不要在本仓库自建接口文档**。
- 后端 CORS 已放开（`allowedOriginPatterns("*")`），PC 浏览器联调无跨域问题。

## 对接约定

- 统一响应 `Result<T>`：`code=0` 成功；非 0 为业务错误码（6 位数字，如 `900401` 未登录/登录过期、`900403` 无权限、`900429` 限流）。`data` 为业务数据，`message` 为提示文案，`traceId` 用于日志关联。
- 分页：请求参数固定 `page`/`size`（默认 1/10）；响应 `PageResult<T>` 字段为 `total`/`page`/`size`/`list`（注意是 `list`，不是 `records`）。
- 鉴权：请求头 `Authorization: Bearer <token>`。管理端登录 `POST /api/auth/login`；登录过期返回 `900401`，前端应跳转登录页。
- 日期时间格式 `yyyy-MM-dd HH:mm:ss`，时区 `Asia/Shanghai`。
- 金额字段为数字（后端 BigDecimal），前端展示保留两位小数，勿用浮点直接做金额运算。
- 接口路径/参数/响应字段以 `v3/api-docs` 为准；需要新增或修改接口时，先在 `sun` 仓库实现并补 `@Tag`/`@Operation`，再按文档对接，禁止前后端各自约定。

## 联调

- 本地把接口 baseURL 指向 `http://localhost:8080`。
- 需要 mock 时，可导出 `v3/api-docs` JSON 快照存到本仓库 `docs/` 目录（约定，可离线对照）。
