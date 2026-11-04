# Task 03 — Heuristic reranker: дедуп + скоринг + top-K для код-контекста

|                 |                                                                      |
| --------------- | -------------------------------------------------------------------- |
| **Приоритет**   | 2–3 — не зависит от Task 01/02, можно делать параллельно             |
| **Зависимости** | нет                                                                  |
| **Открывает**   | cross-encoder через `RerankerPort` (если golden-set покажет потолок) |

## Контекст

RRF-фьюжен dense+BM25 **уже работает** server-side в Qdrant (`hybridSearch` в `qdrant.service.ts`, `fusion: 'rrf'`). Не хватает второй ступени перед сборкой промпта. Проблема помечена в коде:

```typescript
// src/application/use-cases/analyze-pr/analyze-pr.use-case.ts:130
const content = codeSearching.reconstructChunks(points); // убрать дубли через reranking
```

Несколько `queryChunk` из одного блока диффа собирают `parent_id` в `Set` (дедуп по ID есть), но разные родители остаются **почти дублями по контенту**, и всё найденное без отсечения идёт в `relevantCode` → промпт распухает, LLM получает шум.

Место вставки этапа:

```
блок диффа → embedding (кеш) → hybridSearch [RRF в Qdrant — готово]
           → getPoints(родители)
           → ★ reranker: дедуп + скоринг + top-K   ← эта задача
           → reconstructChunks → relevantCode
```

## Объём работ

### 1. Порт

`src/application/use-cases/analyze-pr/analyze-pr.ports.ts`:

```typescript
export interface RerankCandidatesInput {
  diffFilePath: string;
  changedBlock: ChangedCodeBlock; // searchQuery, symbolName, symbolKind
  points: QdrantChunkPoint[]; // большие чанки-родители из getPoints
  topK: number;
}

export interface RerankerPort {
  rerankCandidates(input: RerankCandidatesInput): Promise<QdrantChunkPoint[]>;
}
```

### 2. Адаптер `src/modules/reranker/heuristic-reranker.adapter.ts`

Чистый код, без моделей и новых зависимостей. Все сигналы **уже лежат в payload** чанков (`ChunkMetadata`: `imports: ImportDetails[]`, `allSymbolsInFile`, `filename`, `symbolName`, `symbolKind`) — ре-парсинг не нужен.

Скоринг каждого кандидата:

| Сигнал                                                              | Эффект                                                               | Откуда                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------- |
| Тот же файл, что и дифф                                             | **penalty** — полный `fullFileContent` уже в промпте, чанк избыточен | `payload.filename`         |
| Импорт-граф: кандидат импортирует файл диффа (или наоборот)         | **boost**                                                            | `payload.imports[].source` |
| Пересечение символов: символы из `searchQuery` ⊆ `allSymbolsInFile` | **boost**                                                            | `payload.allSymbolsInFile` |
| Тот же `symbolName`/`symbolKind`, что у изменённого блока           | **boost**                                                            | `payload.symbolName`       |
| Близость пути (та же директория)                                    | **малый boost**                                                      | `payload.filename`         |

- **Дедуп**: по content-hash тела чанка; рядом стоящие куски одного символа (`symbolId`) схлопывать в один
- **top-K**: отсечение по итоговому скору, K — из конфига
- Веса сигналов — константы адаптера в `reranker.constants.ts` (подбираются на golden-set)

### 3. Выбор источника скора (развилка, решить при имплементации)

`findHybridSimilarNodeIds` сейчас маппит результаты в `parent_id` и **теряет RRF-score**. Варианты:

- **A (проще)**: скорить большие чанки только эвристиками, RRF-score не тянуть наверх
- **B (точнее)**: расширить `CodeSearchPort`/`hybridSearch`, чтобы score мелких чанков агрегировался (max) по их `parent_id` и комбинировался с эвристиками

Начать с A, перейти на B если замеры покажут.

### 4. Интеграция

- `analyze-pr.module.ts`: DI реранкера
- `analyze-pr.use-case.ts`: вызов между `getPoints` и `reconstructChunks` (строка ~130, на месте TODO-комментария)
- Конфиг `src/config/env-config.ts`: `RERANKER_STRATEGY: 'heuristic' | 'off'` — задел под будущий `'cross-encoder'` (transformers.js), пока значение кроме `'heuristic'` отключает этап

### 5. Наблюдаемость

pino-лог финального набора на каждый блок диффа: `filename, symbolId, score, компоненты скора (importBoost, symbolBoost, sameFilePenalty)` — это сырьё для будущего golden-set (замер recall@k до/после реранка).

## Технические заметки

- Кейс `isRenamed`: полный контент файла в промпте есть, penalty за «тот же файл» корректен и там
- `relevantCode` после отсечки должен вписываться в разумный бюджет — контролировать `topK` (бюджет в символах — опция)
- Этот же порт в будущем отранжирует подборку правил из Task 02 — сигнатуру `RerankerPort` не привязывать жёстко к `QdrantChunkPoint`, если это даётся бесплатно

## Критерии приёмки (DoD)

- [ ] TODO-комментарий на `analyze-pr.use-case.ts:130` убран, этап в пайплайне
- [ ] Дедуп: в `relevantCode` нет повторяющегося по контенту кода (проверить на PR, где один файл даёт несколько queryChunk)
- [ ] Чанки из файла самого диффа не попадают в `relevantCode`
- [ ] Размер `relevantCode` на реальном PR замерен до/после — стало меньше, замечания ревью не деградировали
- [ ] `RERANKER_STRATEGY=off` возвращает пайплайн к текущему поведению
- [ ] Лог скоров пишется для каждого блока диффа
- [ ] `lint` + `typecheck` чистые
