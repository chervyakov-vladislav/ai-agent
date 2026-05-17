# AI-Agent for Code Review 🚀

Интеллектуальный агент для автоматического анализа Pull Request'ов. Слушает вебхуки, анализирует код через LLM и дает обратную связь прямо в VCS.

---

<!-- AI_CONTEXT_START -->

### 🧱 Архитектура

#### 📂 Основные слои и модули

1.  **`application/` (Ядро системы)**
    - **UseCases**: Чистая логика сценариев (например, синхронизация репозитория или анализ PR). Не зависит от фреймворков.
    - **Ports**: Интерфейсы (`*.ports.ts`), определяющие контракты для внешних сервисов.
    - **Contracts**: Общие типы и интерфейсы приложения.

2.  **`interface/` (Входящие адаптеры / Primary Adapters)**
    - **HTTP/Express**: Транспортный слой приложения.
    - **Controllers**: Прием запросов, делегирование работы UseCase и возврат ответов.
    - **DTO-Validators**: Строгая валидация входящих данных через Zod-схемы.

3.  **`modules/` (Исходящие адаптеры / Secondary Adapters)**
    - **GitHub**: Реализация работы с API (получение диффов, публикация ревью).
    - **LLM-Gemini**: Интеграция с ИИ, управление промптами и валидация ответов модели.
    - **Vectorstore**: Реализация Qdrant (поддержка гибридного поиска: плотные векторы + BM25/Sparse).
    - **Embeddings**: Генерация эмбеддингов.
    - **AST-Parser**: Анализ кода, извлечение символов, импортов и создание скелетов.
    - **Langchain**: Оркестрация разбиения кода (RAG-пайплайны).

4.  **`shared/` (Общий слой)**
    - **Infrastructure**: Низкоуровневые клиенты (Axios, Redis, BullMQ) и конфигурация логгера (Pino).
    - **Errors**: Глобальная иерархия кастомных ошибок (наследуются от `AppError`).

#### 🔄 Поток обработки данных

Система следует строгому пайплайну, где зависимости направлены только внутрь:

1.  **Entry Point**: Вебхук или запрос попадает в `interface/http`.
2.  **Validation**: Проверка входящего DTO на уровне контроллера.
3.  **Execution**: Вызов соответствующего `UseCase` из слоя приложения.
4.  **Infrastructure Call**: UseCase обращается к `Modules` через `Ports`.
5.  **Data Mapping**: Адаптеры преобразуют внешние данные в типы приложения (через `Mappers`).
6.  **AI Validation**: Ответы от LLM проходят обязательную проверку Zod-валидатором на выходе.
7.  **Response**: Возврат обработанного результата клиенту.

## ⚖️ Правила проведения Review для агента

Агент должен проверять код на соответствие следующим критериям:

1. **Архитектурная чистота**: Бизнес-логика только в `UseCases`. В контроллерах — только прием данных.
2. **Безопасность**: Валидация всех входящих данных через `Zod`.
3. **Обработка ошибок**: Использование только кастомных классов, наследуемых от `AppError`. Никаких `throw new Error()`.
4. **Типизация**: Запрещено использование `any`. Все интерфейсы должны быть в соответствующих файлах `.types.ts`.
5. **Логирование**: Критические операции и ошибки должны логироваться через `pino`.

## 📂 Схема директорий

```
src/
├── interface/                          # Входящие адаптеры (Primary Adapters)
│   └── http/                           # Транспортный слой (Express)
│       ├── controllers/                # Валидация DTO и вызов Use Case
│       ├── dto-validators/             # Схемы Zod (например, repo-sync.schema.ts)
│       ├── middlewares/                # Обработка ошибок, логгеры запросов
│       ├── express.ts                  # Инициализация приложения
│       └── root-router.ts              # Главный роутер системы
│
├── application/                        # Ядро системы (Чистая логика и Порты)
│   ├── use-cases/                      # Сценарии использования
│   │   ├── analyze-pr/                 # Кейс анализа PR
│   │   │   ├── analyze-pr.use-case.ts
│   │   │   ├── analyze-pr.module.ts    # DI: связывание портов с адаптерами
│   │   │   ├── analyze-pr.ports.ts     # Интерфейсы, необходимые этому кейсу
│   │   │   └── analyze-pr.types.ts
│   │   └── repo-sync/                  # Кейс синхронизации
│   │       ├── repo-sync.use-case.ts
│   │       ├── repo-sync.module.ts
│   │       └── repo-sync.ports.ts      # Интерфейсы RepoSourcePort, VectorStorePort и т.д.
│   │
│   ├── contracts/                      # Общие интерфейсы приложения и типы
│   ├── workflows/                      # Оркестрация нескольких use-cases
│   └── pipelines/                      # Сложная AI/RAG логика обработки
│
├── modules/                            # Исходящие адаптеры (Infrastructure Adapters)
│   ├── github/                         # Модуль работы с GitHub API
│   │   ├── github.adapter.ts           # Реализация RepoSourcePort
│   │   ├── github.service.ts           # Низкоуровневая работа с API
│   │   ├── github.mapper.ts            # Преобразование API ответов в доменные типы
│   │   └── github.types.ts
│   ├── llm-gemini/                     # Интеграция с Google Gemini
│   ├── vectorstore/                    # Реализация Qdrant
│   ├── embeddings/                     # Генерация эмбеддингов
│   └── processing/                     # Парсинг и разбиение файлов
│
├── shared/                             # Общий код для всех уровней
│   ├── errors/                         # Кастомные ошибки (AppError, GithubError)
│   ├── infrastructure/                 # Низкоуровневые клиенты и утилиты
│   │   ├── clients/                    # Axios, Redis, Qdrant, BullMQ клиенты
│   │   └── logger/                     # Настройка Pino
│   ├── lib/
│   └── utils/                          # Чистые утилиты (http-client.utils.ts)
│
├── config/                             # Конфигурация окружения
│   └── env-config.ts
└── main.ts                             # Точка входа в приложение
```

<!-- AI_CONTEXT_END -->

## 🏗 Архитектура сборки (Docker Pipeline)

Проект использует пятиэтапную сборку для обеспечения качества и минимального размера образа:

1.  **Base:** Установка всех зависимостей (`npm ci`).
2.  **Checker:** Запуск `npm run lint` и `npm run typecheck`.
3.  **Tester:** Запуск юнит-тестов (в разработке).
4.  **Builder:** Компиляция кода через Vite в `dist/index.js`.
5.  **Runner:** Финальный образ. Только `dist`, `package.json` и `production` зависимости.

---

## 🚀 Команды разработки

| Команда             | Описание                                                  |
| :------------------ | :-------------------------------------------------------- |
| `npm run dev`       | Запуск сервера с автоперезагрузкой (`tsx`)                |
| `npm run build`     | Сборка продакшн-бандла через Vite                         |
| `npm run start`     | Запуск собранного приложения (используется в Docker)      |
| `npm run lint`      | Проверка стиля кода (ESLint + Prettier)                   |
| `npm run typecheck` | Проверка типов TypeScript (`tsc --noEmit`)                |
| `npm run sshtunnel` | Стучаться через VPS + SSH туннель на локальное приложение |
| `docker:up:local`   | Запуск базы данных и ИИ-движка в фоновом режиме           |
| `docker:clean`      | Остановка контейнеров и очистка volume                    |

---

# 📋 Требования и План реализации AI-Agent

## 1. Функциональные требования

### А. Интеграция с VCS (Bitbucket)

- [ ] **Прием Webhooks**: Обработка `POST` запросов при создании PR.
- [ ] **Webhook на Merge**: Триггер при слиянии в `master/main` для финальной отчетности.
- [ ] **Чтение Diff**: Скачивание изменений кода через API для точечного анализа.
- [ ] **Публикация комментариев**: Автоматическая отправка замечаний в PR к конкретным строкам.

### Б. Аналитический движок (RAG & Hybrid LLM)

- [ ] **Local Embeddings (Ollama)**: Генерация векторов внутри контура (`ts-morph` + модель `nomic-embed-text`).
- [ ] **Vector DB (Qdrant)**: Хранилище индексов всей кодовой базы с поддержкой коллекций.
- [ ] **Корпоративный Qwen**: Использование внутреннего инстанса Qwen для финального анализа и генерации текста.
- [ ] **RAG Logic (LangChain)**: Поиск релевантного контекста в Qdrant и сборка промпта.

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
- [ ] Кеширование полученных векторов в redis
- [ ] Настройка очередей через BullMQ + redis

### Этап 3: "Анализ" (VCS + Qwen) 🚀

- [ ] Интеграция с Bitbucket API для получения Diff.
- [ ] Формирование промпта:`[Контекст из Qdrant]` + `[Diff]`.
- [ ] Запрос через pipeline к корпоративному Qwen. Запрашиваем ревью на каждый дифф, потом отправляем финальный запрос за summary + группировкой итогов предыдущих запросов

---

## 🛠 Разработка на Localhost

Для локальной разработки используйте следующие переменные окружения, чтобы приложение «видело» контейнеры:

| Сервис         | Переменная в .env | Значение для Localhost   |
| :------------- | :---------------- | :----------------------- |
| **Qdrant API** | `QDRANT_URL`      | `http://localhost:6333`  |
| **Ollama API** | `OLLAMA_URL`      | `http://localhost:11434` |

---

### Графический интерфейс

Для управления коллекциями и просмотра векторов используйте встроенный Dashboard http://localhost:6333/dashboard
Конфигурация: При создании коллекций вручную через UI обязательно указывайте Size: 768 и Distance: Cosine для совместимости с моделью Nomic

---

## ⚙️ Настройка ресурсов (WSL 2)

Для предотвращения чрезмерного потребления оперативной памяти процессом `vmmem` (Docker/WSL), необходимо ограничить выделяемые ресурсы.

1. Перейдите в папку вашего пользователя Windows: `%USERPROFILE%` (обычно это `C:\Users\ИмяПользователя`).
2. Создайте там текстовый файл с названием `.wslconfig` (убедитесь, что у него нет расширения `.txt`).
3. Вставьте в него следующую конфигурацию:

```ini
[wsl2]
# Максимальный объем RAM, который может занять вся подсистема WSL 2
memory=4GB

# Количество ядер процессора
processors=2
```

После сохранения файла перезапустите WSL. В терминале (PowerShell) выполните:

```bash
wsl --shutdown
```

## 📂 Масштабирование application layer

При увеличении количества бизнес-логики убрать её application + domain. перейти от модульной архитекруты к гексагональной архитектуре
Запретить модулям общаться друг с другом и делать это на уровне application + domain

## 📂 Пример структуры

```text
src/
├── domain/                          # ❤️ СЕРДЦЕ СИСТЕМЫ (Pure Logic / Entities)
│   ├── repository/                  # Доменная область репозитория
│   │   ├── repository.entity.ts     # Логика сущности: расчет прогресса, правила синхронизации
│   │   ├── repository.errors.ts     # Бизнес-ошибки (Domain Errors)
│   │   └── repository.types.ts      # Типы сущности (FileMetadata, SyncStats)
│   └── code-analysis/               # Доменная область анализа кода
│       ├── analysis-result.vo.ts    # Value Objects (неизменяемые результаты анализа)
│       └── scoring-rules.ts         # Правила и алгоритмы оценки кода
│
├── application/                      # 🏗️ ЯДРО ПРИЛОЖЕНИЯ (Orchestration & Ports)
│   ├── use-cases/                    # Сценарии использования (Use Cases)
│   │   ├── analyze-pr/               # Кейс анализа Pull Request
│   │   │   ├── analyze-pr.use-case.ts# Дирижер: вызывает домен и порты
│   │   │   ├── analyze-pr.module.ts  # Внедрение зависимостей (Dependency Injection)
│   │   │   ├── analyze-pr.ports.ts   # Интерфейсы (Inbound/Outbound) для этого кейса
│   │   │   └── analyze-pr.types.ts   # DTO и типы данных уровня приложения
│   │   └── repo-sync/                # Кейс синхронизации репозитория
│   │       ├── repo-sync.use-case.ts # Логика процесса: получение данных -> вызов домена
│   │       ├── repo-sync.module.ts   # Сборка зависимостей для синхронизации
│   │       └── repo-sync.ports.ts    # Контракты (RepoSourcePort, VectorStorePort)
│   │
│   ├── contracts/                    # Общие интерфейсы и абстракции приложения
│   ├── workflows/                    # Оркестрация нескольких сложных Use Cases
│   └── pipelines/                    # AI/RAG конвейеры обработки данных
│
├── modules/                          # 🔌 ИСХОДЯЩИЕ АДАПТЕРЫ (Secondary Adapters)
│   ├── github/                       # Инфраструктура GitHub API
│   │   ├── github.adapter.ts         # Реализация RepoSourcePort (маппинг в домен)
│   │   ├── github.service.ts         # Низкоуровневая работа с внешним API
│   │   ├── github.mapper.ts          # Преобразование данных API -> Domain Entity
│   │   └── github.types.ts           # Внутренние типы ответов API
│   ├── llm-gemini/                   # Адаптер для Google Gemini (генерация ответов)
│   │   ├── prompts/                  # Шаблоны промптов для AI
│   │   └── gemini.adapter.ts         # Реализация порта для LLM
│   ├── vectorstore/                  # Адаптер векторной БД (например, Qdrant)
│   ├── embeddings/                   # Адаптер сервиса генерации эмбеддингов
│   └── processing/                   # Адаптер для парсинга и разбиения кода (Chunking)
│
├── interface/                        # 🌐 ВХОДЯЩИЕ АДАПТЕРЫ (Primary Adapters)
│   └── http/                         # Транспортный слой (Express.js)
│       ├── controllers/              # Прием запросов и вызов Use Cases
│       ├── dto-validators/           # Схемы валидации (Zod)
│       ├── middlewares/              # Обработка ошибок, CORS, логирование запросов
│       ├── express.ts                # Конфигурация Express сервера
│       └── root-router.ts            # Точка сборки всех роутов
│
├── shared/                           # 🛠️ ОБЩИЙ СЛОЙ (Shared Kernel)
│   ├── errors/                       # Базовые классы ошибок (AppError)
│   ├── infrastructure/               # Низкоуровневые технические клиенты
│   │   ├── clients/                  # Инициализация Axios, Redis, BullMQ
│   │   └── logger/                   # Настройка системы логирования (Pino)
│   ├── lib/                          # Сторонние библиотеки/обертки
│   └── utils/                        # Чистые утилитарные функции
│
├── config/                           # ⚙️ КОНФИГУРАЦИЯ
│   └── env-config.ts                 # Валидация и доступ к переменным окружения
│
└── main.ts                           # 🚀 ТОЧКА ВХОДА (App Bootstrap)
```

---

### 🛠 Технологический стек

### 🚀 Core Runtime

- **Runtime:** [Node.js 24](https://nodejs.org/)
- **Language:** [TypeScript 6](https://www.typescriptlang.org/)
- **Bundler:** [Vite 8](https://vitejs.dev/)
- **Dev Tooling:** `tsx`

### 🧠 AI & Data Integrity

- **AI Engine:** [@google/genai](https://www.npmjs.com/package/@google/genai)
- **Validation:** [Zod](https://zod.dev/)

### 🌐 Infrastructure & Networking

- **Server:** [Express 5](https://expressjs.com/)
- **HTTP Client:** [Axios](https://axios-http.com/) + кастомная логика ретраев (`withRetry`) для стабильного взаимодействия с GitHub API.
- **CI/CD:** Jenkins + Docker
- **Logging:** [Pino](https://getpino.io/) + `pino-pretty`

### 💎 Development & Quality

- **Linting:** ESLint 10 + Prettier
- **Type Checking:** TSC
- **Tunneling:** `localtunnel` / SSH-tunnel — проброс портов для тестирования GitHub Webhooks в локальном окружении.
