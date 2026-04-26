# BigChef V1 补充需求文档（登录、站内视频、大模型接入）

## 1. 文档目的

在当前 V1 主流程完成基础上，补齐以下关键能力：
1. 登录流程：匿名游客 + 手机号登录（先预留能力）
2. 查看视频：仅站内视频展示与无视频引导
3. 推荐菜谱与查找菜谱接入大模型能力

该文档用于指导后续 Cursor 按阶段实现，避免需求分散。

---

## 2. 总体原则

- V1 以“快速可用 + 可演进”为目标，不追求一次做完完整账号体系。
- 内部数据优先，视频能力以站内可控链路为主。
- 大模型能力作为增强层，不阻断主流程可用性。

---

## 3. 需求一：登录流程（匿名游客 + 手机号登录预留）

## 3.1 目标
- 用户可在未登录状态下体验核心查询流程（游客模式）。
- 用户在需要保存个人数据（收藏、历史、家庭）时引导登录。
- 先预留短信登录接口与前端状态流，后续再接真实短信服务。

## 3.2 功能需求
- FR-LOGIN-01：应用启动默认游客可用。
- FR-LOGIN-02：收藏、浏览历史、社区发布等操作触发登录引导。
- FR-LOGIN-03：支持手机号验证码登录接口定义与前端调用链预留。
- FR-LOGIN-04：登录成功后游客状态可升级为用户态（迁移本地收藏/历史可选）。
- FR-LOGIN-05：采用“游客数据先落库”方案，游客侧收藏/历史等数据按 `guestId` 存储；登录成功后自动执行 `guestId -> userId` 幂等迁移，确保数据不丢失、不重复。

## 3.3 接口预留（Auth）
- `POST /api/v1/auth/sms/send`
- `POST /api/v1/auth/sms/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/guest/upgrade`
  - 用途：登录成功后，将游客数据从 `guestId` 绑定/迁移到 `userId`
  - 请求示例：
```json
{
  "guestId": "guest_2d8f0f4e-9d4e-4c63-b1f6-1b9f9f7f4f1a"
}
```
  - 返回示例：
```json
{
  "success": true,
  "migrated": {
    "favorites": 12,
    "history": 37
  },
  "deduplicated": {
    "favorites": 2,
    "history": 5
  }
}
```
  - 约束：
    - 接口需幂等（重复调用结果一致）
    - 迁移需事务化，避免部分成功导致数据不一致
    - 收藏/历史按唯一键去重（如 `userId + dishId`）

## 3.4 前端实现要求
- 增加 `AuthStore`（token、user、isGuest）。
- `http` 层支持 token 注入与 401 处理。
- 业务按钮支持“需登录”拦截器（如收藏）。
- 首次进入应用生成并持久化 `guestId`，游客态请求携带 `guestId`。
- 登录成功后先调用 `POST /api/v1/auth/guest/upgrade`，成功后再切换完整用户态并刷新收藏/历史。
- 升级失败时不得清空游客数据，需支持重试与兜底提示，避免用户感知“数据丢失”。

## 3.5 验收标准
- 未登录用户可完整使用推荐/查菜。
- 触发“需登录”动作时有明确引导，不出现静默失败。
- 预留接口与状态结构稳定，后续接短信服务时改动最小。
- 游客态新增收藏/历史后登录，登录态可看到对应数据。
- 重复触发升级接口不会产生重复收藏/历史。
- 升级异常时，游客侧原始数据仍可恢复并在重试后完成迁移。

---

## 4. 需求二：查看视频（仅站内能力）

## 4.1 目标
- 当系统内部有可展示视频时，提供稳定的视频观看体验。
- 当系统内部无视频时，提供站内引导，不依赖外部平台跳转。

## 4.2 功能需求
- FR-VIDEO-01：菜谱详情返回 `videoSourceType` 字段：
  - `internal`：内部视频可直接展示
  - `none`：无视频
- FR-VIDEO-02：`none` 时返回 `emptyStateActions`，用于站内空状态引导（如“查看图文步骤”“求更新该菜谱视频”）。
- FR-VIDEO-03：支持“求更新该菜谱视频”意愿收集，按 `dishId` 聚合需求，用于后续视频补充优先级排序。
- FR-VIDEO-04：`request_video` 采用“计数 + 去重”策略：
  - 计数：记录每个 `dishId` 的总请求次数（totalRequests）
  - 去重：记录去重用户数（uniqueRequestUsers），同一用户/设备对同一 `dishId` 在冷却期内重复点击不重复计数
  - 冷却期建议：7 天（可配置）

## 4.3 返回结构建议
```json
{
  "dishId": "dish_101",
  "dishName": "可乐鸡翅",
  "videoSourceType": "none",
  "emptyStateActions": [
    {
      "actionType": "view_steps",
      "text": "先看图文步骤"
    },
    {
      "actionType": "request_video",
      "text": "求更新该菜谱视频"
    }
  ],
  "videos": []
}
```

## 4.4 前端交互要求
- `internal`：显示“观看视频教程”
- `none`：显示“暂无视频”，并展示站内引导动作（图文步骤、求更新视频）
- 用户点击“求更新该菜谱视频”后，给出提交成功反馈，避免重复点击和静默失败

## 4.5 验收标准
- 内部无视频时页面不空白，用户可继续完成站内浏览与烹饪流程。
- 求更新意愿可追踪（埋点：菜谱ID、来源页面、点击次数、去重用户数）。
- 全链路不依赖外部平台可达性，弱网/限制环境下仍可完成核心流程。
- 同一用户连续点击“求更新该菜谱视频”不会造成需求池刷量；冷却期后可再次计入。

---

## 5. 需求三：推荐与查菜接入大模型能力

## 5.1 目标
- 提升推荐质量与查菜可用性，减少“查不到/结果弱相关”。
- 在不影响基础可用的前提下，引入模型增强。
- 采用“数据库优先、模型兜底、结果可复用”的策略，控制调用成本并持续沉淀内容资产。

## 5.2 场景拆分

### A. 推荐增强（按食材）
- 请求处理顺序：
  1. 先查数据库（食材归一 + 倒排检索 + 基础排序）。
  2. 若数据库有结果：默认直接返回数据库结果，不自动调用大模型；前端展示“AI 帮我再推荐”按钮，用户主动触发后再调模型。
  3. 若数据库无结果：自动调用大模型生成 1~3 道可执行菜谱，并写入数据库，后续同类请求优先命中数据库。
- 模型参与点：
  - 食材别名归一（番茄=西红柿）
  - 菜谱建议生成（仅在无数据或用户主动触发时）
  - 缺失食材建议补齐

### B. 查菜增强（按菜名）
- 请求处理顺序：
  1. 先查数据库（精确匹配 + 别名匹配 + 模糊匹配）。
  2. 若命中则直接返回，不调用大模型。
  3. 若未命中则调用大模型生成对应菜谱，并写入数据库；本次返回生成结果，后续同菜名请求直接走数据库。
- 模型参与点：
  - 菜名纠错与标准化（“可乐鸡腿” -> “可乐鸡翅”等）
  - 未收录菜谱生成（结构化输出，禁止自由散文）

## 5.3 功能需求
- FR-AI-01：推荐与查菜均采用 DB-first 策略；数据库命中时默认不调用模型。
- FR-AI-02：推荐场景支持用户主动触发 `aiBoost`（如“AI 帮我再推荐”）；仅主动触发或 DB miss 时调用模型。
- FR-AI-03：查菜场景 DB miss 时可调用模型生成单菜谱，并支持入库复用。
- FR-AI-04：模型输出必须结构化（JSON Schema 校验），禁止前端依赖自由文本解析。
- FR-AI-05：模型生成结果需通过后端内容校验后入库（字段完整性、步骤数量、食材格式、敏感词过滤）。
- FR-AI-06：模型异常、超时或校验失败时主流程可降级到数据库结果或空状态，不阻断请求。
- FR-AI-07：同一标准化查询在短时间内需具备幂等与防重复入库能力（如 `queryHash` 唯一键 + upsert）。

## 5.4 数据结构建议（最小可用）
- `dishes`：菜谱主表（`id`、`name`、`description`、`sourceType`、`status`、`createdAt`）
- `dish_ingredients`：菜谱食材表（`dishId`、`ingredientName`、`amount`、`unit`、`optional`）
- `dish_steps`：菜谱步骤表（`dishId`、`stepNo`、`content`、`durationSec`）
- `dish_alias`：菜名/食材别名表（用于归一检索）
- `ai_generation_tasks`：生成任务表（`id`、`sceneType`、`normalizedQuery`、`queryHash`、`status`、`model`、`latencyMs`、`errorCode`）
- `ai_generation_results`：生成结果表（`taskId`、`dishId`、`score`、`validationResult`、`rawJson`）
- 关键约束：
  - `queryHash + sceneType` 建唯一索引，避免重复生成与重复入库
  - `dishes.sourceType` 区分 `manual` / `ai_generated`
  - `dishes.status` 建议至少包含 `draft`、`published`（V1 可默认 `published`，后续可接人工审核流）

## 5.5 Prompt 与调用策略（后端）
- 推荐（按食材）Prompt 要点：
  - 输入：标准化食材列表、口味偏好、忌口、目标数量（1~3）
  - 约束：仅返回 JSON；每道菜必须包含菜名、食材清单、步骤、预计耗时、难度、替代食材建议
  - 规则：优先使用用户已提供食材，缺失食材单独列出 `missingIngredients`
- 查菜（按菜名）Prompt 要点：
  - 输入：标准化菜名、地域口味偏好（可选）
  - 约束：仅返回单菜谱 JSON，字段必须完整（名称、食材、步骤、时长、2~3 个标签）
  - 规则：如果菜名歧义，返回 `canonicalName` 与 `aliases`
- 防幻觉约束：
  - 不允许返回“无法确定”之外的虚构营养数据、医疗功效描述
  - 步骤数量建议 3~8 步，每步控制在可执行长度
  - 输出先过 JSON Schema 校验，失败自动重试一次（低温度），再失败则降级

## 5.6 AI 生成内容审核规则（V1 最小可用）
- 审核目标：控制“可做性、可读性、安全性”，避免低质量内容直接污染主库。
- 入库前自动校验（机审）：
  - 字段完整：菜名、食材、步骤、时长、难度必填
  - 格式合法：数量单位可解析；步骤按序编号；JSON Schema 严格通过
  - 基础质量：步骤数 3~8；主食材不少于 1；单步长度限制（避免过短/过长）
  - 安全规则：敏感词、违规词、明显危险指令（如不当处理方式）拦截
- 质量分级与状态：
  - `approved`：自动校验通过且质量分达到阈值，直接发布
  - `needs_review`：自动校验通过但质量分接近阈值，进入人工抽检池
  - `rejected`：校验失败或命中安全规则，不入正式库
- 人工抽检（V1 简化）：
  - 抽检比例建议 10%~20%（优先抽检高曝光内容）
  - 抽检维度：步骤可执行性、食材合理性、文案准确性
  - 发现问题可回退状态：`approved -> rejected`，并记录原因
- 高曝光定义（V1）：
  - 统计口径：按自然日聚合 `dish_detail_view`
  - 判定建议：最近 7 天曝光量 Top 20% 或 最近 7 天曝光量 >= 100
  - 命中高曝光的 AI 菜谱自动进入次日抽检队列
- 数据字段建议补充：
  - `dishes.qualityScore`（0~100）
  - `dishes.reviewStatus`（`approved`/`needs_review`/`rejected`）
  - `dishes.reviewReason`（可空，记录拒绝/下线原因）
  - `dish_daily_metrics`（`dishId`、`date`、`detailViewCount`），用于高曝光抽检判定

## 5.7 接口返回建议（DB-first + AI元信息）
```json
{
  "list": [...],
  "total": 3,
  "source": "db",
  "aiMeta": {
    "used": false,
    "triggeredBy": "none",
    "generationSaved": false
  },
  "actions": [
    {
      "actionType": "ai_boost_recommend",
      "text": "AI 帮我再推荐"
    }
  ]
}
```

```json
{
  "dishId": "dish_ai_20260426_01",
  "dishName": "可乐鸡翅",
  "ingredients": {...},
  "stepsSummary": [...],
  "source": "ai_generated",
  "aiMeta": {
    "used": true,
    "triggeredBy": "db_miss",
    "generationSaved": true
  }
}
```

## 5.8 验收标准
- 推荐场景：DB 命中时默认不调模型；用户手动触发后才调模型并返回增强结果。
- 推荐场景：DB miss 时自动生成 1~3 道菜谱并成功入库；同类请求二次命中数据库。
- 查菜场景：DB 命中不调模型；DB miss 调模型生成并入库，后续同菜名请求不重复生成。
- 模型输出非结构化或校验失败时可自动重试/降级，不影响接口可用性。
- AI 成本可观测：可统计自动触发与用户触发占比、生成成功率、入库复用率。
- AI 入库质量可控：机审拦截生效，抽检机制可执行，问题内容可回退/下线。

---

## 6. 埋点与指标（V1 补充）

- 登录相关：
  - `auth_prompt_shown`
  - `auth_sms_sent`
  - `auth_login_success`
- 视频相关：
  - `video_internal_click`
  - `video_empty_state_shown`
  - `video_request_update_click`
- AI 相关：
  - `ai_recommend_triggered_auto`
  - `ai_recommend_triggered_manual`
  - `ai_db_miss_triggered`
  - `ai_generation_saved`
  - `ai_generation_reused`
  - `ai_review_sampled_by_exposure`
  - `ai_suggestion_clicked`
  - `ai_fallback_used`
  - `dish_detail_view`

核心指标：
- 推荐页查询后点击率（CTR）
- 查菜命中率与二次搜索率
- 视频页空状态触发率与“求更新”提交率
- 登录转化率（游客 -> 登录）

---

## 7. 风险与约束

- 短信服务会带来成本（当前先预留不接真实短信）。
- 站内视频供给可能不足，短期内需通过“求更新”数据来指导优先补充。
- 大模型成本与稳定性需通过开关和限流控制。

---

## 8. 分阶段实施建议

### Phase A（本周）
- 补齐登录预留链路（游客态 + AuthStore + 需登录拦截）
- 完成 `videoSourceType + 无视频空状态引导` 前后端对接

### Phase B（下周）
- 推荐/查菜接入 DB-first + AI fallback + 结构化输出校验
- 完善降级策略、埋点与监控

### Phase C（后续）
- 接入真实短信服务
- 增加 AI 生成内容审核与质量分层（人工抽检/用户反馈闭环）

