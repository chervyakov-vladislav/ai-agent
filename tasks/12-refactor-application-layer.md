# Task 12 — Рефакторинг `src/application/`: чистота слоя и вынос RAG-механики в pipelines

|                 |                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Приоритет**   | 3                                                                                                                                        |
| **Зависимости** | —                                                                                                                                        |
| **Открывает**   | Чистую интеграцию rules-sync (Task 02: поиск правил встраивается в retrieval-пайплайн), выделение BullMQ-очередей, будущий доменный слой |

## Контекст

Оба use-case и часть пайплайнов нарушают правила `src/application/AGENTS.md`. Диагноз по фактическому коду:

| Где                                | Нарушение                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `analyze-pr.use-case.ts`           | Глобальный `logger` из `@shared/infrastructure/logger` (зависимость `logger` объявлена и передаётся, но не используется); `parallelLimit` передаётся и мёртв; RAG-механика (кеш → эмбеддинг → гибридный поиск → дедуп → реконструкция) внутри оркестратора; магические числа `20`, `3000`, `2500`/`250`; мёртвый импорт, TODO |
| `repo-sync.use-case.ts`            | Глобальный `logger`; `withRetry` из `@shared/infrastructure/clients/http-client.utils`; `pLimit` в бизнес-слое; `Date.now()` как syncId; magic numbers (3 ретрая, 2000 мс); TODO автора «вынести в пайплайны: embeddingsPipeline и indexingPipeline»                                                                          |
| `pr-review.pipeline.ts`            | Тип `Logger` из инфраструктуры; сломанный алиас `'shared/infrastructure/logger'` (без `@`); `const item = diff`; полный дамп LLM-ответов в `info`                                                                                                                                                                             |
| `analyze-pr.module.ts`             | Сломанный алиас `'shared/infrastructure/logger'` — работает случайно из-за wildcard `*` в tsconfig                                                                                                                                                                                                                            |
| `contracts/code-analysis.types.ts` | `QdrantChunkPoint`/`QdrantChunkPayload` (с `shard_key`) — специфика БД в ядре; `DocumentInput.pageContent` — структура LangChain `Document` в ядре                                                                                                                                                                            |
| `analyze-pr.ports.ts`              | Мёртвый `LlmPort` (пайплайн использует свой `PrReviewLlmPort`)                                                                                                                                                                                                                                                                |
| `code-processing/`                 | Эталонно чистый пайплайн, но контейнер называется `procenning.container.ts` (опечатка)                                                                                                                                                                                                                                        |

Эталон, на который равняемся: `pipelines/code-processing/processing.pipeline.ts` — только порты и контракты, ноль инфраструктуры.

**Принципиальное правило:** `*.module.ts` и `*.container.ts` — composition root, им импортировать инфраструктуру можно и нужно; `*.use-case.ts`, `*.pipeline.ts`, `contracts/`, `ports/` — нельзя.

## Объём работ

Фазы независимы по merged-порядку, каждая завершается зелёным `lint` + `typecheck`.

### 1. LoggerPort и чистка логгера

- Создать `src/application/ports/logger.port.ts`:

```typescript
export interface LoggerPort {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}
```

Pino ему удовлетворяет структурно — отдельный адаптер не нужен: контейнеры передают pino-инстанс как `LoggerPort`.

- `analyze-pr.use-case.ts`: убрать импорт глобального `logger`, деструктурировать `logger` из зависимостей и использовать его; решить судьбу `parallelLimit` (использовать или убрать из интерфейса и `module.ts`).
- `repo-sync.use-case.ts`: `logProgress` и вызовы переводят на инжектированный логгер (добавить `logger: LoggerPort` в `SyncDependencies`, передать в `repo-sync.module.ts`).
- `pr-review.pipeline.ts`: тип `Logger` → `LoggerPort`, алиас `'shared/…'` убрать.
- Починить алиас в `analyze-pr.module.ts` → `'@shared/infrastructure/logger'`.

### 2. Контракты: убрать утечки Qdrant и LangChain

- `QdrantChunkPoint` → `ChunkPoint`, `QdrantChunkPayload` → `ChunkPayload` — нейтральные имена, без `shard_key` (это деталь Qdrant).
- Qdrant-специфика (включая `shard_key`, формат `vector`) → `src/modules/vectorstore/qdrant.types.ts`, маппинг qdrant-поинт ↔ `ChunkPoint` в `qdrant.service.ts`/`qdrant.adapter.ts`.
- `DocumentInput.pageContent` → нейтральное имя (`content`); структуру LangChain-документа собирает langchain-адаптер.
- Переименования делать через tsc/IDE (rename symbol) — компилятор покажет все точки правки. Затронет `analyze-pr.ports.ts`, `vectorstore`, `langchain`, `ast-parser`.

### 3. `pipelines/code-retrieval/` — RAG-поиск из `analyze-pr`

По образцу `code-processing/`: `retrieval.pipeline.ts` + `retrieval.contracts.ts` + `retrieval.container.ts`.

- Перенести цикл: кеш эмбеддингов → генерация вектора → `findHybridSimilarNodeIds` → сбор `parentIds` с дедупом → `getPoints` → `reconstructChunks`. Сплит длинного запроса (`splitSearchQuery`) — туда же.
- Магические числа → константы пайплайна (`retrieval.constants.ts`) или `envConfig`: минимальная длина блока (20), порог длины запроса (3000), chunkSize (2500) / chunkOverlap (250).
- `analyze-pr.use-case.ts` остаётся тонким оркестратором: дифф → обход файлов (skip удалённых/коротких блоков) → retrieval-пайплайн → pr-review-пайплайн → публикация ревью.

### 4. `pipelines/indexing/` — индексация из `repo-sync`

Закрывает авторский TODO «вынести в пайплайны и сделать embeddingsPipeline и indexingPipeline».

- Перенести пофайловую обработку: sha-кеш (`storedFiles`) → контент → `processFilePipeline` → эмбеддинги small/large → `indexChunks`; `pLimit(parallelLimit)` уходит в пайплайн; генерация `syncId` (`Date.now()`) — тоже.
- `repo-sync.use-case.ts` остаётся: busy-статус (`statusPort`), получение дерева файлов, запуск пайплайна, `cleanupOldSyncData`, сводный лог.

### 5. Ретраи — в адаптер

- Убрать `withRetry` из `repo-sync.use-case.ts` (прямой импорт `@shared/infrastructure/clients/http-client.utils`).
- Ретраи `getFileContent` — в github-модуле (`github.service.ts`, где уже живёт retry-механика для GitHub API). Числа (3 / 2000 мс) — в `github.constants.ts`.

### 6. Чистка мелочей

- Удалить мёртвый `LlmPort` из `analyze-pr.ports.ts`.
- `const item = diff` → использовать `diff` напрямую.
- Дампы `JSON.stringify(result, null, 2)` в `info` → `debug`.
- `git mv src/application/pipelines/code-processing/procenning.container.ts` → `processing.container.ts` (+ импорт).
- Убрать мёртвые закомментированные импорты (`analyze-pr.use-case.ts`, `repo-sync.use-case.ts`).
- TODO-комментарии: BullMQ-очереди пометить как отложенное (не в этой задаче), TODO про Graph Search и reranking — сослаться на Task 03, затем удалить из кода.
- Опционально, если не тянет на конфликт: `getFileContent` дублируется в `PullRequestSourcePort` и `RepoSourcePort` — общий `FileSourcePort` в `ports/`.

## Технические заметки

- **BullMQ-очереди — вне этой задачи** (TODO в `repo-sync` фиксируем как отложенное; воркеры `interface/workers/` уже существуют, их не трогаем).
- Доменный слой не заводим — только чистка `application/`.
- Чистый рефакторинг: поведение системы не меняется, новые фичи не добавляются.
- Task 02 (rules-sync) желательно делать после этой: `findRelevantRules` встроится в retrieval-пайплайн, а не в раздутый use-case.
- Проверка после каждой фазы: `npm run lint` + `npm run typecheck` (тестов в репо нет).

## Критерии приёмки (DoD)

- [ ] `grep -r "shared/infrastructure" src/application` находит совпадения только в `*.module.ts` / `*.container.ts`
- [ ] В `src/application/contracts/` нет имён `Qdrant*` и поля `pageContent`
- [ ] `analyze-pr.use-case.ts` и `repo-sync.use-case.ts` — тонкие оркестраторы (~≤50 строк каждый)
- [ ] RAG-механика живёт в `pipelines/code-retrieval/`, индексация — в `pipelines/indexing/`, параметры — в constants/env, не в теле функций
- [ ] Контейнер переименован в `processing.container.ts`
- [ ] Поведение неизменно: синхронизация идемпотентна, ревью на тестовом PR генерируется как раньше
- [ ] `lint` + `typecheck` чистые
