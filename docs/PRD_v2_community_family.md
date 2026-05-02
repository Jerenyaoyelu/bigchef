# BigChef V2 需求文档：社区与家庭功能

## 1. 背景与目标

V1 已完成核心主流程（推荐菜谱、查找菜谱、我的），V2 目标是把产品从“做饭工具”升级为“关系驱动的做饭社区”：
- 通过社区内容提升菜谱视频覆盖率与搜索命中率。
- 通过家庭/情侣协作场景提升留存与复访频次。
- 为后续“内部视频优先、外部平台兜底”的内容策略提供稳定供给。

---

## 2. V2 核心能力范围

### 2.1 社区
- 用户可发布做菜短视频与图文内容，**优先支持手机相册本地视频上传**（视频链接作为补充方式，而非主路径）。
- 视频发布链路包含：选择本地视频 -> 上传进度 -> 服务端转码（ffmpeg） -> 自动封面 -> 发布。
- 用户可浏览、点赞、收藏、评论社区内容。
- 社区内容可关联具体菜谱（`dishId`）或食材标签。
- 推荐/查菜页面优先展示内部社区视频。

### 2.2 家庭（含情侣概念）
- **定义**：「家庭空间」面向**同一屋檐下、长期一起吃饭**的小团体——典型是**情侣两人**，也可以是**少数合租且常在家做饭**的朋友；不等同于泛社交群。
- **同住关系类型（非「成员个人身份」）**：需区分 **情侣** 与 **合租同伴**（含两人饭搭子），用于**文案/氛围**（如「一起过日子」vs「合租小灶/饭搭子」）及后续可选能力（纪念日等可默认仅对 `couple` 展示）。该字段是**整个空间的属性**（`householdRelation`），**不是**给某位成员单独选「我是男友/女友」；两人对称场景下无需再拆成员子身份。
- **谁来选**：**创建家庭时由创建人**选择 `couple` 或 `roommates`。**被邀请人**在**接受邀请**页看到该类型并**勾选确认**后加入；若与事实不符，**不**由被邀请人单方面改类型——应**取消加入**，由主持人在家庭设置**更正**（FR-09a）后重邀。**不推荐**仅在邀请链路里由邀请人替对方选「你的身份」（易冒犯且语义不清）；**不推荐**仅由被邀请人在加入时单方面定类型（易与创建者预期冲突，全站文案与默认协作无法统一）。
- **MVP 范围**：注册用户**同一时间仅归属一个**长期家庭空间（避免多家庭切换与数据归属复杂化）；后续若有强需求再扩展。
- 家庭成员可共享收藏菜谱、做饭计划、食材清单。
- 支持家庭内协作动作：分工、打卡、提醒、共同完成记录。
- **周菜单闭环**：按自然周维护菜单（草案可随时改）→ 汇总「想吃」与偏好 → 可**一键生成**后再微调 → 生成/更新**聚合采购清单**；支持单次或分阶段采购及**建议购买日/提醒**。
- **菜单协作原则（弱确认）**：真实过日子**临时改菜很正常**；**情侣双人场景不强调「必须双方点确认才生效」**，以**当前菜单版本**为准、随时可改；**心理锚点**偏向「采购清单勾选/买完菜」之后大改可轻提示而非强流程阻断。多人合租若长期共厨、众口难调，可通过家庭设置开启**更显式**的协商/确认（见 FR-19），优先级低于情侣主路径。
- **过日子导向**：家庭维度「常做菜」统计、轻量变更留痕、双人协作勾选采购项，强化情侣/家庭共同生活感。

### 2.3 临时聚餐（朋友局）
- 与长期「家庭空间」区分：发起人创建**一次性聚餐群组**（非长期家庭），用于**朋友临时来家吃饭、几人凑一桌**等高频真实场景。
- 创建时定义**就餐人数**；成员各自提交「想吃的」（可关联菜谱或简短描述）；支持**一键生成**聚会菜单与**食材采购清单**；生成后可改。
- 生成菜单后支持**酒水偏好**：展示常见选项（如啤酒/红酒/白酒/软饮/不饮酒等）+ **自由补充说明**；默认以「提示与备忘」为主，是否并入采购清单由产品设计（酒水常线下决定，可仅展示不推荐进货）。

### 2.4 搜索融合策略
- 搜索菜谱时先检索内部社区视频。
- 若内部视频覆盖不足，展示“去抖音查看”兜底入口。
- 形成闭环：外部导流 -> 内部创作 -> 内部覆盖提升。

---

## 3. 用户角色

- 游客：可浏览部分内容，不可发布、不可加入家庭协作。
- 注册用户：可发帖、互动、加入/创建家庭空间。
- 家庭成员：在家庭空间内共享和协作。
- 家庭管理员（可选）：管理成员权限、邀请与移除。
- **家庭主持人**（默认创建者，可移交）：发起周菜单、使用一键生成、维护采购节奏；权限细节见 FR-19。
- **家庭协作模式**（家庭级配置，默认贴近真实生活）：
  - **`couple_flexible`（默认）**：适合**两人**（情侣或合租均可）；无强制定稿门槛，菜单与清单以**最新编辑**为准；可选「通知对方我改好了」而非「必须确认」。
  - **`household_explicit`（可选）**：适合**多人同住且常共厨**；可开启更显式流程（如「待讨论」→「多数人已阅」或简单投票/确认），具体交互可分期实现，**不阻塞**情侣主路径 MVP。
  - **与 `householdRelation` 的默认搭配**：新建时选 `couple` 或 `roommates` 均可默认 `couple_flexible`（两人弱确认）；UI 文案按 `householdRelation` 分流；多人合租时再引导开启 `household_explicit`（可后续按人数提示）。
- **聚餐发起人**：创建临时聚餐群组、设置人数、邀请好友、触发一键生成菜单与清单。
- **聚餐参与者**：加入群组、提交想吃项、查看生成结果与酒水偏好。

---

## 4. 核心用户故事

### 4.1 社区
- 作为用户，我想发布一道菜的视频，让别人跟做。
- 作为用户，我想在查菜时看到真实用户做法视频，提高可信度。
- 作为用户，我想收藏社区里实用的视频教程，后续复看。

### 4.2 家庭/情侣
- 作为情侣用户，我想共享“本周做饭计划”，减少沟通成本。
- 作为家庭成员，我想看到谁做了什么菜并打卡，增强参与感。
- 作为家庭管理员，我想邀请成员加入并管理协作权限。
- 作为家庭主持人，我想起草一周菜单并通知对方查看/补充；买齐菜之后我们仍可按实际微调，不被「确认流程」绑死。
- 作为家庭成员，我想单独提交「想吃的菜」和简单备注，被对方看见，并可被拖入某天的正式计划。
- 作为家庭用户，我想看到我们家**最常做**的菜、多久没做过某道菜，并一键加入下周计划。
- 作为家庭用户，我想根据**当前周菜单**（不必强制定稿）**自动生成/刷新要买什么**，合并葱姜蒜等同类项，并标记家里已有的不再买。
- 作为家庭用户，我想选择**一次买齐**或**分两次买**（如周末买前半周+周中买后半周及易坏品），并得到**建议哪天买哪一批**的提醒。
- 作为家庭用户，我想在收集大家「想吃的」之后**一键生成一周菜单**，不够的天数用我们家**历史偏好**由系统（含 AI）合理补齐，生成后我再改。
- 作为聚会组织者，我想**临时拉一个聚餐群**，定好**人数**，让大家分别报菜，再**一键出菜单和买菜清单**。
- 作为聚会参与者，我想在菜单生成后一起定下**酒水偏好**（常见选项 + 自己补充）。

### 4.3 临时聚餐
- 作为发起人，我想创建一次性聚餐并设定就餐人数，邀请朋友加入协作。
- 作为参与者，我想快速输入我想吃的菜（选菜谱或打字），最后看到合并后的菜单与食材清单。

---

## 5. 功能需求（FR）

### 5.1 社区发布与内容管理
- FR-01：支持发布帖子（标题、正文、视频、菜谱关联、标签）。
- FR-02：支持帖子草稿保存与发布。
- FR-03：支持帖子删除（作者/管理员）。
- FR-04：支持帖子举报（基础文本原因）。
- FR-04a：支持**本地视频上传**（iOS/Android 相册选取），客户端展示上传进度、失败重试与取消。
- FR-04b：支持视频上传后异步转码（ffmpeg，至少产出 720p H.264 + AAC 版本）与封面抽帧；帖子视频状态至少包含 `uploading` / `processing` / `ready` / `failed`。
- FR-04c：在 `processing` 阶段帖子可见占位态（可见但不可播放或显示处理中）；`failed` 提供重新处理或重新上传入口。
- FR-04d：保留视频链接发布能力作为补充来源（创作者搬运/外部素材），但发布页默认首选本地上传。

### 5.2 社区浏览与互动
- FR-05：支持信息流浏览（最新/热门）。热门流采用固定评分公式（V2 定版）：`score = likeCount * 1 + commentCount * 2 + favoriteCount * 2 + completePlayRate * 10 - timeDecayHours * 0.03`；每日可调权重但需保留审计记录，防止线上“暗改”导致不可回溯。
- FR-06：支持点赞、取消点赞、评论、删除评论。
- FR-07：支持收藏帖子与收藏列表查看。
- FR-08：支持按菜名/标签搜索帖子。

### 5.3 家庭空间
- FR-09：支持创建家庭空间（名称、头像可选）；创建时必选 **`householdRelation`**：`couple`（情侣）或 `roommates`（合租同伴/饭搭子，两人及以上同住共厨均可先用此枚举，文案区分于情侣）。**MVP**：同一注册用户**同一时间仅可归属一个**长期家庭空间（创建或加入二选一逻辑由实现定义：未加入前可创建，加入后不可再加入其他家庭，除非先退出）。
- FR-10：支持邀请码邀请加入家庭；**加入流程**须展示目标家庭的 `householdRelation` 与空间名称，被邀请人**确认已知**后方可加入。若被邀请人认为类型错误，允许**取消加入**（MVP 不提供「单方面改类型」）；主持人可在 **FR-09a** 更正关系类型后重新邀请。
- FR-09a：支持**主持人/管理员**在家庭设置中修改 `householdRelation`（更正误选），修改后通知全体成员（站内即可）；不自动踢人。
- FR-11：支持成员列表查看、退出家庭、管理员移除成员。
- FR-12：支持家庭共享收藏列表（菜谱与帖子）。

### 5.4 家庭协作
- FR-13：支持创建“做饭计划”（日期、菜谱、负责人）。
- FR-14：支持完成打卡（图片/文字可选）。
- FR-15：支持食材清单共享与勾选完成。

### 5.5 搜索与视频融合
- FR-16：查菜/推荐返回结构支持 `videoSourceType`：
  - `internal`：内部社区视频
  - `external_search`：外部搜索兜底
  - `none`：暂无视频
- FR-17：内部视频不足时返回 `videoSearchQuery` 供“去抖音查看”。

### 5.6 周菜单、心愿菜、统计与聚合采购（过日子闭环）
- FR-18：支持按**自然周**（`weekStart` 日期）管理家庭周菜单；**状态以「当前有效版本」为主**，不必强依赖「定稿」门槛。可保留 `draft` 等标签用于展示，**情侣默认场景**下允许随时编辑周菜单；若开启 `household_explicit`（见 FR-19），可增加「待讨论」等状态（分期实现亦可）。
- FR-19：支持家庭级配置**协作模式**（与 §3 对齐）：**默认 `couple_flexible`**——不强制全员点确认；菜单与采购清单始终对齐**最后一次保存**的菜单；可选「通知对方菜单已更新」。**可选 `household_explicit`**——面向多人合租共厨，可启用更显式协商（如阅知统计、简单确认或投票，细则分期），**不得反向拖累**默认双人体验。可选保留「仅主持人可改周菜单」开关（`host_only_edit`）供少数家庭使用。
- FR-20：周视图支持按日关联菜谱（MVP 可**仅晚餐**以降低复杂度）；与 FR-13 打通：每日餐次可指定负责人。**数据唯一来源（V2 定版）**：排餐以 `FamilyMenuWeek` + 带 `menuWeekId` 的 `FamilyMealPlan` 为准，禁止并存第二套独立计划数据写入路径。
- FR-21：成员可维护**想吃清单**（`dishId`、可选备注如少辣/清淡）。**手动排餐**时：心愿菜可由成员**拖入某日**。**一键生成**（FR-29）时：系统可将心愿菜自动铺到周内并补位，生成后用户仍可改。
- FR-22：支持「提醒对方看一眼」类**弱通知**（非强制确认）；对关键变更保留**轻量留痕**（操作者、时间、摘要）。**采购侧锚点**：当用户大量勾选采购完成或手动标记「已买菜」时，可对**大幅改菜单**给出轻提示（不阻断）。
- FR-23：家庭**常做菜统计口径（V2 定版）**统一为「计划项标记为已做」（`FamilyMealPlan.status=done`）；FR-14 打卡仅用于内容展示，不进入统计计数。支持近 30/90 天完成次数 Top、距上次制作天数；支持从统计**一键加入**指定周计划；并作为 **FR-29** 补全菜品的偏好输入之一。
- FR-24：支持基于**当前周菜单**（无需「定稿」）根据周内菜谱**自动汇总/刷新**食材为家庭采购清单；菜单变更后允许**一键重新生成清单**（合并策略见 NFR-05）。
- FR-25：采购清单支持：**同名/同类食材合并**、**单位统一或简单换算表**、**手动增删行**、**标记「家里已有」**从待购中排除（MVP 可不做完整库存，仅清单级排除即可）。
- FR-26：用户可选择采购策略：**单次采购**（一个清单+一个默认提醒时点）；**两阶段采购**（默认推荐：第一波覆盖周日至周中、第二波覆盖后半周及易坏品补货），具体切分日可由家庭设置或系统默认。
- FR-27：按食材类型给出**默认批次**（如叶菜、豆制品、浆果倾向靠后批次；根茎、冷冻、干货调料可前置）及**建议购买日**；用户可调整每批次的计划购买日，并写入**提醒**（推送/站内信/日历导出可作为 Phase 2+）。
- FR-28：**关键事件通知**（弱打扰）：家庭邀请待接受、菜单/采购清单**重大更新**（可合并推送）、临近建议购买日的采购提醒；**避免**对每次微调菜单都发强提醒（与 NFR-06 对齐）。

### 5.7 智能一键菜单与临时聚餐群组
- FR-29：**家庭周菜单一键生成**：在指定自然周内，综合成员**想吃清单**、家庭**历史常做/偏好**（FR-23）与基础规则（荤素搭配、重复菜控制等），生成**一周排餐草案**；若心愿+偏好仍不足覆盖计划餐次数，由 **AI 辅助补全**推荐菜（须可解释：标注「来自心愿」「来自历史」「系统推荐」）；生成结果**全文可编辑**、可重新生成（覆盖前确认）。AI 不可用时有**规则兜底**（仅历史+热门/本地缓存策略），见 NFR-07。
- FR-30：**临时聚餐群组**（与 FR-09 家庭区分）：发起人创建**一次性**会话，填写**就餐人数**、标题/时间可选；通过邀请码或链接邀请已注册用户加入（游客策略见下）；**不计入**「仅一个家庭」限制。
- FR-31：聚餐成员可提交**想吃项**：优先关联平台内 `dishId`，否则允许**简短自由文本**（供生成时匹配或 AI 解析）；发起人可**一键生成**聚会菜单（考虑人数份量、凉菜热汤搭配等基础约束）及**食材采购清单**；生成后全员可查看与编辑（权限：默认发起人或可设「仅发起人可改」——MVP 可简化为发起人+全员可提建议后由发起人定稿）。
- FR-32：**酒水偏好**（聚餐菜单生成之后）：提供**常见选项**（如啤酒、红酒、白酒、软饮、气泡水、不饮酒等，可配置文案）多选 + **自由文本补充**；默认写入聚餐会话的「备忘区」；是否将酒水**并入采购清单**为可选开关（默认**仅展示不并入**，避免与线下买酒习惯冲突）。
- FR-33：聚餐群组生命周期：**进行中 → 已生成菜单 → 已结束/归档**；超过一定时间自动归档或手动结束；历史可仅发起人可见或全员可见（MVP 可简化为全员可见至结束）。

### 5.8 权限矩阵（V2 最小可用）

- 家庭空间：
  - `owner/admin`：可修改家庭设置（含 `householdRelation`、`collaborationMode`）、可移除成员、可发起与编辑周菜单、可生成采购清单。
  - `member`：可查看周菜单与清单、提交心愿菜、在 `hostOnlyEdit=false` 时可编辑周菜单。
- 聚餐空间：
  - `creator`：可关闭聚餐、可最终修改聚餐菜单与酒水偏好。
  - `participant`：可提交想吃项、查看生成结果；默认不可关闭聚餐。
- 社区内容：
  - 帖子作者可删自己帖子；管理员可删任意帖子；评论作者可删自己评论。

---

## 6. 非功能需求（NFR）

- NFR-01：视频关联查询接口 P95 < 300ms（不含外部跳转）。
- NFR-02：社区列表接口支持分页与游标，避免深分页性能问题。
- NFR-03：用户与家庭数据隔离，接口必须校验成员权限；**临时聚餐**数据仅创建者与已加入成员可访问（分享链接需防枚举，令牌强度足够）。
- NFR-04：关键操作具备审计日志（删帖、移除成员）。
- NFR-05：周菜单定稿、采购清单生成与批次规则在服务端**幂等**可重试；合并食材算法变更需版本或可预期说明，避免用户侧清单「无故跳变」。
- NFR-06：通知类能力需控制频率（防骚扰），并提供用户侧**免打扰**或关闭某类提醒的入口（可与全局通知设置合并）。
- NFR-07：**AI 一键菜单**：需约束输出范围（仅菜谱/食材建议，合规与食品安全提示由产品文案承担）；**失败降级**（超时/限流 → 规则推荐）；记录简要日志便于调优；成本控制（按家庭/按日限额等）实现期再定。
- NFR-08：视频上传与处理体验：单视频上传失败可重试；处理任务失败可重试；上传与转码流程可观测（任务日志/状态查询）。
- NFR-09：视频处理性能目标（MVP）：在常见 30-90s 竖版视频场景下，P95 转码完成时间 <= 90s（可按实际资源调整）；超时任务进入失败态并可人工/自动重试。
- NFR-10：视频规格与安全（V2 定版）：最大时长 **120 秒**、最大文件 **200MB**、仅允许 `mp4/mov`；上传文件需做基础内容安全检查。命中高危内容 -> `blocked`（不可发布）；疑似风险 -> `pending_review`（人工复核后可恢复）；低风险 -> 正常发布。

---

## 7. 数据模型建议（V2 草案）

> 以下为业务模型建议，不是最终 schema。

- `CommunityPost`
  - `id`, `authorId`, `title`, `content`, `videoUrl`, `coverUrl`, `videoStatus?`（`uploading` | `processing` | `ready` | `failed` | `blocked` | `pending_review`）, `durationSec?`, `dishId?`, `tags`, `status`, `createdAt`
- `CommunityMediaAsset`（建议新增，承载上传与转码任务）
  - `id`, `ownerId`, `originFileName`, `originMime`, `originSize`, `storageKeyRaw`, `storageKeyPlayback?`, `coverKey?`, `transcodeStatus`（`pending` | `processing` | `ready` | `failed`）, `errorCode?`, `createdAt`, `updatedAt`
- `CommunityComment`
  - `id`, `postId`, `authorId`, `content`, `createdAt`
- `CommunityLike`
  - `id`, `postId`, `userId`, `createdAt`
- `Family`
  - `id`, `name`, `ownerId`, `inviteCode`, `householdRelation`（`couple` | `roommates`）, `collaborationMode`（`couple_flexible` | `household_explicit`）, `hostOnlyEdit?`（bool，可选）, `createdAt`
- `FamilyMember`
  - `id`, `familyId`, `userId`, `role`, `createdAt`
- `FamilyMealPlan`
  - `id`, `familyId`, `menuWeekId`, `dishId`, `date`, `assigneeUserId?`, `status`（含 `done`）, `createdAt`
- `FamilyCheckin`
  - `id`, `familyId`, `userId`, `dishId?`, `content`, `mediaUrl?`, `createdAt`
- `FamilyMenuWeek`（或等价的周菜单头表）
  - `id`, `familyId`, `weekStart`, `status`（如 `active` / `archived`，`household_explicit` 下可扩展子状态）, `lastGeneratedAt?`（一键生成时间）, `createdAt`, `updatedAt`
  - 与 `FamilyMealPlan` 关系：**V2 定版唯一来源**——`FamilyMealPlan` 必须带 `menuWeekId` 外键并归属 `FamilyMenuWeek`；禁止第二套独立计划表写入。
- `FamilyDishWish`
  - `id`, `familyId`, `userId`, `dishId`, `note?`, `status`（如 `active` / `merged` / `archived`）, `createdAt`
- `FamilyShoppingList`
  - `id`, `familyId`, `menuWeekId?`, `mode`（`single` | `two_phase`）, `createdAt`, `updatedAt`
- `FamilyShoppingListItem`
  - `id`, `listId`, `ingredientKey`（合并键，如同一食材规范化名）, `displayName`, `quantity?`, `unit?`, `category?`, `batchIndex?`（0=第一波、1=第二波等）, `suggestedPurchaseDate?`, `excludedReason?`（如 `pantry`）, `purchasedAt?`, `purchasedByUserId?`, `sortOrder?`
- `FamilyMenuChangeLog`（可选，亦可用通用审计表）
  - `id`, `familyId`, `menuWeekId`, `actorUserId`, `action`, `summary`, `createdAt`
- `Gathering`（临时聚餐会话）
  - `id`, `creatorId`, `title?`, `headcount`, `status`（`collecting` | `generated` | `closed`）, `inviteCode` 或 `shareToken`, `expiresAt?`, `createdAt`, `updatedAt`
- `GatheringMember`
  - `id`, `gatheringId`, `userId`, `joinedAt`
- `GatheringWish`
  - `id`, `gatheringId`, `userId`, `dishId?`, `freeText?`, `createdAt`
- `GatheringMenu`（生成结果，可与 `Gathering` 内嵌 JSON 二选一）
  - `id`, `gatheringId`, `items`（日期或序号 + dishId/名称）, `beveragePresets[]?`, `beverageNote?`, `includeBeverageInShopping?`, `createdAt`
- `GatheringShoppingList` / `GatheringShoppingListItem`（结构可复用家庭清单字段或共用抽象）

---

## 8. 接口规划（V2）

### 8.1 社区
- `POST /api/v2/community/media/upload-init`（申请上传凭证/直传地址，返回 `assetId`）
- `POST /api/v2/community/media/:assetId/upload-complete`（上传完成回调，触发转码任务）
- `GET /api/v2/community/media/:assetId/status`（查询转码状态与错误信息）
- `POST /api/v2/community/media/:assetId/retry`（失败重试）
- `POST /api/v2/community/posts`（可引用 `assetId` 或外链 `videoUrl`）
- `GET /api/v2/community/posts`
- `GET /api/v2/community/posts/:id`
- `POST /api/v2/community/posts/:id/like`
- `DELETE /api/v2/community/posts/:id/like`
- `POST /api/v2/community/posts/:id/comments`

### 8.2 家庭
- `POST /api/v2/families`（请求体含 `householdRelation` 等，与 FR-09 对齐）
- `POST /api/v2/families/join`
- `GET /api/v2/families/:id`
- `PATCH /api/v2/families/:id`（名称、头像、`householdRelation`、`collaborationMode`、`hostOnlyEdit` 等家庭级配置）
- `POST /api/v2/families/:id/plans`（写入 `FamilyMealPlan`，必须携带 `menuWeekId`）
- `POST /api/v2/families/:id/checkins`
- `GET /api/v2/families/:id/menu-weeks`（按周列表或当前周）
- `POST /api/v2/families/:id/menu-weeks`（创建/获取指定 `weekStart` 的周菜单头）
- `PATCH /api/v2/families/:id/menu-weeks/:weekId`（周菜单编辑、保存；无强制定稿时可仅更新版本）
- `POST /api/v2/families/:id/menu-weeks/:weekId/generate-menu`（一键生成周菜单，请求体可含是否覆盖、餐次数量等）
- `POST /api/v2/families/:id/menu-weeks/:weekId/notify`（可选：提醒对方查看更新，弱通知）
- `GET/POST/PATCH/DELETE /api/v2/families/:id/wishes`（想吃清单；路径也可挂在 `menu-weeks` 下，择一保持一致）
- `GET /api/v2/families/:id/stats/dishes`（常做菜、距上次制作天数等，支持 `windowDays` 查询参数）
- `POST /api/v2/families/:id/menu-weeks/:weekId/shopping-list/generate`（由定稿/草案生成或刷新聚合清单）
- `GET /api/v2/families/:id/shopping-lists/:listId`
- `PATCH /api/v2/families/:id/shopping-lists/:listId`（条目勾选、排除、手动增删、批次与建议日调整）

### 8.3 临时聚餐
- `POST /api/v2/gatherings`（创建：人数、标题等）
- `POST /api/v2/gatherings/join`（邀请码/令牌加入）
- `GET /api/v2/gatherings/:id`
- `POST /api/v2/gatherings/:id/wishes`（提交想吃项）
- `POST /api/v2/gatherings/:id/generate-menu`（一键生成菜单+采购清单）
- `PATCH /api/v2/gatherings/:id`（编辑生成结果、酒水偏好、`includeBeverageInShopping` 等）
- `POST /api/v2/gatherings/:id/close`（结束/归档）

### 8.4 搜索融合
- `GET /api/v2/dishes/:id/videos`（内部视频优先）

---

## 9. 关键页面（V2）

- 社区首页（推荐流、热门、搜索）
- 发布页（发视频/发图文）
- 帖子详情页（评论互动）
- 家庭空间页（成员、计划、打卡）
- **家庭周菜单页**（当前周菜单随时可改、可选状态标签、拖拽排餐、心愿池、轻量变更记录）
- **家庭采购清单页**（合并食材、家里已有排除、单次/两阶段、建议购买日与勾选）
- **家庭常做菜统计**（可与周菜单内嵌或独立页）
- 情侣双人看板（可作为家庭空间特化视图：本周吃啥、谁买谁做、待购进度）
- **一键生成周菜单**（家庭：心愿+历史+AI 补全、生成后编辑）
- **临时聚餐**（建群、报菜、生成菜单与清单、酒水偏好）

---

## 10. 分阶段实施建议

### Phase 1：社区最小闭环
- 发帖、浏览、点赞、评论
- 本地视频上传 + 转码（ffmpeg）+ 封面抽帧 + 发布态管理
- 查菜页展示社区视频卡片（内部优先）

### Phase 2：家庭最小闭环
- 创建家庭、邀请加入、共享收藏
- 做饭计划 + 打卡
- **周菜单 + 弱确认协作（FR-18～FR-22）** + **聚合采购清单基础（FR-24、FR-25 手动部分）**

### Phase 2.5：采购节奏与统计增强
- 单次/两阶段采购、食材批次与建议购买日（FR-26、FR-27）
- 常做菜统计与一键加菜（FR-23）
- 通知与提醒（FR-28，可先站内后推送）

### Phase 2.6：智能菜单与临时聚餐
- 家庭 **FR-29** 一键周菜单（规则 + AI 补全、可编辑、失败降级）
- 临时聚餐 **FR-30～FR-33**（人数、报菜、生成、酒水偏好、生命周期）
- 可与 Phase 2.5 并行，视研发带宽将聚餐或 AI 拆到 Phase 3

### Phase 3：情侣增强与增长机制
- 双人任务、连续打卡、纪念日主题菜谱
- 基于历史的默认采购日偏好、日历导出等体验优化
- 社区激励体系（积分、勋章、贡献度）

---

## 11. 验收标准（DoD）

- 用户可发布并在社区检索到自己的做菜内容。
- 用户可从手机相册上传视频并完成发布：上传进度可见，转码完成后可播放，失败可重试。
- 查菜页在有内部视频时展示内部内容，无内部内容时展示外部兜底入口。
- 家庭成员可共享查看收藏与计划并完成打卡。
- 权限正确：非成员不可访问家庭私有数据。
- 创建家庭须选择 `householdRelation`；加入流程展示该类型并经被邀请人确认；主持人可更正类型（FR-09a）且成员收到通知。
- 主持人/成员可按周维护菜单：心愿菜、弱通知协作；**当前菜单**可驱动采购清单生成与勾选完成；**默认无强制「双方确认」门槛**。
- 单次或两阶段采购流程可用：批次与建议购买日可配置，关键事件有可用通知路径（至少站内，推送可分期）。
- 常做菜统计与计划、采购联动可用：统计仅基于 `FamilyMealPlan.status=done`，不使用打卡数据计数。
- **一键生成周菜单**（若上线 Phase 2.6）：生成结果可编辑，AI 异常时有规则兜底；菜品来源可区分心愿/历史/推荐。
- **临时聚餐**（若上线 Phase 2.6）：人数、多人报菜、生成菜单与食材清单、酒水偏好展示；权限与非成员隔离满足 NFR-03。

---

## 12. 实现清单（单人开发默认，Nest + ffmpeg）

> 本节用于直接落地开发，不再保留“待拍板”项。若后续策略变化，以代码和迁移脚本为准并回写本文档。

### 12.1 后端模块拆分（Nest）

- `community-media` 模块：上传凭证、媒体资产状态查询、重试转码。
- `community-posts` 模块：发帖、帖子列表/详情、互动。
- `jobs` 模块：队列消费者（转码、抽帧、失败重试）。
- `storage` 模块：对象存储适配（S3 兼容或云厂商 OSS/COS）。

### 12.2 对象存储与上传链路

- 客户端流程：
  1. 调 `POST /api/v2/community/media/upload-init` 获取 `assetId` 与直传信息。
  2. 手机相册选视频后直传对象存储（减少服务端带宽压力）。
  3. 上传成功后调 `upload-complete` 触发转码任务。
- 服务端职责：
  - 生成短时上传凭证（建议 5~15 分钟）。
  - 记录 `CommunityMediaAsset` 原始文件元信息。
  - 校验白名单格式与大小上限（V2 定版：仅 `mp4/mov`、<=120 秒、<=200MB；失败即拒绝后续处理）。

### 12.3 ffmpeg 任务与状态机

- 状态机（`CommunityMediaAsset.transcodeStatus`）：
  - `pending` -> `processing` -> `ready`
  - `pending/processing` -> `failed`（可重试）
- 任务编排（建议 BullMQ）：
  - Job A：转码主文件（H.264 + AAC，720p）
  - Job B：抽取封面（中间帧或第 1~3 秒内关键帧）
  - Job C：回写 `CommunityPost.videoUrl/coverUrl/videoStatus`
- 失败策略：
  - 自动重试 2~3 次（指数退避）
  - 仍失败标记 `failed`，前端展示“重新处理/重新上传”
  - 内容安全命中高危时标记 `blocked`，疑似风险标记 `pending_review`

### 12.4 推荐 ffmpeg 命令基线（MVP）

- 转码（示例）：
  - `ffmpeg -i input.mp4 -vf scale=-2:720 -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -movflags +faststart output_720p.mp4`
- 封面抽帧（示例）：
  - `ffmpeg -ss 00:00:02 -i input.mp4 -frames:v 1 -q:v 2 cover.jpg`
- 说明：
  - `-movflags +faststart` 便于移动端边下边播体验。
  - 后续可按机型与网络再扩展多码率（HLS）但不阻塞 V2 MVP。

### 12.5 数据库与字段落地（最小必需）

- `CommunityMediaAsset`：按 §7 新增表。
- `CommunityPost` 至少新增：
  - `videoStatus`（`uploading/processing/ready/failed/blocked/pending_review`）
  - `durationSec`（可选，优先从 ffprobe 或转码结果写回）
  - `videoUrl`、`coverUrl`（ready 后可播放）
- 索引建议：
  - `CommunityMediaAsset(ownerId, createdAt desc)`
  - `CommunityMediaAsset(transcodeStatus, updatedAt)`

### 12.6 前端/移动端交互最小集

- 发布页：
  - 默认 CTA：`从相册上传`
  - 显示上传进度、处理中占位、失败重试按钮
- 帖子卡片：
  - `processing`：显示“视频处理中”占位封面
  - `failed`：显示失败态，不进入推荐主流量池
  - `ready`：正常播放

### 12.7 可观测性与排障

- 关键日志：
  - `assetId`、用户 ID、原文件大小、转码耗时、失败原因
- 指标建议：
  - 上传成功率、转码成功率、P95 转码耗时、失败重试后恢复率
- 最小告警：
  - 连续 N 次转码失败
  - 队列积压超过阈值（例如 > 200）

### 12.8 本地开发与部署建议（单人可维护）

- 本地：
  - Docker 起 `redis`（队列）+ `minio`（对象存储）
  - 本机安装 `ffmpeg`，在启动时做可执行检查
- 生产：
  - API 与转码 worker 分离部署（避免 API 被 CPU 密集任务拖慢）
  - worker 可按 CPU 伸缩；必要时将转码任务路由到专用机器

