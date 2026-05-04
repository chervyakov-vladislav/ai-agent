# AI-Agent for Code Review 🚀

Интеллектуальный агент для автоматического анализа Pull Request'ов. Слушает вебхуки, анализирует код через LLM и дает обратную связь прямо в VCS.

---

## 🛠 Технологический стек

- **Runtime:** Node.js 24
- **Language:** TypeScript 6
- **Bundler:** Vite 8
- **Dev Tooling:** tsx
- **CI/CD:** Jenkins + Docker (Multi-stage builds)
- **Logger:** Pino + Pino-pretty

---

## 🏗 Архитектура сборки (Docker Pipeline)

Проект использует пятиэтапную сборку для обеспечения качества и минимального размера образа:

1.  **Base:** Установка всех зависимостей (`npm ci`).
2.  **Checker:** Запуск `npm run lint` и `npm run typecheck`.
3.  **Tester:** Запуск юнит-тестов (в разработке).
4.  **Builder:** Компиляция кода через Vite в `dist/index.js`.
5.  **Runner:** Финальный образ. Только `dist`, `package.json` и `production` зависимости.

---

## 🚀 Команды разработки

| Команда               | Описание                                                        |
| :-------------------- | :-------------------------------------------------------------- |
| `npm run dev`         | Запуск сервера с автоперезагрузкой (`tsx`)                      |
| `npm run build`       | Сборка продакшн-бандла через Vite                               |
| `npm run start`       | Запуск собранного приложения (используется в Docker)            |
| `npm run lint`        | Проверка стиля кода (ESLint + Prettier)                         |
| `npm run typecheck`   | Проверка типов TypeScript (`tsc --noEmit`)                      |
| `npm run localtunnel` | Публичный доступ к localhost (для webhook’ов через localtunnel) |
| `npm run sshtunnel`   | Стучаться через VPS + SSH туннель на локальное приложение       |

---

# 📋 Требования и План реализации AI-Agent

## 1. Функциональные требования

### А. Интеграция с VCS (Bitbucket)

- [ ] **Прием Webhooks**: Обработка `POST` запросов при создании PR.
- [ ] **Webhook на Merge**: Триггер при слиянии в `master/main` для финальной отчетности.
- [ ] **Чтение Diff**: Скачивание изменений кода через API для точечного анализа.
- [ ] **Публикация комментариев**: Автоматическая отправка замечаний в PR к конкретным строкам.

### Б. Аналитический движок (RAG & Hybrid LLM)

- [ ] **Local Embeddings (Ollama)**: Генерация векторов внутри контура (модель `nomic-embed-text`).
- [ ] **Vector DB (Qdrant)**: Хранилище индексов всей кодовой базы с поддержкой коллекций.
- [ ] **Корпоративный Qwen**: Использование внутреннего инстанса Qwen для финального анализа и генерации текста.
- [ ] **RAG Logic (LangChain)**: Поиск релевантного контекста в Qdrant и сборка промпта.
- [ ] **Управление правилами (.agents)**: Автоматическая индексация файлов конфигурации агентов и их приоритетная перезапись при изменениях.

### В. Интеграция с Jira

- [ ] **Jira Connector**: Поиск ID задачи в метаданных PR и автоматическая публикация Summary изменений после мерджа.

### Г. Обработка задач

- [ ] **Асинхронность**: Ответ `202 Accepted` и выполнение анализа/индексации в фоне.

---

## 2. Технические требования (Инфраструктурные)

### А. Среда и Сборка

- **Runtime**: Node.js 24
- **Bundler**: Vite
- **Vector DB**: **Qdrant** (Self-hosted образ).
- **Orchestration**: **LangChain** для цепочек RAG.
- **Container Registry**: Использование корпоративного GitLab Registry для всех образов (Ollama, Qdrant, App).

### Б. Архитектура (Clean Architecture)

Проект строится по слоям для независимости бизнес-логики:

1.  **Domain**: Сущности (CodeFile, Chunk), логика нарезки и интерфейсы репозиториев.
2.  **Application**: Сценарии использования (ReviewService, IndexingService).
3.  **Infrastructure**: Реализация клиентов (Axios, Qdrant, LangChain).
4.  **Interface**: Контроллеры вебхуков и HTTP адаптеры.

### В. Качество и CI/CD

- **Quality Gates**: Strict TS 6.x, ESLint 10, Prettier.
- **Docker Pipeline**: base -> checker -> builder -> runner.
- **Secrets**: Переменные для Bitbucket, Jira, Qwen API через `.env` (локально) и ENV (в проде).

---

## 🗺 План реализации (Roadmap)

### Этап 1: "Инфраструктура и MVP" 🦴

- [x] Local Environment: Развертывание Node.js окружения и конфигурация личного GitHub-аккаунта.
- [x] Webhook Handler: Настройка сервера для приема и обработки событий pull_request.opened.
- [x] Modular Architecture: Организация структуры проекта (Module Architecture) для изоляции логики ИИ от инфраструктуры.
- [x] Gemini Integration: Реализация базового сервиса для взаимодействия с Google AI SDK.
- [x] PR Feedback Loop: Автоматическая публикация результатов ревью в виде комментариев напрямую в GitHub Pull Request

### Этап 2: "Память и Правила" (Local RAG) 🧠

- [ ] Настройка **LangChain + Ollama + Qdrant**
- [ ] Механизм отслеживания и перезаписи правил из файлов `.agents`.

### Этап 3: "Анализ" (VCS + Qwen) 🚀

- [ ] Интеграция с Bitbucket API для получения Diff.
- [ ] Формирование промпта: `[Правила .agents]` + `[Контекст из Qdrant]` + `[Diff]`.
- [ ] Запрос к корпоративному Qwen.

### Этап 4: "Финализация" (Jira Loop) 📝

- [ ] Генерация Summary через Qwen после события `merged`.
- [ ] Интеграция с Jira REST API для публикации отчетов.

## 📂 Схема директорий

```text
src/
├── modules/                        # Бизнес-логика приложения
│   ├── llm-gemini/                 # Модуль взаимодействия с Google Gemini
│   │   ├── prompts/                # Системные и динамические промпты
│   │   │   └── review.prompt.ts
│   │   ├── ai-review-output.schema.ts  # Zod-схемы валидации (ранее validator.ts)
│   │   ├── gemini.constants.ts
│   │   └── gemini.service.ts       # Сервис вызова моделей и логика fallback
│   │
│   ├── webhooks/                   # Прием внешних событий
│   │   └── github/
│   │       ├── use-cases/          # Сценарии обработки конкретных событий
│   │       ├── github.controller.ts
│   │       ├── github.service.ts
│   │       ├── github.mapper.ts    # Трансформация данных GitHub в ReviewContext
│   │       ├── github.types.ts
│   │       ├── github.constants.ts
│   │       └── webhook.router.ts
│   │
│   ├── processing/                 # Оркестрация процесса анализа
│   ├── repo-query/                 # Работа с кодовой базой
│   ├── vectorstore/                # Индексация для RAG (если применимо)
│   └── health/                     # Проверка состояния сервиса
│
├── shared/                         # Общий код (Shared Kernel)
│   ├── errors/                     # Централизованная обработка ошибок
│   │   ├── AiServiceError.ts
│   │   ├── AppError.ts
│   │   └── BadRequestError.ts
│   │
│   ├── infrastructure/             # Техническая реализация (внешние API/инструменты)
│   │   ├── axios/                  # Настройка HTTP-клиента и утилиты (withRetry)
│   │   │   ├── axios-utils.ts
│   │   │   └── github-client.ts
│   │   └── logger/                 # Логирование (Pino)
│   │       ├── pino-logger.ts      # Основной логгер с Redact секретов
│   │       └── http-logger.ts
│   │
│   └── types/                      # Общие TypeScript интерфейсы и энамы
│       ├── action.enums.ts
│       └── review-context.types.ts
│
├── config/                         # Конфигурация окружения
│   └── env-config.ts               # Типизированный конфиг из .env
│
└── main.ts                         # Точка входа приложения
```
