# Task 14 — Завершение внедрения очередей BullMQ

|                 |                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Приоритет**   | 0 — фундамент: воркеры не вызывают use-case'ы, webhook-пайплайн фактически не работает                                                      |
| **Зависимости** | —                                                                                                                                           |
| **Открывает**   | Task 02 (rules-sync в работающем пайплайне), Task 10 (GitLab-вебхуки), Task 15 (вынос воркеров), пер-repo параллельность синков для Task 13 |

## Контекст (аудит текущего состояния)

Готово: очереди analysis/indexing (`modules/queues/`), Redis-блокировки per-repo с атомарным освобождением (Lua), диспетчеры с jobId-дедупликацией, скелеты воркеров в `interface/workers/`, старт в `main.ts`, вебхук-контроллер уже диспатчит в очереди, разведённые Redis-подключения (db0 cache / db1 queue).

Гэпы:

- Вызовы use-case'ов в обоих воркерах **закомментированы** (`analysis.worker.ts:29`, `indexing.worker.ts:30`) — очередь принимает, но не выполняет
- Payload-контракты (`contracts/queues.types.ts`) неполные: use-case'ам нужны `collectionName`, `branch`/`currentBranch` и пр., вебхук-transform их уже вычисляет и выбрасывает
- `SyncStatusPort` (isBusy/setBusy, `sync-status.memory.adapter.ts`) — глобальный in-memory мьютит на процесс; конфликтует с per-repo Redis-локами и мешает пер-repo параллельности
- `p-limit`: в `repo-sync.use-case.ts:82` (параллельность файлов), в `embeddings.service.ts:6` (троттлинг Ollama), мёртвой зависимостью `parallelLimit` в `analyze-pr` (DI есть, в теле не используется)
- `/indexing/sync` (`repo-sync.controller.ts`) вызывает use-case в обход очереди (`.then/.catch`)
- `attempts: 100` без разбора ошибок; shutdown в `main.ts` не закрывает воркеров; TTL repo-лока 600с может истечь посреди индексации большой репы

## Объём работ

Фазы независимы по merged-порядку, каждая завершается зелёным `lint` + `typecheck`.

### 1. Payload-контракты (`contracts/queues.types.ts`)

- `AnalysisPayload`: + `collectionName`, `currentBranch`, `commitHash`, `repoUrl`
- `IndexingPayload`: + `collectionName`, `branch`
- Контроллер вебхука передаёт полные payload (данные уже есть в transform-выводе схемы)

### 2. Подключение use-case'ов в воркерах

- `analysis.worker.ts` / `indexing.worker.ts`: раскомментировать вызовы, DI-сборка через `analyze-pr.module` / `repo-sync.module` (воркер — interface-слой, инфраструктуру не тянет)

### 3. Repo-sync на BullMQ Flows (замена p-limit)

- `FlowProducer`: parent-джоба `INDEX_CODEBASE` + child-джобы `INDEX_FILE` на файл
- Parent: `getRepositoryInfo` → дерево → запуск детей → финализация после всех детей
- Параллелизм файлов = concurrency воркера (env `INDEXING_CONCURRENCY`)
- Ретрай упавшего файла не валит синхронизацию; прогресс — `job.updateProgress`
- **Шов под blue-green (Task 13)**: финализация parent-джобы (сейчас `cleanupOldSyncData`) — единственная точка, куда Task 13 подставит `switchAlias` + drop; целевая коллекция приходит в payload родителя и передаётся детям — blue-green подменит её теневой

### 4. Удаление состояний, конфликтующих с очередями

- Удалить `SyncStatusPort` (repo-sync.ports.ts), `sync-status.memory.adapter.ts`, проверки isBusy/setBusy в use-case, DI в module — взаимоисключение уже обеспечено per-repo Redis-локами из queues.service
- Удалить исполненные TODO-комментарии про BullMQ в `repo-sync.use-case.ts`

### 5. Удаление p-limit

- `repo-sync.use-case.ts` — заменён Flows (п.3); `analyze-pr` — убрать мёртвый `parallelLimit` из Dependencies и `analyze-pr.module.ts`
- `embeddings.service.ts` — pLimit прочь; защита Ollama: server-side очередь (`OLLAMA_NUM_PARALLEL`) + ограниченный параллелизм из Flows
- Пакет `p-limit` — из package.json

### 6. Ручной `/indexing/sync` через очередь

- `repo-sync.controller.ts`: диспатч в indexingQueue (202) вместо прямого вызова; GitHub-фрагмент в repoUrl — координация с Task 09

### 7. Политики ретраев

- `LockConflictError` — осознанное ожидание лока (повторы с задержкой, как сейчас)
- Реальные ошибки — attempts 3–5, exponential backoff (различить по типу ошибки; фатальные — `UnrecoverableError`)
- `removeOnComplete: { count: 100 }` — история последних джоб для наблюдаемости

### 8. Продление repo-лока

- Heartbeat-продление TTL в процессе джобы (или TTL с запасом + stale-проверка) — иначе лок истекает посреди индексации большой репы

### 9. Graceful shutdown

- `shutdown()` в `main.ts`: `worker.close()` для обоих воркеров (джобы дописываются), закрытие очередей, затем выход; ссылку из `initWorkers()` сохранить

### 10. Готовность к выносу воркеров (без выноса)

- Сборка use-case'ов для воркеров — чистая функция без завязки на express
- Ноль in-process state между HTTP и воркерами (гарантируется п.4)
- Статус/прогресс джоб — только через Redis/BullMQ

## Технические заметки

- **Вынос воркеров в отдельный контейнер — Task 15**; здесь только задел (п.10)
- **Blue-green switch — Task 13**; здесь только шов (п.3): финализация в parent-джобе + целевая коллекция из payload. Пер-repo параллельность синков, которую даёт эта задача, — предпосылка для Task 13
- **Координация с Task 12 (рефакторинг application)**: `p-limit` в `pipelines/indexing/` НЕ переносится (удаляется здесь вместе с Flows); `SyncStatusPort` удаляется здесь, а не сохраняется; после появления `pipelines/indexing/` child-джобы вызывают пайплайн — оркестрация не меняется
- Rules-sync (Task 02) остаётся синхронным use-case'ом — очередь ему не нужна
- Воркеры остаются в одном процессе с HTTP (решение пользователя), архитектура — под вынос
- Сценарии DoD (локи, Flows, smoke) автоматизируются в Task 18 — ручная проверка здесь, регрессия там

## Критерии приёмки (DoD)

- [ ] Вебхук PR opened → 202 → лог воркера: analyze-pr use-case выполнен → комментарий в PR
- [ ] merged в default branch → джоба индексации → Flows (parent + children) → чанки в Qdrant, финализация после всех детей
- [ ] Две индексации одного репо не пересекаются (лок); двух разных репо — идут параллельно
- [ ] Упавший файл ретраится отдельно (BullMQ-лог), синхронизация репо не падает
- [ ] `grep -rn "p-limit\|pLimit\|parallelLimit" src package.json` — пусто
- [ ] `grep -rn "SyncStatusPort\|sync-status" src` — пусто
- [ ] `/indexing/sync` диспатчит джобу в очередь (видно в логе BullMQ / redis-commander), а не вызывает use-case напрямую
- [ ] SIGINT: воркеры дорабатывают текущие джобы (лог), затем процесс завершается
- [ ] Юнит-тесты payload-контрактов и политик ретраев (Task 16)
- [ ] `lint` + `typecheck` чистые
