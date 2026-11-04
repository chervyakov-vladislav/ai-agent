# Task 08 — LLM-модуль со стратегиями провайдеров (Qwen по умолчанию)

|                 |                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Приоритет**   | 1 — независимо от остальных                                                                                                                                 |
| **Зависимости** | нет                                                                                                                                                         |
| **Решение**     | Стратегия вместо «модуль на провайдера»: общий оркестратор + тонкие транспортные стратегии. Дефолт — Qwen, Gemini сохраняется, новая интеграция = один файл |

## Контекст

Переезд с Gemini на корпоративный Qwen (подтверждено: OpenAI-совместимый endpoint). Вместо параллельного модуля `llm-qwen` — общий модуль `modules/llm/` со стратегиями: оркестрация двухшагового пайплайна (step1 на файл → step2 summary), цикл по моделям-фолбэкам, retry и Zod-валидация одинаковы для всех провайдеров и живут в одном месте.

Ключевое разделение ответственности:

- **Стратегия — только транспорт**: `complete({ model, system, prompt, jsonMode }) → string`
- **Сервис — вся оркестрация**: логика текущего `gemini.service.ts` (fallback-цикл, `withRetry`, валидация), но провайдер-нейтральная

## Дизайн

```
modules/llm/
├── llm.adapter.ts            # реализация LlmPort → сервис
├── llm.service.ts            # оркестратор: цикл по фолбэк-моделям стратегии,
│                             # withRetry, Zod-валидация (общие схемы), логирование
├── llm.types.ts              # интерфейс LlmStrategy, тип LlmProvider
├── llm.constants.ts          # реестр стратегий { gemini, qwen }
├── llm.factory.ts            # инстанс по env, fail fast при неизвестном провайдере
└── strategies/
    ├── gemini/
    │   ├── gemini.strategy.ts     # транспорт @google/genai — код переносится из gemini.service
    │   └── gemini.constants.ts    # цепочка моделей-фолбэков (бывш. MODEL_FALLBACKS)
    └── qwen/
        ├── qwen.strategy.ts       # транспорт: axios → ${QWEN_BASE_URL}/v1/chat/completions
        └── qwen.constants.ts      # цепочка моделей
```

Стратегии как подпапка — соответствует конвенции модулей (выделенная ответственность = подпапка по роли).

## Объём работ

### 1. Нейтральные общие части (выносятся из `llm-gemini`)

- Промпты из `modules/llm-gemini/prompts/` → `application/pipelines/pr-review/prompts/` (модель-агностичны, принадлежат пайплайну)
- Zod-схемы ответа (`gemini.validator.ts`) → `contracts/llm.validators.ts` (общие для всех стратегий)
- `contracts/llm.types.ts`: убрать импорт `GithubFileStatus` (координация с Task 09 — переедет в vcs-нейтральные типы)

### 2. Модуль `modules/llm/` (Service-Adapter + стратегии)

- `llm.service.ts`: `reviewSingleFile` / `generateSummary` — оркестрация из `gemini.service.ts`, провайдер-нейтральная: получает стратегию из фабрики, итерирует `strategy.models`, вызывает `strategy.complete`, валидирует общими схемами, ретраит
- `strategies/gemini/`: текущий `callModel` (@google/genai, systemInstruction + `responseMimeType: application/json`) — **переносится, не переписывается**
- `strategies/qwen/`: axios POST `${QWEN_BASE_URL}/v1/chat/completions` (system + user), `response_format: json_object` при поддержке; если нет — JSON фиксируется промптом (валидация + retry уже в сервисе)
- `llm.adapter.ts`: реализация `LlmPort`; DI в `pr-review.container` / `analyze-pr.module` перестаёт зависеть от провайдера

### 3. Конфигурация

- `LLM_PROVIDER`: enum `qwen | gemini`, **default `qwen`**
- `QWEN_BASE_URL`, `QWEN_API_KEY`, `QWEN_MODELS` — условно-обязательные при `LLM_PROVIDER=qwen` (zod superRefine в env-config)
- `GEMINI_API_KEY`, `GEMINI_MODELS` — условно-обязательные при `LLM_PROVIDER=gemini`
- `.env.example` обновить

### 4. Чистка

- `modules/llm-gemini/` удалить после переноса (код сохранён в стратегии)

## Как добавляется провайдер потом (проверка архитектуры)

1. `strategies/<name>/<name>.strategy.ts` — транспорт (+ константы моделей)
2. Запись в реестр `llm.constants.ts` + env-поля в superRefine
3. Всё — `llm.service`, `llm.adapter`, DI, валидаторы и промпты не меняются

## Критерии приёмки (DoD)

- [ ] Без `LLM_PROVIDER` в env — используется Qwen; PR отревьюен через корпоративный endpoint
- [ ] `LLM_PROVIDER=gemini` — тот же PR через Gemini, поведение прежнее
- [ ] Zod-валидация ловит невалидный JSON стратегии (проверка на битом fixture)
- [ ] `modules/llm-gemini` удалён; оркестрация (fallback/retry/валидация) ровно одна, в `llm.service`
- [ ] Добавление нового провайдера не требует правок `llm.service` / `llm.adapter` (только файл стратегии + реестр)
- [ ] `lint` + `typecheck` чистые
