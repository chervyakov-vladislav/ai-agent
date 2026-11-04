# Task 05 — Переезд на gRPC-клиент Qdrant

|                 |                                                      |
| --------------- | ---------------------------------------------------- |
| **Приоритет**   | 2 — после Task 04                                    |
| **Зависимости** | Task 04 (обновление qdrant-клиентов одной волей)     |
| **Риск**        | Средний: требует spike по feature-parity ДО миграции |

## Контекст

Сейчас `@qdrant/js-client-rest` (порт 6333). Цель — `@qdrant/js-client-grpc` (порт 6334, в docker-compose уже проброшен). Главная выгода gRPC — бинарный protobuf на bulk-операциях: upsert'ы индексации repo-sync (большие payload'ы векторов). Выигрыш на поиске скромнее.

Монорепо qdrant-js поддерживает оба клиента на одном уровне API (v1.20, включая BM25), но полнота Query API (prefetch + RRF) в JS gRPC-клиенте требует проверки — отсюда шаг 1.

Архитектурно миграция дешёвая: клиент изолирован в `shared/infrastructure/clients/qdrant-client.ts`, порты и `qdrant.service.ts` не меняются (при необходимости меняются только типы ответов).

## Объём работ

### 1. Spike: feature-parity (блокер, время — полдня максимум)

Проверочный скрипт против локального Qdrant через `@qdrant/js-client-grpc`, по каждому пункту — работает/нет:

- query points с `prefetch` (dense + BM25 text) и `fusion: rrf` — **критично**, это `hybridSearch`
- createCollection с named dense vector (768, Cosine, hnsw_config) + sparse_vectors (bm25)
- createPayloadIndex (keyword/text)
- upsert с named vectors (dense + sparse) и payload
- scroll с filter / offset / with_payload
- setPayload, delete по filter
- auth по API key
- `updateCollectionAliases` / `listAliases` — нужны для blue-green из Task 13 (миграция не должна их потерять)

Если parity нет (особенно prefetch+RRF) — задача закрывается решением «остаёмся на REST», это допустимый исход. Решение зафиксировать в этом файле.

### 2. Замена клиента (если spike зелёный)

- `npm i @qdrant/js-client-grpc` (+ мажорный бамп до актуального)
- `shared/infrastructure/clients/qdrant-client.ts`: init gRPC-клиента (host:6334, API key)
- `modules/vectorstore/qdrant.service.ts`: адаптация вызовов к gRPC-типам (фильтры/векторы/payload — protobuf-структуры вместо JSON)
- `config/env-config.ts`: `QDRANT_URL` (6333) → `QDRANT_GRPC_URL` (6334) + обновить `.env.example`

### 3. Замер

- Прогнать repo-sync одного и того же репозитория до/после — время индексации
- Прогнать analyze-pr — качество поиска не изменилось (находятся те же чанки)

### 4. Чистка

- Удалить `@qdrant/js-client-rest` из зависимостей

## Критерии приёмки (DoD)

- [ ] Spike-отчёт в PR: таблица parity по каждому API
- [ ] `hybridSearch` (prefetch + RRF) работает через gRPC — гибридный поиск не деградировал
- [ ] repo-sync и analyze-pr проходят smoke-сценарий из Task 04
- [ ] Замер времени индексации до/после зафиксирован
- [ ] REST-клиент удалён, env-переменные обновлены
- [ ] `lint` + `typecheck` чистые
