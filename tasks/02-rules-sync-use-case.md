# Task 02 — Use case `rules-sync`: правила в Qdrant + подстановка в ревью

|                 |                                                        |
| --------------- | ------------------------------------------------------ |
| **Приоритет**   | 2                                                      |
| **Зависимости** | Task 01 (нужны `skills/web-best-practices/rules/*.md`) |
| **Открывает**   | severity-гейтинг комментариев, метрики ревью           |

## Контекст

Второй канал доставки корпуса правил: индексация правил из Task 01 в отдельную коллекцию Qdrant и подбор релевантных правил под каждый блок диффа в `analyze-pr`. Сейчас правила ревью захардкожены в промпте (`review.pipeline.prompt.ts`) — они будут заменены динамическим поиском по корпусу.

Делаем по образцу `repo-sync` (порты → модуль → DI → контроллер).

## Объём работ

### 1. Контракты

`src/application/contracts/rules.types.ts`:

```typescript
export type RuleImpact = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ReviewRule {
  ruleId: string; // slug из имени файла: query-waterfalls
  title: string;
  impact: RuleImpact;
  tags: string[];
  section: string; // префикс: query | form | router | ...
  content: string; // полное тело правила (без frontmatter)
}
```

### 2. Use case `src/application/use-cases/rules-sync/`

По образцу `repo-sync`: `rules-sync.ports.ts`, `rules-sync.module.ts`, `rules-sync.use-case.ts`.

- Читает `skills/web-best-practices/rules/*.md` (кроме `_`-файлов), парсит frontmatter — **переиспользовать парсер из Task 01** (вынести в общую точку или `shared/utils`, дублирование недопустимо)
- **Одно правило = один документ, без чанкинга** (правила атомарны по построению)
- Текст для BM25: `title + tags + content`
- Dense-вектор — через существующий `EmbeddingGeneratePort` (Ollama/nomic)
- Идемпотентность по образцу repo-sync: `sync_id` + `cleanupOldSyncData`
- **Запуск синхронно в use case** — правил десятки, BullMQ-очередь не нужна (зафиксировать решение комментарием)

### 3. Vectorstore

Расширить `src/modules/vectorstore/`:

- `qdrant.service.ts`: `indexRules(collection, rules, syncId)` и `searchRules(collection, queryEmbedding, queryText, opts)` — поиск по паттерну `hybridSearch` (тот же RRF через Query API)
- Payload правила: `{ ruleId, title, impact, tags, section, content, sync_id }` — **не** запихивать в `ChunkMetadata`, это отдельный payload-тип (аналогия: `QdrantChunkPayload`)
- `ensureCollection` уже параметризован — коллекция `code_review_rules` (имя в константу)
- Payload-индекс на `section` (keyword) и `impact` (keyword)

### 4. Адаптер и порт поиска правил

- `RulesVectorStorePort` (index + search) в `rules-sync.ports.ts`, адаптер в `modules/vectorstore/`
- В `analyze-pr.ports.ts` добавить:

```typescript
export interface RulesSearchPort {
  findRelevantRules(queryText: string, fileExtension: string): Promise<ReviewRule[]>;
}
```

Адаптер: эмбеддинг запроса через существующий `EmbeddingCachePort`/`EmbeddingQueryPort` (с кешем), поиск в `code_review_rules`, **метаданные-фильтр**: расширение файла → допустимые секции (`.tsx`/`.ts` → `react|query|form|router|table|security|a11y|bundle`; неизвестный тип → без фильтра).

### 5. Интеграция в `analyze-pr`

- `analyze-pr.use-case.ts`: на каждый файл диффа — `findRelevantRules(block.searchQuery, file.extension)` (один раз на файл, не на каждый queryChunk)
- `DiffWithContext` (`contracts/code-analysis.types.ts`) получает поле `relevantRules: ReviewRule[]`
- `review.pipeline.prompt.ts`: секция правил в промпте — title + impact + content, с инструкцией «ссылайся на ruleId в замечании»
- Захардкоженные правила из промпта убрать

### 6. HTTP-интерфейс

`POST /rules-sync` — контроллер + Zod-схема по образцу `repo-sync.controller.ts` / `repo-sync.schema.ts`, регистрация в `root-router.ts`.

## Технические заметки

- Severity-гейтинг (CRITICAL/HIGH → инлайн-комментарий, MEDIUM/LOW → summary) — **опция этой задачи**, можно вынести в отдельный шаг, если объём распухнет
- Правила глобальные (не per-repo), коллекция одна
- Если правила не нашлись (пустой корпус) — пайплайн работает как сейчас, без секции правил в промпте

## Критерии приёмки (DoD)

- [ ] `POST /rules-sync` индексирует все правила из Task 01; повторный вызов идемпотентен (старые sync_id чистятся)
- [ ] В Qdrant коллекция `code_review_rules` с payload-индексами на `section` и `impact`
- [ ] На тестовом PR с «водопадом» из двух `useQuery` в `.tsx` ревью содержит замечание со ссылкой на `query-waterfalls`
- [ ] Правила не подмешиваются к файлам нерелевантных типов (SQL-дифф не получает `form-*` правила)
- [ ] Промпт больше не содержит захардкоженных правил
- [ ] `lint` + `typecheck` чистые
