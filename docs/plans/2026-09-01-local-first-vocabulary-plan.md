# Read Frog 本地优先精简版：产品与技术实施方案

> 状态：Phase 0–2 已落地；Phase 3 及以后未开始
>
> 日期：2026-09-01
>
> 进度更新：2026-09-10
>
> 基线：`main` / `02ad422c`
>
> 范围：去账号与云服务、精简 Provider、自动收词、本地词库、来源追踪、Review、FSRS 复习、网页/PDF/YouTube 翻译
>
> 本文是实施方案。Phase 0–2 已在个人 fork 落地：不登录即可配置免费翻译或 BYOK，并用网页、划词和 YouTube 原生字幕翻译。词汇、FSRS 与 PDF Viewer 尚未开始。

## 当前进度（2026-09-10）

| 阶段      | 状态                     | 说明                                                                                                                                             |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 0   | 已完成（词表许可证待定） | `origin` 指向个人 fork，`upstream` 指向官方仓库，`upstream-mirror` 停在基线 `02ad422c`。词表许可证门槛未过，禁止启动 Phase 3。                   |
| Phase 1   | 已完成（有残留）         | 账号、Hosted AI、Notebase、Google Drive、遥测、官方 onboarding guide 已删除；`cookies` / `identity` 权限已去掉。生产构建不再要求 SaaS 环境变量。 |
| Phase 2   | 已完成                   | 八个 Provider 白名单、config v101 三角色 `providerAssignments`、失败关闭恢复页已落地。设置页运行时填写 API Key，不把 Key 打进包。                |
| Phase 3–7 | 未开始                   | 本地词库、AI 解析、FSRS、PDF Viewer、阈值校准均未开工。                                                                                          |

已验证：

- `pnpm type-check` 无错误。
- `pnpm build` 产出 `.output/chrome-mv3`。
- 真实 Chrome 中加载生产包后，Google / Microsoft 网页翻译可用。
- BYOK 走设置页 `chrome.storage` 中的运行时 Key；生产构建会拦截 `WXT_*_API_KEY`。

残留与未做：

- 方案 20.3 的独立 `localFirstCleanupVersion` storage cleanup 尚未落地；`GOOGLE_DRIVE_TOKEN_STORAGE_KEY` 常量仍在。
- `WXT_POSTHOG_*`、`WXT_GOOGLE_CLIENT_ID` 仍留在 env schema，生产构建可选且运行时未使用。
- 自定义 CSS 页仍有官方文档链接。
- Translation Hub 与 discord.com 站点翻译规则保留。
- 未发 `@read-frog/extension` changeset（功能删除属 major，暂不发版）。
- `SKIP_FREE_API=true` 下的完整测试套件、`fmt:check`、`lint`、Firefox/Edge 构建未作为本轮完成证据。

## 1. 结论与已确定决策

目标产品不是 Read Frog SaaS 的离线皮肤，而是一个真正本地优先的个人语言学习工具：clone 后安装依赖，选择免费翻译或填写自己的 API Key，即可使用。

本方案确认以下产品决策：

1. 删除登录、账号、套餐、Hosted AI、远端 Notebase、Google Drive 同步、遥测和官方产品回流。
2. 保留网页翻译、划词翻译、YouTube 原生字幕双语翻译与下载、本地配置、缓存和手工备份。
3. Provider 从三十多个收敛为免费翻译加六个 BYOK 入口。
4. 符合用户词汇阈值的英文词默认自动收录，不提供四档收词模式。
5. 自动收词默认静默运行，不为每个单词弹 Toast；只在入口显示待确认数量。
6. 用户可随时临时暂停自动收词，但“暂停”不是一种长期策略模式。
7. 每个词保留网页、YouTube、PDF 等来源和具体定位信息。
8. 词库使用浏览器原生 IndexedDB，由项目已存在的 Dexie 管理。
9. 按天归档是数据库查询视图，不按天创建物理文件。
10. 待确认与背词复习属于同一个“词汇”功能，但使用不同子页面。
11. 背词采用 FSRS 间隔重复算法，不自行发明记忆曲线。
12. 词库按 lemma 全局去重，FSRS 学习卡按 canonical sense 独立调度并锁定主来源语境。
13. 自动收录先进入“待确认候选”；候选不会产生 FSRS 记录，用户确认学习后才创建卡片。
14. 网页、YouTube、PDF 的现实曝光只增加遇见记录，不直接冒充一次成功记忆复习。
15. YouTube 有原生字幕时继续正常双语翻译；无字幕视频的 ASR 不纳入首版。
16. PDF 首版以本地 Viewer 内保留原页面结构和翻译覆盖层为目标，不承诺导出重排后的双语 PDF。
17. V1 不做多设备云同步；设置备份和词汇备份使用两个独立、版本化的 JSON 契约。

## 2. 产品目标与非目标

### 2.1 产品目标

- 不登录即可使用全部本地功能。
- 免费翻译服务无需 API Key 即可完成基础网页和字幕翻译。
- 配置一个低成本或免费额度的 LLM 后，可获得语境化词义解析。
- 用户阅读网页、观看 YouTube 或阅读 PDF 时，符合阈值的生词自动进入本地词库。
- 同一 lemma 全局只有一个词条，但可以保留多个语境义和多个来源。
- 每个需要学习的语境义都有独立且稳定的 FSRS 卡片。
- 用户可以高效清理误收词、标记已认识词，并通过 FSRS 完成每日学习。
- 所有核心数据可离线读取、导出和恢复。

### 2.2 非目标

- 不提供账号、团队、订阅、积分或云端 Notebase。
- 不保证 Google/Microsoft 免费翻译端点永久可用。
- 不把 LLM 作为单词难度、去重或数据库一致性的权威来源。
- 不把浏览过一次等同于记住一次。
- 不在 V1 实现扫描 PDF OCR、复杂公式重排或高保真双语 PDF 导出。
- 不在 V1 实现无字幕 YouTube 视频的远端转写。
- 不在 V1 实现多设备实时同步或复杂冲突合并。
- 不追求兼容所有历史 Provider；历史配置迁移后只保留目标白名单。

## 3. 现有能力与可复用边界

现有项目已经具备以下重要基础：

- 网页 DOM 分段、动态页面观察、双语/仅译文渲染。
- 划词翻译、节点翻译、页面翻译三类入口。
- background 翻译队列、批处理、限流、取消、重试和缓存。
- Google、Microsoft 免费翻译。
- 本地 BYOK Provider 与 AI SDK 调用。
- YouTube watch、live、embed、shorts 的字幕获取和双语渲染。
- Dexie 数据库和数据库清理任务。
- 类型化 extension messaging。
- 本地配置导入导出与自动备份。

这些能力继续作为底座。词汇系统不能侵入翻译 Prompt，也不能依赖翻译缓存是否命中；它通过独立的“真实曝光事件”接入网页、字幕和 PDF。

## 4. 目标架构

```text
┌──────────────────────────────────────────────────────────────┐
│ 内容入口                                                     │
│ Web content script │ YouTube subtitles │ Extension PDF viewer │
└───────────────┬──────────────────┬──────────────────┬─────────┘
                │                  │                  │
                ▼                  ▼                  ▼
       ┌────────────────────────────────────────────────┐
       │ Translation pipeline                           │
       │ queue / batching / retry / cache / providers   │
       └──────────────────────┬─────────────────────────┘
                              │
                              ▼
                     双语内容正常渲染
                              │
                              │ 只有真正显示/阅读后
                              ▼
       ┌────────────────────────────────────────────────┐
       │ VocabularyExposureBatch                        │
       │ source + locator + text + occurredAt            │
       └──────────────────────┬─────────────────────────┘
                              ▼
       ┌────────────────────────────────────────────────┐
       │ Background vocabulary writer                   │
       │ tokenize → lemma → difficulty → dedupe → write │
       └───────────────┬──────────────────────┬─────────┘
                       │                      │
                       ▼                      ▼
              IndexedDB / Dexie      async AI enrichment
                       │
             ┌─────────┼──────────┐
             ▼         ▼          ▼
          待确认     今日学习     词库/按天/来源
                       │
                       ▼
                 FSRS scheduler
```

跨上下文写入必须集中在 background。content script 只上报 exposure，不直接打开 Dexie 事务，避免网页、YouTube、PDF 多个上下文同时写同一条词条。

## 5. Provider 精简方案

### 5.1 最终保留清单

| 用户可见名称         | 内部类型              | 接入方式                    | 主要用途                           |
| -------------------- | --------------------- | --------------------------- | ---------------------------------- |
| Google Translate     | `google-translate`    | 现有无用户 Key 实现         | 默认网页/字幕翻译                  |
| Microsoft Translate  | `microsoft-translate` | 现有无用户 Key 实现         | Google 不可用时回退                |
| Grok                 | `xai`                 | `@ai-sdk/xai`               | 翻译、词义解析                     |
| DeepSeek             | `deepseek`            | `@ai-sdk/deepseek`          | 低成本翻译、词义解析               |
| Gemini               | `google`              | `@ai-sdk/google`            | Flash 类模型翻译、词义解析         |
| Kimi                 | `moonshotai`          | `@ai-sdk/moonshotai`        | 翻译、词义解析                     |
| Qwen                 | `alibaba`             | `@ai-sdk/alibaba`           | Flash 类模型翻译、词义解析         |
| GLM / 自定义兼容服务 | `openai-compatible`   | `@ai-sdk/openai-compatible` | GLM 及兼容 Chat Completions 的服务 |

保留独立 Kimi 和 Qwen Provider 是为了延续当前已存在的原生配置、模型参数和连接测试。GLM 使用通用 OpenAI-compatible 配置，避免为了单一 Provider 再增加 SDK。

模型 ID、免费额度和可用区域会变化。设置页可以给推荐预设，但必须允许用户编辑模型 ID；不能在产品文案中把某个模型永久标记为免费。

### 5.2 删除清单

删除以下专用 SDK 和对应 Provider schema、图标、默认配置、模型常量、设置 UI、迁移兼容分支和测试：

- `@ai-sdk/anthropic`
- `@ai-sdk/amazon-bedrock`
- `@ai-sdk/azure`
- `@ai-sdk/cerebras`
- `@ai-sdk/cohere`
- `@ai-sdk/deepinfra`
- `@ai-sdk/fireworks`
- `@ai-sdk/groq`
- `@ai-sdk/huggingface`
- `@ai-sdk/mistral`
- `@ai-sdk/open-responses`
- `@ai-sdk/openai`
- `@ai-sdk/perplexity`
- `@ai-sdk/replicate`
- `@ai-sdk/togetherai`
- `@ai-sdk/vercel`
- `ai-sdk-ollama`

同时删除当前聚合服务或非目标 Provider 类型：Jalapeno Cloud、Atlas Cloud、OpenRouter、MiniMax、SiliconFlow、Tensdaq、Volcengine、Groq、DeepInfra、Fireworks 等。

DeepL、DeepLX 也不进入精简版默认边界。基础免费翻译由 Google/Microsoft 承担，LLM 翻译由保留的 BYOK Provider 承担。

### 5.3 Provider 使用规则

配置不再要求每项功能选择不同 Provider。首版只暴露三个角色：

```ts
type ProviderAssignments = {
  translationProviderId: string
  subtitleProviderId: string
  vocabularyProviderId?: string
}
```

- `translationProviderId` 服务网页、节点、划词和 PDF 翻译。
- `subtitleProviderId` 默认跟随网页翻译 Provider，但允许单独修改。
- `vocabularyProviderId` 服务本地词典和生词解析，必须是 LLM；未配置时仍收词，只显示“待解析”。
- 生词解析失败不能阻塞翻译或 exposure 写入。
- 翻译和生词解析默认关闭推理模式，避免为简单任务消耗推理配额。
- 设置页提供连接测试和明确错误，不自动尝试用户没有配置的 Provider。

免费翻译沿用现有的一次性安装探测：首次配置先探测 Google，可达时选择 Google，否则选择 Microsoft。运行中的单次请求失败只显示错误和切换建议，不自动更换 Provider，避免同一页面混用 Provider、污染缓存或掩盖持续故障。

### 5.4 现有能力收口矩阵

Provider 精简不能只迁移三个新字段。v101 必须逐项处理所有现有 Provider 引用：

| 现有能力                  | 目标处理                       | 目标 Provider           |
| ------------------------- | ------------------------------ | ----------------------- |
| Page translation          | 保留                           | `translationProviderId` |
| Node translation          | 保留                           | `translationProviderId` |
| Selection translation     | 保留                           | `translationProviderId` |
| PDF translation           | 新增                           | `translationProviderId` |
| Video subtitles           | 保留                           | `subtitleProviderId`    |
| Built-in dictionary       | 替换为本地词汇解析             | `vocabularyProviderId`  |
| Input translation         | 删除                           | 无                      |
| LLM language detection    | 删除，保留本地 basic detection | 无                      |
| Note Suggestion           | 删除，由待确认词库替代         | 无                      |
| Custom Actions            | 删除通用编辑器和执行链         | 无                      |
| Hosted AI / AI transcript | 删除                           | 无                      |

选择删除 Input Translation、Note Suggestion 和通用 Custom Actions，是为了让精简版围绕网页、PDF、YouTube 和词汇学习四条主线收口。v101 migration、目标 config schema、defaults、capability registry、路由和测试必须在同一实现批次更新，最终对迁移结果执行完整 `configSchema.parse`，禁止失败后静默回落并覆盖用户配置。

## 6. 用户水平与收词阈值

### 6.1 默认用户画像

当前默认画像为“大学英语六级备考”：水平略低于 CET-6，希望自动收集 CET-6 核心词和更难但常见的词。

默认范围是“CET-6 备考”，规则为：

- 排除基础高频词和明确属于高中/CET-4 核心范围的词。
- 收录标记为 CET-6、考研、托福/雅思或更高难度的词。
- 收录不在考试词表但词频低于阈值、且不是专有名词的通用词。
- 用户标记为“我认识”的 lemma 永久排除后续自动新增。
- 用户标记为“误收”的专名、缩写或噪音进入 ignored 集合。

用户仍可修改“收哪些词”，但不需要选择收词行为模式：

```ts
type VocabularyConfig = {
  threshold: {
    preset: "cet4-plus" | "cet6-plus" | "frequency-custom"
    customFrequencyRank?: number
  }
  dailyNewCards: number
  dailyAnalysisLimit: number
  desiredRetention: number
  storeOriginalSentence: boolean
  allowSentenceForAiAnalysis: boolean
  sources: {
    web: boolean
    youtube: boolean
    pdf: boolean
  }
}
```

默认 `preset = "cet6-plus"`、每日新卡 10、每日自动 AI 解析 20，三个来源都开启，`storeOriginalSentence = true`，`allowSentenceForAiAnalysis = true`。`cet4-plus` 用于发现基础范围内仍不认识的词，`frequency-custom` 允许按词频边界调整。设置页应明确说明 AI 解析只发送包含目标词的一句原文。临时暂停状态放在 session storage，不进入长期配置。

CET-6 与 CEFR B2 不能硬编码为等价。词表记录可以同时携带 `examTags`、`cefr` 和 `frequencyRank`，阈值规则根据独立字段判断。

### 6.2 难度判断必须本地确定

本地词表至少需要：

```ts
type LexiconRecord = {
  lemma: string
  forms: string[]
  frequencyRank?: number
  cefr?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  examTags: Array<"HIGH_SCHOOL" | "CET4" | "CET6" | "POSTGRAD" | "IELTS" | "TOEFL">
  isProperNoun?: boolean
}
```

词表来源、再分发许可证、构建产物大小、CET/词频覆盖率和人工标注基准是 Phase 0 的实施硬门槛；未通过时不能启动自动收词开发。LLM 不负责给每次 exposure 判定难度；否则同一个词会因为模型波动反复进出词库。

### 6.3 后续词汇量测试

词汇量测试不是 V1 阻塞项。后续实现时：

- 30–50 题自适应分层抽样。
- 覆盖多个词频带，而不是只测 CET 词表。
- 加入伪词，修正用户“看起来眼熟就选认识”的偏差。
- 结果展示估计区间，不展示伪精确数字。
- 测试结果只推荐阈值，用户仍可修改。
- 用户持续标记“认识/不认识”的行为可用于调整推荐阈值，但不能在后台悄悄改变当前规则。

## 7. 自动收词行为

### 7.1 固定产品行为

不提供 `关闭 / 仅手动 / Smart / 全部` 四档。主流程固定为：

1. 内容被翻译并真正展示给用户。
2. 提取英文 token 和 lemma。
3. 符合当前难度阈值、未被标记 known/ignored 的词自动写入词库。
4. 新词状态为 `candidate`，立即出现在待确认和词库中，但不创建 FSRS card。
5. 后续遇到同一 lemma 不创建第二个词条，只增加来源和 encounter。
6. 用户选择“保留学习”后，entry 变成 `learning`；canonical sense 准备完成后才创建 FSRS card。
7. 用户在“待确认”页面将认识的词标记为 known，将误收内容标记为 ignored。

可以提供“暂停本页收词”和“暂停至浏览器重启”作为临时控制，但不持久化成复杂模式。

### 7.2 网页 exposure

网页不能在翻译请求发出时记录，因为请求可能：

- 命中缓存；
- 被取消；
- 属于预加载范围；
- 翻译后没有进入视口；
- 因页面切换被替换。

记录条件：翻译节点已经成功渲染、当前文档可见、节点至少 50% 进入视口并累计可见 1000ms。快速滚动、后台标签页和预加载节点不记录。相同页面、相同 paragraph hash、相同 lemma 只记录一次 encounter。

来源信息：

```ts
type WebLocator = {
  paragraphHash: string
  textQuote: string
  canonicalizationVersion: number
}
```

URL、标题和域名由 background 从 `sender.tab` 推导，不信任 content payload。定位不依赖 CSS selector，因为动态页面 selector 容易失效。恢复来源时打开 URL，并用 `textQuote` 尝试高亮；失败时仍显示本地保存的原句。

### 7.3 YouTube exposure

现有字幕翻译会提前处理当前时间之后的 fragment，因此不能在 `translateSubtitles()` 完成时收词。

记录条件：

- cue 已经显示在双语字幕 UI；
- 标签页可见、字幕开关已开启且当前不是广告；
- 视频当前时间落在 cue 的 `[start, end]`；
- cue 至少实际显示约 800ms，避免用户 seek 快速扫过时批量污染词库；
- 暂停在该 cue 上也视为已曝光。
- seek、切轨、广告和字幕隐藏会重置当前 cue 的曝光计时器。

来源信息：

```ts
type YoutubeLocator = {
  videoId: string
  title: string
  channelName?: string
  startMs: number
  endMs: number
  isLive: boolean
  capturedWallClock?: number
  captionText: string
}
```

background 根据 `sender.tab.url` 校验普通 watch/embed/shorts 的 videoId；content 提供的 title/channel 只作为显示元数据。来源身份不能由未校验 payload 任意指定。

来源按钮打开：

```text
https://www.youtube.com/watch?v={videoId}&t={floor(startMs / 1000)}s
```

普通 watch 视频按时间参数回跳。live/DVR 时间轴可能失效，因此同时保存 `isLive` 和捕获 wall-clock，来源页把 live 回跳明确标记为“尽力恢复”。

YouTube 原文字幕、译文字幕、样式设置和 SRT 下载全部保留。删除账号后，只移除“无字幕视频请求官方服务端转写”这一条分支。

### 7.4 PDF exposure

PDF V1 使用扩展自带 Viewer。记录条件为对应页的 text layer 已完成解析、文档可见、翻译区域至少 50% 进入视口并累计可见 1000ms。

来源信息：

```ts
type PdfLocator = {
  documentHash: string
  fileName: string
  pageNumber: number
  normalizedBoundingBox?: [number, number, number, number]
  pageRotation: 0 | 90 | 180 | 270
  textQuote: string
}
```

bounding box 使用相对 PDF 页面尺寸的归一化坐标，不保存当前 viewport 像素。数据库不保存 PDF 二进制。再次打开来源时让用户重新选择同一文件，并通过 hash 关联历史记录。以后可选择使用 File System Access handle，但不能把它作为跨浏览器 V1 前提。

### 7.5 划词 exposure

划词翻译是最强的用户意图信号。被划选的单词如果符合基本英文规则，无论难度阈值如何，都应收录；如果用户只是选择整段，则仍执行正常阈值过滤。

## 8. 词汇处理管线

content script、字幕 UI 和 PDF Viewer 统一发送：

```ts
type VocabularyExposureBatch = {
  sourceKind: "web" | "youtube" | "pdf"
  captureMethod: "automatic" | "selection" | "manual"
  originalText: string
  translatedText?: string
  occurredAt: number
  locator: WebLocator | YoutubeLocator | PdfLocator
}
```

background 单写者执行：

```text
语言检测
  → 英文 tokenize
  → Unicode/大小写规范化
  → 本地词形还原
  → URL/数字/符号/停用词过滤
  → 专有名词和缩写过滤
  → 本地难度词表判断
  → known/ignored 过滤
  → transaction 全局去重
  → 写 source/context/entry/encounter
  → 异步加入持久化 AI 解析队列
```

实施约束：

- token、lemma、主键、阈值和去重全部确定性执行。
- LLM 返回的 lemma 不能覆盖本地主键。
- 所有写命令，包括 exposure、候选确认、FSRS 评分、删除和恢复，都由 background 处理。
- 类型化消息同时使用运行时 Zod schema，验证 sender、文本长度、时间范围和 locator。
- 同一批 exposure 先内存去重，再在事务内处理 unique constraint 冲突。
- 每批最多 50 个候选 token，原句截断到 500 个 Unicode code points，避免超长页面阻塞 service worker。
- background 中先同步注册 message handler，再异步初始化词表和数据库。
- background 同步注册 alarm listener；service worker 被回收后，通过持久 job、lease 和 `browser.alarms` 继续 enrichment。

## 9. 存储选型

### 9.1 选择 IndexedDB + Dexie

选择理由：

- 浏览器扩展原生支持，Chrome、Edge、Firefox 均可用。
- 支持索引、事务、游标、范围查询和较大数据量。
- 项目已经依赖 Dexie 并存在 `AppDB`，无需增加新的持久化技术。
- 适合按 lemma、日期、due、source、status 等多维查询。
- 不需要本地 server，不需要文件锁，不需要 WASM 数据库运行时。

### 9.2 不选择其他方案

`chrome.storage.local`：只适合配置和小型状态。大数组每次修改需要重写整个值，缺少复杂索引和事务，不适合作为词库主存储。

按天 JSON 文件：扩展无法把普通文件当成可靠数据库；去重、并发写入、来源查询和恢复都困难。按天应该是逻辑索引，不是物理分片。

SQLite：需要 WASM、OPFS/虚拟文件系统、额外打包和跨浏览器兼容处理。当前数据规模和查询复杂度不足以抵消这些成本。

一个常驻 JSON：适合备份，不适合运行时写入。单次损坏会影响全部数据，也无法高效增量查询。

### 9.3 存储职责分配

| 数据                              | 存储位置                    |
| --------------------------------- | --------------------------- |
| Provider、API Key、语言、词汇阈值 | WXT `local:` config storage |
| 词条、语境义、来源、encounter     | IndexedDB / Dexie           |
| FSRS card、review log             | IndexedDB / Dexie           |
| 翻译和摘要缓存                    | 现有 IndexedDB / Dexie 表   |
| 正在运行的短生命周期状态          | memory / `session:` storage |
| 设置备份                          | 用户主动导出的设置 JSON     |
| 词汇备份                          | 用户主动导出的词汇 JSON     |

API Key 只属于设置备份，默认不导出；用户显式选择“包含 API Key”时才导出，并显示安全警告。词汇备份永远不包含 API Key。

## 10. Dexie 数据模型

现有数据库版本为 v4。词汇功能新增 v5，只增加八张表，不回写或修改 v1–v4 定义。

### 10.1 `vocabularyEntries`

```ts
type VocabularyEntry = {
  id: string
  language: "eng"
  normalizedLemma: string
  displayLemma: string
  status: "candidate" | "learning" | "known" | "ignored" | "suspended"
  cefr?: string
  examTags: string[]
  frequencyRank?: number
  normalizationVersion: number
  firstSeenAt: number
  firstSeenDayKey: string
  lastSeenAt: number
  encounterCount: number
  analysisState: "pending" | "partial" | "ready" | "failed" | "not-configured"
  createdAt: number
  updatedAt: number
}
```

索引：

```text
id,
&[language+normalizedLemma],
status,
firstSeenDayKey,
lastSeenAt,
analysisState
```

`&[language+normalizedLemma]` 是全局唯一约束。大小写、复数、时态变化先归一化到 lemma。

### 10.2 `vocabularySenses`

```ts
type VocabularySense = {
  id: string
  entryId: string
  senseKey: string
  canonicalContextId: string
  contextIds: string[]
  partOfSpeech: string
  ipa?: string
  contextualMeaning: string
  commonMeaning?: string
  collocations: string[]
  synonyms: string[]
  antonyms: string[]
  pitfall?: string
  contextHash: string
  providerId: string
  modelId: string
  promptVersion: number
  generatedAt: number
}
```

索引：

```text
id,
entryId,
&[entryId+senseKey],
canonicalContextId,
*contextIds,
contextHash
```

一个词可以有多个 sense，但相似上下文不能无限生成新 sense。首版每个 entry 最多保留三个自动 sense，更多语境只作为 encounter 保存。sense 不复制原句，通过 `contextIds` 关联支持该义项的语境，并从中选择一个 `canonicalContextId`；这样同一句话不会为每个 lemma 重复存储，也能在删除来源时判断是否存在替代语境。

### 10.3 `vocabularySources`

```ts
type VocabularySource = {
  id: string
  sourceKey: string
  kind: "web" | "youtube" | "pdf"
  identityVersion: number
  title: string
  url?: string
  domain?: string
  videoId?: string
  channelName?: string
  isLive?: boolean
  documentHash?: string
  fileName?: string
  firstSeenAt: number
  lastSeenAt: number
}
```

索引：

```text
id,
&sourceKey,
kind,
domain,
videoId,
documentHash,
lastSeenAt
```

`sourceKey` 示例：

- Web：规范化 URL 的 hash。
- YouTube：`youtube:{videoId}`。
- PDF：`pdf:{documentHash}`。

Web URL 规范化时移除 fragment、UTM 等跟踪参数，以及名称包含 `token`、`auth`、`session`、`signature` 的敏感 query；其余可能影响正文身份的 query 保留。原始未清洗 URL 不写入数据库。

selection 不是来源类型，而是 encounter 的 `captureMethod`；它继续归属于发生选择的 Web、YouTube 或 PDF source。

### 10.4 `vocabularyContexts`

```ts
type VocabularyContext = {
  id: string
  sourceId: string
  contextKey: string
  originalText: string
  translatedText?: string
  locator: WebLocator | YoutubeLocator | PdfLocator
  contextHash: string
  serializationVersion: number
  capturedAt: number
  dayKey: string
  timeZoneAtCapture: string
  utcOffsetMinutes: number
}
```

索引：

```text
id,
&contextKey,
sourceId,
contextHash,
dayKey,
[sourceId+capturedAt]
```

`contextKey = hash(sourceId + stableLocator + contextHash + serializationVersion)`。原句最长保存 500 个 Unicode code points；多个词共享同一个 context。

### 10.5 `vocabularyEncounters`

```ts
type VocabularyEncounter = {
  id: string
  entryId: string
  sourceId: string
  contextId: string
  captureMethod: "automatic" | "selection" | "manual"
  dedupeKey: string
  dedupeVersion: number
  dayKey: string
  occurredAt: number
  timeZoneAtCapture: string
  utcOffsetMinutes: number
}
```

索引：

```text
id,
&dedupeKey,
entryId,
sourceId,
contextId,
captureMethod,
dayKey,
[dayKey+entryId],
[entryId+occurredAt]
```

`dedupeKey = hash(entryId + contextId + captureMethod + dedupeVersion)`。

同一个词在同一段落重复渲染不会增加 encounter；在另一网页、另一字幕时间或另一 PDF 页出现时会留下新记录。

### 10.6 `vocabularyAnalysisJobs`

```ts
type VocabularyAnalysisJob = {
  id: string
  jobKey: string
  entryId: string
  contextId: string
  providerId: string
  modelId: string
  promptVersion: number
  state: "pending" | "running" | "failed" | "completed"
  leaseOwner?: string
  leaseExpiresAt?: number
  attempts: number
  nextRunAt: number
  lastError?: string
  createdAt: number
  updatedAt: number
}
```

索引：

```text
id,
&jobKey,
entryId,
contextId,
state,
nextRunAt,
[state+nextRunAt],
leaseExpiresAt
```

`jobKey = hash(entryId + contextId + promptVersion + providerId + modelId)`。alarm 唤醒后只领取 `pending/failed` 且到期的 job；running job 必须持有有限期 lease，service worker 中断后可被重新领取。

### 10.7 `reviewCards`

```ts
type ReviewCard = {
  id: string
  entryId: string
  senseId: string
  primaryContextId: string
  queue: "active" | "suspended"
  state: "new" | "learning" | "review" | "relearning"
  due: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  lastReview?: number
  createdAt: number
  updatedAt: number
}
```

索引：

```text
id,
entryId,
&senseId,
primaryContextId,
due,
state,
queue,
[queue+due],
[state+due]
```

每个 sense 最多一张 ReviewCard。`primaryContextId` 在建卡时锁定，之后新增 encounter 不自动轮换卡片正面；用户可显式更换主语境。

### 10.8 `reviewLogs`

```ts
type ReviewLog = {
  id: string
  attemptId: string
  cardId: string
  entryId: string
  senseId: string
  reviewedAt: number
  rating: "again" | "hard" | "good" | "easy"
  stateBefore: string
  stateAfter: string
  scheduledDays: number
  elapsedDays: number
  durationMs?: number
}
```

索引：

```text
id,
&attemptId,
cardId,
entryId,
senseId,
reviewedAt,
[senseId+reviewedAt]
```

review card 更新和 review log 新增必须在同一个 Dexie transaction 中完成。`attemptId` 由 UI 每次作答生成，用唯一索引保证双击、重试或消息重复投递只评分一次；写入时还需校验 card 的 `updatedAt`，拒绝过期页面覆盖新状态。

### 10.9 日期处理

- `occurredAt`、`firstSeenAt`、`due` 存 Unix 毫秒时间戳。
- `dayKey` 在捕获时按用户本地时区生成 `YYYY-MM-DD`。
- 已生成的 dayKey 不因用户后来切换时区而重排，保证归档稳定。
- 每条 context/encounter 保存捕获时区和 UTC offset；备份恢复时不重算历史 dayKey。

## 11. 去重与状态规则

### 11.1 全局词条去重

- 主键语义为 `language + normalizedLemma`。
- `agencies`、`agency` 合并到 `agency`。
- 同形异义词共享 entry，通过 sense 区分。
- FSRS 调度单元是 sense，不是 lemma；不同义项不会共享 stability/difficulty。
- 专有名词与普通词冲突时不自动覆盖，交给待确认页处理。
- 短语和 phrasal verb 不在第一版自动提取，避免 token 规则和单词规则混杂；后续单独增加 phrase entry 类型。

lemma normalization、URL canonicalization、context serialization 和 encounter dedupe 都保存版本号。规则升级时不能直接用新规则解释旧 key；应通过显式 migration 或 alias 表合并，避免同一来源/词条突然产生重复记录。

### 11.2 用户标记

| 操作           | 结果        | 后续自动收词                           |
| -------------- | ----------- | -------------------------------------- |
| 自动捕获       | `candidate` | 继续记录来源，不进入 FSRS              |
| 保留学习       | `learning`  | 继续记录来源；sense 就绪后创建独立卡片 |
| 我认识         | `known`     | 不再自动加入学习，也不新增 encounter   |
| 误收/专名/缩写 | `ignored`   | 完全跳过，不再记录                     |
| 暂停学习       | `suspended` | 保留来源和历史，不进入复习队列         |
| 恢复学习       | `learning`  | 恢复原 sense cards                     |

将“我认识”和“误收”分开非常重要：前者是用户能力信息，后者是词法过滤信息。未来调整阈值时，known 仍有效；未来改进 tokenizer 时，ignored 可重新评估。

entry 状态改成 known、ignored 或 suspended 时，必须在同一 transaction 中把该 entry 的全部 review cards 的 `queue` 改为 `suspended`；恢复 learning 时再改回 `active`。FSRS 自身的 card state 不承担产品暂停语义。

### 11.3 删除

普通 UI 不提供硬删除作为主操作。硬删除会丢失 Review 历史和来源，且之后可能再次自动加入。

需要清理隐私数据时提供：

- 删除某个 encounter；
- 删除某个 source 及其 encounters；
- 彻底删除一个词和复习历史；
- 清空全部词汇数据。

所有批量删除必须有预览数量和确认对话框。

删除 source 必须在一个 background transaction 中级联 contexts、encounters 和 analysis jobs。对于引用被删 context 的 sense：若同一 sense 还有其他 context，则选择新的 canonical context 并同步更新 ReviewCard；否则删除该 sense 和对应卡片/Review logs。默认不保留无法证明已脱离来源的 AI 释义，确保“按来源删除”真的清除原文及其派生上下文。

## 12. AI 词义解析

### 12.1 触发规则

- 新 lemma 首次收录后进入异步解析候选，不阻塞收词。
- 相同 lemma 在明显不同语境出现时可追加 sense。
- 普通重复 encounter 不再调用模型。
- 每批处理 10–20 个新词，受 Provider 限流控制。
- 自动解析默认每日最多 20 个，按“手动划词 > 多来源重复 > encounter 次数 > 最近出现”排序；用户主动打开或确认某词时可立即解析，不受自动额度阻塞。
- 每个待解析语境都创建 durable analysis job；entry 的 `analysisState` 只是聚合展示，job 表才是任务事实源。
- 用户未配置 vocabulary Provider 时，entry/context 仍完整创建，`analysisState = not-configured`，不创建不可执行 job。
- 设置 Provider 后可以批量补全待解析词。
- background 在启动、收到新 exposure、设置 Provider 和 alarm 唤醒时尝试领取到期 job；lease 过期的 running job 可安全重投。

### 12.2 最小上下文

只发送：

- 目标词；
- 一句原文；
- 可选的一句译文；
- 目标输出语言；
- 严格结构化 schema。

不发送完整网页、完整字幕、完整 PDF、URL 或用户浏览历史。

### 12.3 输出字段

```ts
type VocabularyAnalysisOutput = {
  lemma: string
  ipa?: string
  partOfSpeech: string
  contextualMeaning: string
  commonMeaning?: string
  collocations: string[]
  synonyms: string[]
  antonyms: string[]
  pitfall?: string
}
```

展示目标：

> **agency** /ˈeɪ.dʒən.si/ n.
>
> 此处：能动性，主动影响自身处境的能力。
>
> 常见义：代理机构。
>
> 搭配：a sense of agency；exercise one’s agency。
>
> 易错：心理学、社会学语境通常不是“中介机构”。

默认不生成长词源。词源属于按需展开功能，且必须和常用义解析分开缓存。

### 12.4 缓存与可复现性

解析缓存键包含：

```text
lemma + contextHash + promptVersion + providerId + modelId
```

保存 `promptVersion`、Provider 和 model，便于之后识别旧解析，不因 Prompt 改动自动重写用户已经编辑过的内容。用户编辑后的 sense 标记为人工内容；后台 job 只能创建新版本或等待用户确认，不能直接覆盖。

## 13. 页面与信息架构

收词确认和记忆复习属于同一个“词汇”产品入口，但不应该塞进同一任务页面。它们的操作节奏相反：收词确认是列表式批量清理，记忆复习是一次只处理一张卡。中文 UI 固定使用这两个名称，代码内部使用 `triage` 和 `review`，避免“Review”一词同时指两件事。

建议路由：

```text
/vocabulary              → 词汇概览
/vocabulary/inbox        → 待确认
/vocabulary/study        → 今日学习
/vocabulary/library      → 全部词库
/vocabulary/archive      → 按天归档
/vocabulary/sources      → 按来源浏览
/vocabulary/settings     → 阈值与学习设置
```

这些页面共享同一个 VocabularyShell 和顶部 Tab，因此用户感知上仍是“一个词汇页面”。

### 13.1 词汇概览

显示：

- 今日新增；
- 待确认；
- 今日到期卡片；
- 学习中；
- 已认识；
- 最近来源；
- “开始今日学习”和“处理待确认”两个主按钮。

### 13.2 待确认

采用高密度列表而不是翻卡：

- 单词、词性、语境义；
- 第一次来源和最近来源；
- 今日出现次数；
- 保留、认识、误收三个快捷操作；
- 批量选择和键盘快捷键；
- 按日期、来源、难度、解析状态过滤；
- 展开查看全部 encounters。

新词自动进入 `candidate`，不创建 ReviewCard。用户选择“保留学习”后，canonical sense 准备完成才创建卡片；“我认识”和“误收”不会留下 FSRS 日志。未配置 LLM 或解析失败时，词条保留为“待解析”，用户可以手工填写主释义后建卡，不能创建背面为空的卡片。

### 13.3 今日学习

使用专注的单卡界面：

今日学习先展示到期卡片，再按每日新卡额度选择 candidate。用户不必提前清空待确认页：candidate 第一次进入学习流程时先显示“保留学习 / 我认识 / 误收”三选一；只有“保留学习”会继续显示卡片内容和 FSRS 四档评分。

新 candidate 优先级固定为：手动划词 > 不同来源重复遇见 > encounter 次数 > 最近出现 > 难度。其余候选保留在待确认列表，不因每日新卡上限丢失。

卡片正面：

- 单词；
- 来源原句，目标词高亮；
- 来源标识和可点击定位；
- 可选发音。

卡片背面：

- 当前语境义；
- 常见义；
- 2–3 个高频搭配；
- 易错提示；
- 原句译文。

正反面绑定 ReviewCard 的 `senseId + primaryContextId`，普通 encounter 不自动轮换卡片语义或原句。

评分按钮：

- 忘记（Again）
- 困难但想起（Hard）
- 记得（Good）
- 很容易（Easy）

UI 必须明确：完全没想起来要点“忘记”，不能点“困难”。否则 FSRS 会误以为用户成功回忆，产生过长间隔。

### 13.4 全部词库

- 搜索 lemma、释义、来源标题。
- 按 candidate/learning/known/ignored/suspended 过滤。
- 编辑解析、合并误拆词条、修改状态。
- 查看首次发现、最近遇见和全部来源时间线。
- 导出所选词为 CSV/Markdown。

### 13.5 按天归档

日期页展示两组信息：

- 当天首次发现的词；
- 当天再次遇到的已有词。

同一个词只会出现在一个“首次发现日”，但可以在多个“再次遇到”日期中出现。这比把词物理复制到每天的文件更符合全局去重和学习历史需求。

### 13.6 按来源浏览

来源卡片显示：

- 网页标题与域名；
- YouTube 视频标题和频道；
- PDF 文件名；
- 收录词数量；
- 最近阅读时间。

进入来源详情后按出现顺序展示词和原句。YouTube 按时间排序，PDF 按页码排序，网页按 encounter 时间排序。

## 14. FSRS 复习系统

### 14.1 算法选择

采用 `ts-fsrs`，不实现自定义 SM-2 变体。Anki 已将 FSRS 作为现代调度选项；FSRS 使用难度、稳定性和可提取性估计记忆状态，并以目标保持率调节复习间隔。

调度对象是稳定的 canonical sense。lemma 级 entry 只负责全局去重和状态，不能把多个语义压进同一份记忆参数。

初始参数：

- desired retention：`0.90`；
- 每日新词：`10`；
- 到期复习优先于新词；
- 每日复习软上限：`100`，允许用户继续；
- maximum interval：使用库的保守默认值；
- 学习/重学 step 保持在一天以内；
- 参数优化在累计至少数百次有效 Review 后再开放。

FSRS 参考：

- [Anki FSRS Deck Options](https://docs.ankiweb.net/deck-options.html?highlight=FSRS)
- [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)

### 14.2 现实曝光与 FSRS 的关系

网页或字幕中再次看到一个词，只增加 encounter 和 `lastSeenAt`，不自动生成 Good Review。

原因：现实曝光没有验证用户是否主动回忆成功。可以在学习页展示“过去 7 天遇见 4 次”，也可以提升新卡优先级，但不能直接修改 FSRS stability/due。

### 14.3 调度事务

每次评分必须原子完成：

1. 读取当前 card。
2. 根据当前时间和 rating 计算下一状态。
3. 更新 reviewCards。
4. 插入 reviewLogs。
5. 提交 transaction。

重复点击通过一次性 review attempt ID 去重。页面刷新后从数据库重建队列，不依赖 React 内存状态。

## 15. 通知与静默行为

默认采用静默记录：

- 不为每个自动收录词弹 Toast。
- 不发送系统通知。
- popup 或“词汇”侧边栏入口显示待确认数量，例如 `12`。
- 完成一页翻译后不额外弹“记录了 N 个词”。
- 用户主动划词并点击加入时，可以显示一次短 Toast，因为这是明确操作反馈。
- AI 解析失败不打断阅读，仅在词汇页显示失败数量和重试入口。
- 首次启用自动收词时显示一次 onboarding，说明“已在后台静默收词，可在词汇页确认”。
- popup 可以显示非打断式“本次阅读新增 N 个候选”，但不在网页上主动弹出。

每词弹窗会遮挡网页和字幕、形成注意力中断，并在一段包含多个难词时造成 Toast 风暴，因此不作为选项保留。

## 16. YouTube 双语翻译保留范围

必须保留并回归测试：

- watch、live、embed、shorts；
- YouTube 当前选中的字幕轨；
- 自动字幕与人工字幕；
- 原文 + 译文双行显示；
- original-only / translation-only；
- 字幕样式设置；
- seek、倍速、广告切换；
- 源字幕和翻译字幕下载；
- free Provider 与 BYOK Provider；
- 本地/BYOK AI segmentation 可选开启，失败时回退确定性 segmentation；
- 实际显示 cue 的 exposure；
- 点击来源跳回对应视频时间。

为减少隐藏 LLM 花费，V1 删除 content-aware subtitle summary；正常字幕翻译不额外生成视频摘要。账号删除后的明确降级是：没有原生字幕时不再调用官方 Hosted transcript。后续 ASR 作为独立 Provider 类型设计，不能重新引入账号系统。

## 17. PDF 翻译方案

### 17.1 V1 Viewer

新增 extension page，例如 `/pdf-viewer.html`：

1. 用户从本地选择 PDF。
2. 计算 document hash。
3. 本地打包的 PDF.js worker 将当前窗口附近页面懒渲染到 canvas。
4. 读取 text content 和 item 坐标。
5. 按 block/line 聚合文本，复用 background translation queue。
6. 原始 canvas 始终保留。
7. 翻译作为独立 overlay/text layer 展示。
8. 支持原文、双语、仅译文三种阅读显示。
9. 当前页进入视口后才进行 exposure。

PDF.js worker、CMap 和 standard fonts 必须随扩展本地打包并满足 MV3 CSP，禁止运行时 CDN。翻页、关闭 Viewer 或切换文件时取消未完成解析和翻译请求。密码 PDF 显示受控密码输入，损坏/超大文件显示可恢复错误，扫描 PDF 明确提示“暂不支持 OCR”，不能静默空白。

### 17.2 “保持原版结构”的定义

V1 保证：

- 页尺寸、图片、表格、公式和原始视觉布局由 canvas 原样保留；
- 翻译与原文字块保持对应坐标；
- 用户可以在覆盖层和原始层之间切换；
- 不修改原 PDF 文件。

V1 不保证：

- 中文翻译长度与英文文本框完全等长；
- 复杂多栏、脚注和浮动图注都能自动重排；
- 扫描 PDF 可直接提取文本；
- 导出一个字体完整、可复制、无溢出的新 PDF。

### 17.3 后续阶段

- OCR 插件化，只对没有 text layer 的页面按需执行。
- 块级手工纠正和阅读顺序编辑。
- 双栏阅读而不是覆盖层。
- 生成 HTML/Markdown 阅读稿。
- 最后才评估双语 PDF 导出和字体嵌入。

## 18. 本地备份与恢复

### 18.1 两类备份契约

设置与词汇数据分别导出：

- `read-frog-settings-backup`：沿用现有配置备份，API Key 仅在用户明确选择时包含。
- `read-frog-vocabulary-backup`：永不包含 API Key，负责词库、来源、调度和 Review 历史。

词汇备份格式：

```ts
type VocabularyBackup = {
  format: "read-frog-vocabulary-backup"
  version: 1
  exportedAt: string
  timeZone: string
  appVersion: string
  entries: VocabularyEntry[]
  senses: VocabularySense[]
  sources: VocabularySource[]
  contexts: VocabularyContext[]
  encounters: VocabularyEncounter[]
  analysisJobs: VocabularyAnalysisJob[]
  cards: ReviewCard[]
  reviewLogs: ReviewLog[]
}
```

运行时仍以 IndexedDB 为准；JSON 只是可移植快照。

### 18.2 导出类型

- 设置 JSON：恢复配置；是否包含 API Key 由用户显式选择。
- 词汇 JSON：恢复词汇、来源、调度和 Review 历史，不含 API Key。
- CSV：用于查看/导入其他背词工具，不作为完整恢复格式。
- Markdown：适合人工阅读或主动发给 Grok/Kimi 等模型生成学习总结。

### 18.3 恢复策略

- 导入前做格式/schema migration，展示各表数量、版本和冲突预览。
- 在内存或临时 Dexie 库中按 `[language+normalizedLemma]` 和 `sourceKey` 建立 `oldId → canonicalId` 映射。
- 使用映射重写 sense、context、encounter、job、card 和 ReviewLog 的全部外键，并验证无悬空引用。
- entry 冲突优先保留更晚的 `updatedAt`，但 known/ignored 不被旧备份降级为 learning。
- ReviewLog 通过 `attemptId` 去重；同一 sense 的 ReviewCard 冲突必须选择较新的 `updatedAt`，旧日志只合并不重放。
- 校验通过后，在目标数据库覆盖全部八张词汇表的一次 Dexie transaction 中提交；任何异常都会 abort，目标库保持原状。
- 导入的 running analysis job 清除 lease 并重置为 pending；没有可用 Provider 时保留为不可执行状态。
- API Key 与浏览器 session 永不随词汇备份自动恢复。

## 19. 隐私与安全边界

- 词库、来源和 Review 历史只保存在浏览器 profile 的 IndexedDB。
- 数据不是操作系统级加密；能够读取浏览器 profile 或扩展数据目录的人可能读取它。
- API Key 保存在 extension local storage，UI 必须说明这个边界。
- 默认备份不包含 API Key。
- AI 解析只发送目标词和一句上下文，不发送 URL、完整页面、完整 PDF 或完整字幕。
- PDF 文件本体不写入数据库。
- 提供按来源事务级级联删除，原句只存在 contexts；sense/job/card 的来源引用必须同时删除、重定向或脱敏。
- 删除 PostHog、卸载问卷和所有非必要遥测后，不再创建 analytics install ID。
- 扩展卸载、浏览器 profile 清理或手动清除站点数据都会丢失 IndexedDB；词汇页应定期提示用户创建备份。
- context 单句限长 500 code points，重复句只存一次；显示数据库用量，在达到软阈值时引导导出或清理旧 encounters，不能静默删除 Review 数据。

## 20. 配置与数据库迁移

### 20.1 Config v101

当前配置版本为 v100。新增 `v100-to-v101.ts`：

- 删除 Hosted Provider 和不再支持的 Provider rows。
- retained feature 已指向白名单 Provider 时保留原选择。
- Page/Node/Selection/PDF/Video 指向被删除 Provider 时，确定性回退到内联的 Microsoft 免费 Provider；迁移完成后的设置页可再执行 Google 可达性探测。
- Dictionary/Vocabulary 优先选择第一个已配置且启用的保留 LLM；没有可用 LLM 时保持空值和“待配置”，不伪造 Provider。
- 被删除能力的 Provider 路径直接删除，不迁移到无关角色。
- 删除 `notebaseConnection`、Hosted plan、Google Drive sync 和 analytics 配置。
- 新增翻译、字幕和可选词汇解析三个角色的 `providerAssignments` 配置；词汇功能尚未启用时只保存选择，不发请求。
- 按 5.4 能力矩阵删除 Input Translation、LLM Language Detection、Note Suggestion、Custom Actions 配置路径。
- 保留用户已有目标语言、页面样式、字幕样式、快捷键和站点规则。

迁移必须是冻结快照：所有目标值内联，输入输出使用 `any`，不得 import 当前 constants、factory、共享 types 或 i18n。

执行前先保留原始 v100 快照。v101 结果必须完整通过目标 `configSchema.parse` 才能覆盖当前配置；失败时保留旧配置和快照、进入本地恢复页并报告具体无效路径，禁止写入 DEFAULT_CONFIG。

### 20.2 Config v102

词汇功能进入 Phase 3 时再新增 `v101-to-v102.ts`：

- 增加 `vocabulary` 配置，复用 v101 中可选的 `vocabularyProviderId`。
- 默认阈值设为 `cet6-plus`，同时支持 `cet4-plus` 和 `frequency-custom`。
- 默认每日新卡为 10、每日自动 AI 解析为 20，FSRS 目标保持率为 0.90。
- 不增加收词模式枚举。
- 未配置 LLM 时，`vocabularyProviderId` 保持空值。

将 Provider 减法和词汇默认值拆成 v101/v102，可以避免两类错误混在一个迁移中，测试也更聚焦。

### 20.3 独立 storage cleanup

Config migration 只能处理 `CONFIG_STORAGE_KEY` 内的数据，不能清理单独的 storage items。Phase 1 必须新增幂等的一次性 cleanup，例如 `local:localFirstCleanupVersion`：

- 删除 Google Drive token 和 last synced config/meta；
- 删除 Notebase pending save；
- 删除 analytics install ID、daily feature cache 和 auth cache group；
- 删除 Hosted AI session/cache；
- cleanup 只在 v101 config 成功解析并写回后执行；
- 每个 key 单独容错，完成后写入 cleanup version；重复运行不报错。

### 20.4 Dexie v5

Dexie v5 新增 entries、senses、sources、contexts、encounters、analysisJobs、reviewCards 和 reviewLogs 八张表，不迁移翻译缓存，不删除旧表。词汇库没有历史数据，因此不需要 upgrade callback 批量重写。

未来字段变更继续增加 v6、v7，不能修改 v5 的 schema snapshot。

### 20.5 迁移测试

- v100 各种 Provider 组合迁移到 v101。
- 当前功能指向被删除 Provider。
- 没有任何 LLM Key。
- 已配置 Grok/DeepSeek/Gemini/Kimi/Qwen/GLM。
- 已配置 Hosted dictionary/Notebase。
- Page、Node、Selection、Video、Input、Language Detection、Dictionary、Note Suggestion 和 Custom Actions 的历史 Provider 引用。
- disabled、重复和已删除 Provider rows。
- v101 结果通过完整 `configSchema.parse`，初始化不能回落 DEFAULT_CONFIG。
- 迁移幂等性。
- 完整 v1 → latest 连续 migration 测试。
- v101 → v102 不引入无效 vocabulary Provider。
- Dexie v4 数据库升级 v5 后缓存仍可读。
- 独立 storage cleanup 首次、重复、中途失败重试和 cleanup version 测试。

## 21. 分阶段实施计划

### Phase 0：分叉与保护基线

状态：已完成（词表许可证待定）。个人 fork、`upstream` remote、基线 `02ad422c` 与 `upstream-mirror` 已建立。步骤 6 的可再分发词表许可证仍是 Phase 3 开工门槛。

目标：在大规模减法前建立可回溯和上游同步边界。

步骤：

1. 添加 `upstream` remote 指向 `mengxi-ream/read-frog`。
2. 记录当前上游基线 commit。
3. 建立上游镜像分支，不在镜像分支做个人产品修改。
4. 个人 `main` 只选择性吸收上游翻译、字幕、浏览器兼容和安全修复。
5. 禁止未来自动 merge 上游账号、Hosted AI、Notebase 和商业化改动。
6. 确定可再分发的 CET/词频/lemma 数据源，验证许可证、构建体积、字段覆盖率和人工标注准确率。

验收：能够明确回答个人分支基于哪个 upstream commit，且工作树无未归属变更；词表门槛通过后才允许启动 Phase 3。

### Phase 1：删除 SaaS 边界

状态：已完成（有残留）。运行时账号、Hosted AI、Notebase、Drive、遥测、官方 guide 已删除；独立 storage cleanup version、部分 env 占位和官方文档链接仍见「当前进度」。

目标：无需登录、没有云服务调用、没有遥测。

步骤：

1. 先写并测试 config v101 migration。
2. 删除账号菜单、Auth client、Hosted status、套餐/配额 UI。
3. 删除 Hosted stream 分支，保留 local/BYOK stream。
4. 删除 Notebase、后台 pending save 和配置字段。
5. 删除 Google Drive sync，保留 manual export 和 local backup。
6. 删除 PostHog、analytics messages、卸载问卷和远端产品入口。
7. 删除 `cookies`、`identity` 权限。
8. 执行版本化、幂等的独立 storage cleanup。
9. 清理环境变量、依赖、locale、测试和失效图片。

验收：

- 全仓无 `authClient`、`backgroundOrpcClient`、`hostedAi`、`notebase`、`googleDrive`、`posthog` 运行时引用。
- 未配置 AI 时仍能用 Google/Microsoft 翻译网页和 YouTube 字幕。
- 配置 BYOK 后页面、划词、字幕翻译正常。

### Phase 2：Provider 收口

状态：已完成。八个入口、v101 三角色赋值、失败关闭恢复、GLM OpenAI-compatible 预设与自定义 model ID 已落地。词汇角色只保存选择，不发请求。

目标：设置页只出现目标八个入口。

步骤：

1. 收缩 provider types、schema、model factory 和 capability registry。
2. 删除非目标 SDK。
3. 重做 Provider 列表和快速配置页。
4. 为 GLM 提供 OpenAI-compatible 预设。
5. 支持自定义 model ID，不依赖长期固定列表。
6. 按能力矩阵把 retained paths 映射到翻译、字幕、词汇解析三个角色，并删除其余路径。
7. 对迁移后的完整配置执行 schema parse，不允许静默回退默认配置。
8. 测试每个保留 Provider 的 factory/schema；有真实 Key 时另跑 live smoke，无 Key 明确记为 `N/A`。

验收：clone 后无需账号，单页完成语言、Provider、Key 和模型配置。

### Phase 3：本地词库基础

状态：未开始。词表许可证门槛未过，不得开工。

目标：自动收词、全局去重、来源保存、待确认页面可用。

步骤：

1. Dexie v5 八表 schema 与 background repository/command service。
2. Config v102 migration 与 vocabulary 默认设置。
3. 本地词表加载、tokenize、lemma 和难度判断。
4. 类型化且带运行时校验的 `recordVocabularyExposureBatch` message。
5. background command service、transaction 去重、source/context 关系和隐私级联。
6. 网页渲染/视口 exposure。
7. YouTube 实际 cue exposure 和时间定位。
8. 待确认、词库、按天、按来源页面。
9. JSON/CSV/Markdown 导出。
10. 批量 candidate → learning/known/ignored/suspended 操作。

验收：同一词跨网页、跨日期、跨视频只创建一个 entry，来源和 encounter 完整保留；Phase 3 只创建 candidate，不创建任何 FSRS card。

### Phase 4：AI 解析

状态：未开始。

目标：新词异步生成简短、语境准确的卡片内容。

步骤：

1. 本地结构化 output schema。
2. durable enrichment job、lease、alarm 唤醒和后台续跑。
3. 批量请求、限流、重试和缓存。
4. 未配置/失败状态 UI。
5. canonical sense 创建、来源 provenance、解析编辑和禁止覆盖用户编辑内容。

验收：翻译不等待解析；关闭网络或模型失败时，词和来源仍完整保存。

### Phase 5：FSRS 学习

状态：未开始。

目标：今日学习、评分、调度和日志完整闭环。

步骤：

1. 引入并封装 `ts-fsrs`。
2. sense-level reviewCards/reviewLogs repository。
3. candidate 三选一确认、canonical sense 建卡、今日到期查询和新词配额。
4. 卡片正反面和四档评分。
5. 原子调度 transaction 和重复提交保护。
6. 旧 candidate 幂等建卡、学习统计和来源回看。

验收：刷新、扩展重启、跨日后 due 和历史保持一致；现实 exposure 不改变 Review 评分。

### Phase 6：PDF Viewer

状态：未开始。

目标：本地 PDF 双语阅读并接入同一词汇系统。

步骤：

1. PDF.js Viewer 与本地文件选择。
2. worker、CMap、standard fonts 本地打包和 MV3 CSP 验证。
3. 懒渲染、取消、密码/损坏/超大/扫描文档受控失败。
4. text layer/block 聚合。
5. translation queue 接入。
6. 原始 canvas + 双语 overlay。
7. 归一化坐标、rotation 来源定位。
8. PDF exposure、按来源删除和备份隐私控制。

验收：文本型、多栏、含图片 PDF 的原页面结构保留；扫描 PDF 明确提示暂不支持 OCR。

### Phase 7：阈值校准与词汇量测试

状态：未开始。

目标：用测试和长期反馈改善推荐阈值。

步骤：

1. 自适应测试与伪词校正。
2. 估计区间和阈值推荐。
3. known/unknown 反馈统计。
4. 用户确认后才应用新阈值。

## 22. 测试与验证矩阵

### 22.1 静态与单元测试

- `SKIP_FREE_API=true pnpm test`
- `pnpm fmt:check`
- `pnpm type-check`
- `pnpm lint`
- `pnpm build`
- `pnpm build:edge`
- `pnpm build:firefox`
- migration chain 与 scoped migration tests。
- Dexie repository、source/context unique index、并发 upsert、级联删除和 transaction tests。
- tokenizer、lemma、difficulty、known/ignored tests。
- enrichment job lease、alarm、worker 中断、重复投递和换 Provider tests。
- sense-level FSRS rating、due、attemptId 幂等和时区 tests。
- 备份 ID remap、外键完整性、冲突、abort 回滚 tests。
- 用户可见改动包含 `@read-frog/extension` changeset，changeset 内容使用 conventional commit 格式。

`free-api.test.ts` 在本地 AI 验证时按仓库规则设置 `SKIP_FREE_API=true`，其跳过必须明确报告，不能说成已验证真实免费服务。

BYOK Provider 的 factory/schema 测试与真实 API smoke 分开报告。未提供 Key 时 live smoke 为 `N/A`，禁止用 mock 成功替代真实连接结论。

### 22.2 真实浏览器 QA

网页：

- 静态文章、SPA、无限滚动、iframe。
- 缓存命中、停止翻译、重新翻译。
- 节点 50% 可见不足 1000ms、后台标签页和快速滚动不收词；累计达到阈值后收词。
- 同一节点重新挂载不重复 encounter。
- 来源 URL 和 text quote 可恢复。

YouTube：

- watch/live/embed/shorts。
- 人工字幕、自动字幕、切换字幕轨。
- seek、倍速、暂停、广告前后。
- 字幕隐藏、切轨、广告和 seek 会重置 exposure timer。
- lookahead 已翻译但未显示的 cue 不收词。
- 显示 cue 记录准确 start/end。
- 来源跳转回对应时间。
- live/DVR 来源按 wall-clock 尽力恢复，失败时受控降级。
- 双语显示和 SRT 下载无回归。
- BYOK AI segmentation 失败回退确定性 segmentation；V1 不发 content-aware summary 请求。

词汇页面：

- bulk candidate → learning/known/ignored/suspended。
- 按天、按来源和搜索。
- 重复 lemma、多义 sense、多来源。
- 删除 source 后其他 source 不受影响。
- 删除 source 后 contexts/jobs 和唯一来源 senses/cards/logs 清除；有替代 context 时正确重定向。
- 备份、清空、恢复后数量和 due 一致。

FSRS：

- 同 lemma 不同 sense 拥有独立 Again/Hard/Good/Easy 状态和 due。
- 刷新与扩展重启。
- 本地午夜和夏令时边界。
- 双击、重试和重复消息只生成一个 attemptId log。

PDF：

- 纯文本、双栏、图片、表格、公式。
- 旋转页、不同页尺寸、密码、损坏、超大和扫描 PDF；不支持场景显示明确受控错误。
- worker/CMap/font 不访问 CDN，翻页和关闭时取消未完成任务。
- 翻译覆盖层切换和原始 canvas 不受影响。

### 22.3 隐私验证

- 未配置 LLM 时无分析请求。
- 分析请求不包含 URL、完整页面或 PDF 二进制。
- 默认备份不含 API Key。
- 删除 source 后相关 encounter 和上下文清除。
- 删除 source 后 sense/job/card 中不残留对应原句或派生私密语境。
- 删除 analytics 后无 PostHog 或官方 API 请求。

## 23. 完成定义

只有同时满足以下条件，才能称为“本地优先精简版”完成：

- clone 后不登录即可使用网页和 YouTube 双语翻译。
- 免费翻译与目标 BYOK Provider 均有明确配置路径。
- 非目标 Provider 的代码、依赖、UI、测试和配置残留已清理。
- 账号、Hosted AI、Notebase、Google Drive 和遥测完整删除。
- 符合 CET-6 备考阈值的词默认静默收录。
- 同一 lemma 全局唯一，每个 canonical sense 独立学习，来源、日期和时间点可追溯。
- 待确认、学习、词库、按天、按来源各自可用。
- FSRS Review 在扩展重启和数据恢复后保持一致。
- YouTube 正常双语翻译没有因词汇功能产生回归。
- PDF 文本型文档可在本地 Viewer 双语阅读并记录页码来源。
- 所有核心数据可导出并安全恢复。
- 自动化检查与真实浏览器 QA 均有结果记录，未运行项目明确列出。

## 24. 已确定的默认值

1. 免费翻译只在首次配置时探测：Google 可达则选择 Google，否则选择 Microsoft；运行时不静默切换。
2. 词汇范围默认 `cet6-plus`，用户可改为 `cet4-plus` 或自定义词频。
3. 每日新卡默认 10，FSRS desired retention 默认 0.90，到期复习优先。
4. 新词先进入 candidate；未确认 candidate 不创建 ReviewCard。
5. 自动收词静默运行，只显示入口计数和一次性 onboarding，不逐词 Toast。

Provider 白名单、IndexedDB/Dexie、来源/语境关系、后台 durable jobs、页面拆分和 sense-level FSRS 路线由本文直接作为实施基线。
