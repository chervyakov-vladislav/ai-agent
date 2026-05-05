# AI-Agent for Code Review 🚀

Интеллектуальный агент для автоматического анализа Pull Request'ов. Слушает вебхуки, анализирует код через LLM и дает обратную связь прямо в VCS.

---

## 🛠 Технологический стек

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
| `docker:up:local`     | Запуск базы данных и ИИ-движка в фоновом режиме                 |
| `docker:clean`        | Остановка контейнеров и очистка volume                          |

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

### 🧱 Архитектура (Modular Architecture)

Проект организован по **модульному принципу**, что обеспечивает изоляцию функциональных блоков и упрощает поддержку системы. Каждый модуль инкапсулирует свою логику и предоставляет четкие интерфейсы для взаимодействия.

#### 📂 Основные слои и модули

1.  **`modules/webhooks/github` (Бизнес-логика)**
    - **UseCases**: Сценарии использования (например, анализ PR).
    - **Validators**: Zod-схемы для парсинга ответов AI и фильтрации данных.
    - Клиент для взаимодействия с GitHub REST API. Получение диффов и публикация результатов ревью.
2.  **`modules/llm-gemini` (AI-сервис)**
    - Интеграция с SDK `@google/genai`.
    - Управление промптами и контекстом модели Gemini 3 Flash.
3.  **`shared/` (Общий слой)**
    - **Infrastructure**: Конфигурация логгера (Pino), HTTP-клиента (Axios) и логика повторных запросов (`retry`).
    - **Errors**: Глобальные классы ошибок (например, `AiServiceError`).
    - **Types**: Общие интерфейсы и типы данных.

#### 🔄 Поток обработки данных

Система следует строгому пайплайну обработки данных:

1.  **Webhook Interface**: Прием события от GitHub.
2.  **UseCase**: Координация процесса (сбор данных PR, вызов AI).
3.  **Zod Validation (Input)**: Проверка структуры входящих данных.
4.  **AI Service**: Генерация обзора кода.
5.  **Zod Validation (Output)**: Валидация ответа AI и очистка от галлюцинаций.
6.  **GitHub Publish**: Публикация финального ревью в репозиторий.

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
├── interface/
│   └── http/
│       ├── middlewares/            # Прослойки (логирование, ошибки, auth)
│       │   └── error-filter.ts     # Глобальный обработчик ошибок
│       ├── app.ts                  # Конфигурация Express
│       └── root-router.ts          # Главный роутер, объединяющий роутеры модулей
│
├── modules/                        # Бизнес-логика приложения
│   ├── llm-gemini/                 # Модуль взаимодействия с Google Gemini
│   │   ├── prompts/
│   │   ├── ai-review-output.schema.ts
│   │   └── gemini.service.ts
│   │
│   ├── webhooks/                   # Прием внешних событий
│   │   └── github/
│   │       ├── use-cases/          # Сценарии обработки конкретных событий
│   │       ├── github.controller.ts
│   │       ├── github.service.ts
│   │       ├── github.mapper.ts
│   │       ├── github.types.ts
│   │       ├── github.constants.ts
│   │       └── webhook.router.ts
│   │
│   ├── processing/                 # Оркестрация процесса анализа
│   ├── repo-query/                 # Работа с кодовой базой
│   ├── vectorstore/                # Индексация для RAG
│   └── health/                     # Проверка состояния сервиса
│
├── shared/                         # Общий код
│   ├── errors/                     # Централизованные классы ошибок
│   ├── infrastructure/             # Техническая реализация (Axios, DB Clients)
│   │   ├── axios/
│   │   └── logger/                 # Логирование (Pino)
│   └── types/                      # Общие TS интерфейсы
│
├── config/                         # Конфигурация окружения
│   └── env-config.ts               # Валидация .env
│
└── main.ts                         # Точка входа
```

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

## Инициализация Ollama (Важно!)

После первого запуска контейнера необходимо вручную загрузить модель для генерации векторов. Без этой модели сервис эмбеддингов работать не будет

```bash
# Скачивание модели nomic-embed-text (размерность 768)
docker exec -it ollama ollama pull nomic-embed-text
```
