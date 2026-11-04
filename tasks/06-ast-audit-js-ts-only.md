# Task 06 — Аудит AST-парсинга: скоуп JS/TS + YAML для Helm

|                 |                                                                              |
| --------------- | ---------------------------------------------------------------------------- |
| **Приоритет**   | 1 — можно параллельно с Task 04 (удаление пакетов — до массового обновления) |
| **Зависимости** | нет                                                                          |

## Контекст

Продуктовое решение: агент ревьюит только JS/TS проекты (стек Task 01 — React/TS). Java, мобильные платформы и SQL — вне скоупа. Единственное исключение — чтение YAML для Helm-чартов.

Результаты аудита кода (уже проведён):

- `web-tree-sitter` числится в dependencies, но **нигде в src не импортируется** — мёртвый пакет. Легенда про `NODE_OPTIONS=--expose-gc` в корневом `AGENTS.md` ссылается на него — проверить и, если не нужно, убрать требование
- `java-parser` импортируется только `strategies/java/java.strategy.ts`
- `sql-parser-cst` — только `strategies/sql/sql.strategy.ts`
- YAML сейчас индексируется целым файлом (strategy=null → fallback FileContent)

## Объём работ

### 1. Удаление мёртвого и вышедшего из скоупа

- Удалить пакеты: `web-tree-sitter`, `java-parser`, `sql-parser-cst`
- Удалить `strategies/java/`, `strategies/sql/`
- `ast-parser.constants.ts`: убрать `SUPPORTED_JAVA_EXTENSIONS`, `SUPPORTED_SQL_EXTENSIONS`
- `ast-parser.service.ts`:
  - убрать java/sql ветки из `getStrategy` и импорты стратегий
  - убрать java-ветку из `formatImportsForLLM` (строки ~162–166)
- `contracts/code-analysis.types.ts`: убрать SQL-специфичные `CodeSymbolKind` (`Table`, `Index`, `View`, `Modification`, `Transaction`) — предварительно проверить использование
- Найти, где задаётся `NODE_OPTIONS=--expose-gc`, проверить dev-запуск без него; если работает — убрать из скриптов/доков (`AGENTS.md`, README)

**Что сохраняем при удалении:** сам паттерн стратегий — интерфейс `ParserStrategy`, диспетчер `getStrategy` и структуру `strategies/<lang>/`. Удаляются только реализации java/sql, механизм остаётся. Добавление нового языка = папка `strategies/<lang>/` + константа расширений, без правок `ast-parser.service.ts` — тот же принцип, что у LLM-стратегий в Task 08.

### 2. YAML-стратегия для Helm

- `npm i yaml`
- `strategies/yaml/yaml.strategy.ts` по интерфейсу `ParserStrategy`:
  - `values.yaml` / `values-*.yaml`: парсить через `yaml` (`parseDocument` с сохранением позиций), чанк = секция верхнего ключа; символ = ключ (kind: `Variable`) со startLine/endLine — тогда `extractChangedCodeBlocks` заработает для YAML без доработок
  - `Chart.yaml`: целиком как FileContent (маленький)
  - `templates/*.yaml` (Go-шаблоны `{{ ... }}` ломают YAML-парсер): не парсить AST-шно, fallback на FileContent-чанкинг по тексту
- `ast-parser.constants.ts`: `SUPPORTED_YAML_EXTENSIONS = ['.yaml', '.yml']`
- `getStrategy`: ветка yaml → yamlStrategy
- `getSearchStrategy`: yaml уже размечен как data-file (threshold 0.85, limit 2) — не трогать

### 3. Документация

- README / корневой `AGENTS.md`: зафиксировать скоуп «JS/TS + YAML (Helm)», остальные языки — out of scope

## Технические заметки

- Паттерн стратегий (`ParserStrategy` + `getStrategy`) — задел под возврат других языков (java, мобильные платформы), если продуктовый скоуп расширится; сейчас реализуются только ts-morph и yaml
- Возврат языка = новая стратегия + пакет + константа; диспетчер и сервис не меняются

## Критерии приёмки (DoD)

- [ ] `java-parser`, `sql-parser-cst`, `web-tree-sitter` удалены, `npm ci` проходит
- [ ] Java/SQL стратегии и константы удалены, `formatImportsForLLM` почищен
- [ ] Паттерн стратегий сохранён: `ParserStrategy`, `getStrategy`, `strategies/`; добавление нового языка не требует правок `ast-parser.service.ts`
- [ ] Решение по `--expose-gc` проверено и зафиксировано (убрано или обосновано)
- [ ] repo-sync репозитория с Helm-чартом: values.yaml индексирован по-секционно, дифф в values.yaml даёт changed block по конкретному ключу
- [ ] Go-шаблон в templates/ не роняет индексацию (fallback работает)
- [ ] Юнит-тесты yaml-стратегии: values.yaml по-секционно, fallback на Go-шаблонах (Task 16)
- [ ] `lint` + `typecheck` чистые
