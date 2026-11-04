# AGENTS.md — контекст для AI-агентов

AI-агент для автоматического код-ревью PR (Node.js 24, TypeScript 6, ESM). Текущая реализация: GitHub webhooks + Google Gemini. Bitbucket / корпоративный Qwen / Jira из README — только планы, кода для них нет.

## Команды

```bash
npm run dev              # tsx watch; грузит env из .env.development (НЕ .env!)
npm run build            # vite -> один бандл dist/index.js (SSR-режим, target node24)
npm run start            # node dist/index.js; грузит env из .env
npm run lint             # eslint (+ prettier как правило eslint)
npm run typecheck        # tsc, noEmit
npm run format           # prettier --write . (переписывает все файлы)
npm run docker:up:local  # qdrant, ollama, redis, redis-commander
npm run docker:clean     # docker compose down -v (сносит volumes с индексами!)
npm run sshtunnel        # reverse-SSH туннель на порт 3005 — для GitHub webhooks на localhost
```

Тестов в репо нет (фреймворк не настроен, Tester-стадия в Dockerfile — заглушка). Проверка = `lint` + `typecheck`.

Pre-commit (lefthook): `format` -> `lint` -> `typecheck`. `npm run format` переписывает файлы — не удивляйтесь изменениям после коммита.

## Окружение

- Для dev нужен `.env.development` (копия `.env.example`): `GITHUB_TOKEN`, `GEMINI_API_KEY`, `QDRANT_API_KEY` и пр.
- Все переменные валидируются Zod-схемой в `src/config/env-config.ts` — процесс падает на старте при любой невалидной переменной. Новые переменные добавлять туда.
- `NODE_OPTIONS="--expose-gc"` обязательна — без неё падает AST-парсер (web-tree-sitter).
- **Секреты не читать.** Если нужна переменная — назвать её, указать файл (`.env.development`) и попросить пользователя вписать значение вручную.

## Архитектура (Clean/Hexagonal, зависимости только внутрь)

- `src/interface/` — первичные адаптеры: HTTP-контроллеры, Zod-схемы в `dto-validators/`, middlewares, BullMQ-воркеры (`interface/workers/`: analysis, indexing).
- `src/application/` — ядро: `use-cases/` (папка на кейс: `*.use-case.ts`, `*.ports.ts`, `*.module.ts` — DI-связка портов с адаптерами), `contracts/`, `pipelines/`, `ports/`. Новая ответственность (общий контракт, переиспользуемый порт, пайплайн, роль в кейсе) — предлагать пользователю вынос, не раздувать `*.use-case.ts`.
- `src/modules/` — вторичные адаптеры: `github`, `llm-gemini`, `vectorstore` (Qdrant), `embeddings` (Ollama), `ast-parser`, `langchain`, `queues`, `cache`.
- `src/shared/` — `errors/` (иерархия от `AppError`), `infrastructure/` (клиенты Axios/Redis/Qdrant/BullMQ, pino-логгер).

Жёсткие правила (подробности в `src/application/AGENTS.md` и `src/modules/AGENTS.md`):

- Use Case не импортирует инфраструктуру и модули напрямую — только через порты (`@application/contracts|ports`). Адаптер реализует порт и делегирует в `*.service.ts`.
- Один Use Case = одно действие, один публичный `execute()`, на вход/выход — чистые DTO, не Express-объекты.
- Модуль = паттерн Service-Adapter: `*.service.ts` (логика/API), `*.adapter.ts` (реализация порта), `*.types.ts`, `*.constants.ts`, `*.utils.ts`, `*.validators.ts`. Новая выделенная ответственность (мапперы, стратегии, промпты) — отдельный файл/подпапка по роли, предлагать пользователю. Внутри модуля — относительные импорты, наружу — только адаптер через `@modules/...`.

## Код-конвенции

- Импорты: алиасы из `tsconfig.json` (`@shared/*`, `@modules/*`, `@application/*`, `@contracts/*` → `src/application/contracts/*`, `@config/*`); внутри папки — относительные пути; node-модули — с префиксом `node:`.
- Запрещён `any`; типы — в `*.types.ts` / `*.contracts.ts`.
- Ошибки: только кастомные классы от `AppError` (`src/shared/errors`), никаких `throw new Error()`. Ошибки БД/API маппятся в бизнес-исключения на уровне адаптера.
- Валидация Zod везде: входящие DTO — в `src/interface/http/dto-validators`; ответы внешних API и LLM — в `*.validators.ts` модуля.
- Логирование — pino из `src/shared/infrastructure/logger`, не `console.*`.
- Долгие задачи (индексация, анализ PR) — в фоновые воркеры BullMQ; webhook сразу отвечает `202`.
- Доменного слоя (`src/domain/`) пока нет — не создавать без явного решения пользователя (план — README, «Масштабирование application layer»).
- Переводы строк LF (`.gitattributes` + `.prettierrc`) — на Windows следить за CRLF.

## Локальная инфраструктура

- Qdrant: dashboard на `http://localhost:6333/dashboard`. Коллекции, созданные вручную, — Size 768, Distance Cosine (совместимость с `nomic-embed-text`).
- Redis должен работать с `--maxmemory-policy noeviction`, иначе BullMQ теряет события очереди.
- Ollama — локальные эмбеддинги (`nomic-embed-text`); `OLLAMA_NUM_PARALLEL=4` только при GPU с 2–3 ГБ свободных, иначе 1.

## Дополнительные источники

- `README.md` — блок `AI_CONTEXT` с полной схемой директорий и критериями ревью.
- `src/application/AGENTS.md` — правила Clean Architecture для use-cases (подгружается автоматически при работе в `src/application/`).
- `src/modules/AGENTS.md` — паттерн Service-Adapter для модулей (подгружается автоматически при работе в `src/modules/`).
