# Task 16 — Юнит-тесты: Vitest + покрытие чистой логики

|                 |                                                                |
| --------------- | -------------------------------------------------------------- |
| **Приоритет**   | 1 — ДО пакета Task 12/13/14 (рискованные изменения без тестов) |
| **Зависимости** | нет                                                            |
| **Открывает**   | тесты в DoD задач 03/06/09/14, автопрогон в CI (Task 17)       |

## Контекст

Тестов в репо нет; верификация = `lint` + `typecheck` + ручной smoke. Впереди самый рискованный пакет изменений за историю проекта: рефакторинг application (Task 12), вырезание p-limit и внутренних состояний (Task 14), blue-green индексация (Task 13). Юнит-тесты чистой логики — дёшево и закрывают самое хрупкое. Dockerfile Tester-стадия сейчас — заглушка.

## Объём работ

### 1. Инфраструктура

- `npm i -D vitest`
- `vitest.config.ts`: переиспользовать алиасы из `vite.config.ts` (mergeConfig) — `@shared/*`, `@modules/*`, `@application/*`, `@contracts/*` должны работать в тестах
- Скрипты: `test` (run), `test:watch`
- Тест-файлы рядом с тестируемым кодом: `*.test.ts`

### 2. Первые цели (чистая логика, без инфраструктуры)

- `dto-validators/analyze-pr.schema.ts`: transform — opened/synchronize → analyzeCommand; closed+merged+default branch → syncCommand; чужие события → null (fixtures payloads)
- `ast-parser.service.ts`:
  - `extractChangedCodeBlocks` (символы × ranges, выбор глубайших)
  - `reconstructChunks` (группировка по parent_id, сортировка partIndex, импорты в шапке)
  - `getSearchStrategy` (таблица порогов по типу файла/диффа)
- `ast-parser.utils.ts`, `http-client.utils.ts` (`withRetry` / `isRetryable`)
- `gemini.validator.ts` — Zod-схемы на валидном/битом fixture ответа LLM
- Когда Task 08 реализован — тест `llm.service` (fallback-цикл, retry, отсечение по невалидному JSON) на фейковом транспорте-стратегии

### 3. Dockerfile

- Tester-стадия: `npm test` вместо заглушки

### 4. Правило для будущих задач

- Новая чистая логика из задач 03 (reranker), 06 (yaml-стратегия), 09 (вебхук-схемы), 14 (payload-контракты, политики ретраев) — с юнит-тестами; пункты добавлены в их DoD

## Технические заметки

- Только юнит. Интеграционные (docker-compose: Qdrant/Redis/Ollama) и e2e-smoke (мок вебхука из Task 07 как тест) — отдельные задачи по потребности
- Fixtures вебхуков из Tasks 07/09/10 переиспользуются как тест-данные — не дублировать
- Windows/CRLF: fixtures создавать с LF (`.gitattributes`), иначе диффы тестов будут врать

## Критерии приёмки (DoD)

- [ ] `npm test` зелёный, `npm run typecheck` чистый (типы vitest подключены)
- [ ] Тесты существуют для: analyze-pr.schema, extractChangedCodeBlocks, reconstructChunks, getSearchStrategy, withRetry, валидаторов LLM
- [ ] Dockerfile Tester-стадия запускает `npm test` (образ собирается)
- [ ] Тест ловит намеренно сломанный transform (проверка на негативном кейсе)
- [ ] `lint` + `typecheck` чистые
