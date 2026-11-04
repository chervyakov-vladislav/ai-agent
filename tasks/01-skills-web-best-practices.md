# Task 01 — Корпус правил `skills/web-best-practices`

|                 |                                              |
| --------------- | -------------------------------------------- |
| **Приоритет**   | 1 — стартовать первым                        |
| **Зависимости** | нет                                          |
| **Открывает**   | Task 02 (rules-sync индексирует эти правила) |

## Контекст

На работе бек-разработчики с AI-агентами будут писать веб-код (React 19 SPA + TanStack Query/Table/Router + RHF + Zod). Корпус правил — единый источник правды для двух каналов:

1. **Канал «писатели»**: сборка `rules/` → `AGENTS.md`, который кладётся в целевые репо — агенты беков соблюдают правила еще до создания PR.
2. **Канал «ревьюер»**: те же правила индексируются в Qdrant (Task 02) и подставляются в промпт ревью под каждый дифф.

Формат — порт структуры [vercel-labs/agent-skills/skills/react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices): атомарные файлы правил с frontmatter, сборка в единый артефакт.

## Объём работ

### 1. Структура `skills/web-best-practices/`

```
skills/web-best-practices/
├── metadata.json          # version, описание, стек
├── rules/
│   ├── _template.md       # шаблон нового правила
│   ├── _sections.md       # метаданные секций (title, описание)
│   └── <section>-<name>.md
├── scripts/build.mjs      # сборка AGENTS.md из rules/
└── AGENTS.md              # генерируемый артефакт (коммитим)
```

### 2. Формат правила (`_template.md`)

````markdown
---
title: Invalidate queries after mutations
impact: HIGH
tags: tanstack-query, mutation, cache
---

## Invalidate queries after mutations

<краткое объяснение, почему важно — 2-4 предложения>

**Incorrect:**

\```typescript
// плохой пример
\```

**Correct:**

\```typescript
// хороший пример
\```

<пояснение после примеров>

Reference: https://tanstack.com/query/latest/docs/...
````

Требования: одно правило = один файл, 30–80 строк, обязательны оба примера (bad/good).

### 3. Секции под наш стек (префикс имени файла)

| Префикс     | Секция                                                                          |
| ----------- | ------------------------------------------------------------------------------- |
| `query-`    | TanStack Query: ключи, invalidation, водопады, `enabled`-цепочки, staleTime     |
| `form-`     | RHF + Zod: `zodResolver`, shared-схемы как контракт с API                       |
| `router-`   | TanStack Router: типизированные роуты, loaders/префетч, search params через Zod |
| `table-`    | TanStack Table: memoization колоночных дефиниций, виртуализация                 |
| `react-`    | React 19: Suspense/`use`, error boundaries, loading/error-стейты, ре-рендеры    |
| `security-` | XSS, `dangerouslySetInnerHTML`, инъекции в URL/параметры                        |
| `a11y-`     | Базовая доступность: alt, aria, семантика, focus                                |
| `bundle-`   | Размер бандла: barrel-imports, динамические импорты, tree-shaking               |

### 4. Стартовый набор правил (≥ 12, из них ≥ 3 про TanStack Query)

- `query-keys-hierarchy` — иерархические ключи запросов
- `query-invalidation` — invalidate после мутаций
- `query-waterfalls` — последовательные `useQuery` вместо параллельных
- `query-enabled-chains` — `enabled: !!id` вместо условных хуков
- `query-loading-error-states` — обязательные стейты загрузки/ошибки
- `form-zod-resolver` — RHF + `zodResolver`, а не ручная валидация
- `form-shared-schemas` — Zod-схема как контракт с бекендом
- `router-typed-routes` — типизированные роуты и линки
- `router-search-params-zod` — валидация search params
- `table-memo-columns` — memoization колоночных дефиниций
- `react-missing-error-boundary` — error boundary + fallback-стейты
- `security-dangerously-set-inner-html` — запрет без sanitize

### 5. Скрипты сборки и валидации

- `npm run skills:build` — парсит frontmatter всех `rules/*.md` (кроме `_`-файлов), группирует по секциям, генерирует `AGENTS.md` (оглавление + правила, отсортированные по impact внутри секции)
- `npm run skills:validate` — падает с понятной ошибкой, если у правила нет `title` / `impact` / обоих примеров, или префикс файла не входит в `_sections.md`
- Frontmatter-парсер пишем сами (3–4 поля), **без новых зависимостей**
- Скрипт выполняется через `node`/`tsx`, добавить оба скрипта в `package.json`

## Технические заметки

- `impact` (CRITICAL / HIGH / MEDIUM / LOW) в Task 02 станет severity комментария в PR: CRITICAL/HIGH → инлайн, MEDIUM/LOW → summary
- Секция (префикс файла) станет метаданными для фильтрации правил по типу файла диффа (`.tsx` → `react-*`, `query-*`...)
- Плохие примеры в правилах — реалистичные ошибки беков во фронте, а не синтетика
- AGENTS.md коммитим: его удобно просто копировать в целевые репо, CI не нужен

## Критерии приёмки (DoD)

- [ ] `skills/web-best-practices/` со структурой выше, `_template.md` и `_sections.md` на месте
- [ ] ≥ 12 правил в ≥ 5 секциях, включая ≥ 3 про TanStack Query и ≥ 1 с impact: CRITICAL
- [ ] `npm run skills:build` генерирует `AGENTS.md` из `rules/`
- [ ] `npm run skills:validate` ловит битые правила (проверить на специально сломанном файле)
- [ ] `AGENTS.md` закоммичен, читабелен как документ для человека
- [ ] `npm run lint` и `npm run typecheck` чистые
