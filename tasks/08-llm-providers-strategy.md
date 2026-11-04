# Task 08 — LLM-модуль со стратегиями провайдеров (OpenAI-compatible + Gemini)

|                 |                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Приоритет**   | 1 — независимо от остальных                                                                                                                                                                                                  |
| **Зависимости** | нет                                                                                                                                                                                                                          |
| **Решение**     | Одна generic-стратегия `openai-compatible` + env-профили к ней (GLM, Qwen, любой vLLM/OpenRouter); Gemini — отдельная стратегия на родном SDK. Дефолт — GLM (доступна сейчас), в корпорате переключение на Qwen = только env |

## Контекст

Переезд с Gemini на OpenAI-совместимые модели. Немедленно доступна GLM (локальный домашний endpoint); корпоративный Qwen появится позже — и его подключение должно быть **чистой конфигурацией**: `LLM_PROVIDER=qwen` + адрес корпоративного endpoint, без правок кода.

Архитектурно: `LlmPort` уже есть, двухшаговый пайплайн (step1 на файл → step2 summary), Zod-валидаторы и retry — модель-агностичны. Ключевое разделение:

- **Стратегия — только транспорт**: `complete({ model, system, prompt, jsonMode }) → string`
- **Сервис — вся оркестрация**: логика текущего `gemini.service.ts` (fallback-цикл, `withRetry`, валидация), провайдер-нейтральная

## Дизайн

```
modules/llm/
├── llm.adapter.ts              # реализация LlmPort → сервис
├── llm.service.ts              # оркестратор: цикл по фолбэк-моделям, withRetry,
│                               # Zod-валидация (общие схемы), логирование
├── llm.types.ts                # LlmStrategy, LlmProvider, OpenAiCompatibleProfile
├── llm.constants.ts            # реестр профилей { glm, qwen } + gemini
├── llm.factory.ts              # выбор стратегии по env, fail fast при неизвестном
└── strategies/
    ├── openai-compatible/
    │   ├── openai.strategy.ts      # generic транспорт: axios → ${baseUrl}/chat/completions
    │   └── openai.constants.ts     # дефолты (таймауты и пр.)
    └── gemini/
        ├── gemini.strategy.ts      # транспорт @google/genai — код переносится из gemini.service
        └── gemini.constants.ts     # цепочка моделей (бывш. MODEL_FALLBACKS)
```

Профиль OpenAI-совместимого провайдера (данные, не код):

```typescript
interface OpenAiCompatibleProfile {
  baseUrl: string; // GLM: домашний endpoint; Qwen: корпоративный vLLM
  apiKey: string;
  models: string[]; // цепочка фолбэков
  extraBody?: Record<string, unknown>; // GLM: { thinking: { type: 'disabled' } },
} // Qwen3: { enable_thinking: false } — у каждой свой формат
```

Один класс `OpenAiCompatibleStrategy` инстанцируется профилем; `glm` и `qwen` — два профиля, а не два файла.

## Объём работ

### 1. Нейтральные общие части (выносятся из `llm-gemini`)

- Промпты из `modules/llm-gemini/prompts/` → `application/pipelines/pr-review/prompts/` (модель-агностичны, принадлежат пайплайну)
- Zod-схемы ответа (`gemini.validator.ts`) → `contracts/llm.validators.ts` (общие для всех стратегий)
- `contracts/llm.types.ts`: убрать импорт `GithubFileStatus` (координация с Task 09 — переедет в vcs-нейтральные типы)

### 2. Модуль `modules/llm/` (Service-Adapter + стратегии)

- `llm.service.ts`: `reviewSingleFile` / `generateSummary` — оркестрация из `gemini.service.ts`, провайдер-нейтральная: стратегия из фабрики, итерация `profile.models`, `strategy.complete`, общие Zod-схемы, retry
- `strategies/openai-compatible/`: generic-транспорт на axios — POST `${baseUrl}/chat/completions`, `messages` (system + user), `response_format: json_object` при поддержке; `extraBody` профиля мержится в тело (thinking-режим отключается здесь — форматы полей у GLM и Qwen разные, но это данные профиля)
- `strategies/gemini/`: текущий `callModel` (@google/genai, systemInstruction + `responseMimeType: application/json`) — **переносится, не переписывается**
- `llm.constants.ts`: реестр `{ glm: profile, qwen: profile }` + `gemini`; `llm.factory.ts`: инстанс по env
- `llm.adapter.ts`: реализация `LlmPort`; DI в `pr-review.container` / `analyze-pr.module` не зависят от провайдера
- Если JSON-режим endpoint не поддерживает — JSON фиксируется промптом (валидация + retry уже в сервисе)

### 3. Конфигурация

- `LLM_PROVIDER`: enum `glm | qwen | gemini`, **default `glm`** (доступна сейчас)
- Профили (условно-обязательные по провайдеру, zod superRefine в env-config):
  - `GLM_BASE_URL`, `GLM_API_KEY`, `GLM_MODELS`, `GLM_EXTRA_BODY?`
  - `QWEN_BASE_URL`, `QWEN_API_KEY`, `QWEN_MODELS`, `QWEN_EXTRA_BODY?` — заполняются в корпорате при переключении
  - `GEMINI_API_KEY`, `GEMINI_MODELS`
- `*_MODELS` — список через запятую; `*_EXTRA_BODY` — JSON-строка
- `.env.example` обновить с обоими профилями

### 4. Чистка

- `modules/llm-gemini/` удалить после переноса (код сохранён в стратегии)

## Как добавляется провайдер потом (проверка архитектуры)

- **OpenAI-совместимый** (vLLM, OpenRouter, DeepSeek, …): блок env-переменных + строка в реестре профилей `llm.constants.ts` — **ноль правок кода**
- **Не-OpenAI** (Anthropic и т.п.): новая стратегия-файл + строка в реестре; `llm.service` / `llm.adapter` / DI не меняются

## Технические заметки

- Сценарий пользователя: дома `LLM_PROVIDER` не задан → GLM на локальном endpoint; в корпорате — `LLM_PROVIDER=qwen` + `QWEN_*` с адресом корпоративного vLLM. Это одна и та же generic-стратегия с разными профилями
- Thinking-режим (GLM-4.x, Qwen3) может ломать JSON-ответ — глушится через `extraBody` профиля; имена полей у провайдеров разные, поэтому это данные, а не код
- `response_format` зависит не от модели, а от сервинга (vLLM — guided decoding); fallback на промпт-JSON уже в сервисе
- Errors/лимиты (429): `withRetry` + `isRetryable` работают по статусам — провайдер-нейтрально
- GLM-профиль живёт **только на квотах подписки** (Coding Plan): pay-as-you-go не используется, доплат нет — при исчерпании квоты запросы отклоняются до сброса окна. Ключ подписки работает только на coding-эндпоинте `https://api.z.ai/api/coding/paas/v4` (общий `paas/v4` — другой биллинг, будет ошибка)
- Исчерпание квоты тарифа (окно ~5 ч / concurrency) — штатная ситуация, не авария: отличать от секундного троттлинга и быстро завершать джобу понятной ошибкой (повтор — политиками BullMQ из Task 14), а не ретраить в пустоту
- Бюджет вызовов на квоту тарифа: ручка `LLM_MAX_BLOCKS_PER_PR` (кап блоков диффа на один ревью, сверх — сводное «не проверено») и `maxConcurrency` в профиле — большой PR не должен съедать окно тарифа. Отключение thinking экономит не квоту (она по промптам), а время и надёжность

## Критерии приёмки (DoD)

- [ ] Без `LLM_PROVIDER` в env — используется GLM; PR отревьюен через домашний GLM endpoint
- [ ] `LLM_PROVIDER=qwen` + `QWEN_*` (тестовый адрес) — тот же PR через Qwen, **код не менялся** (репетиция корпоративного переключения)
- [ ] `LLM_PROVIDER=gemini` — тот же PR через Gemini, поведение прежнее
- [ ] Zod-валидация ловит невалидный JSON стратегии (проверка на битом fixture)
- [ ] `modules/llm-gemini` удалён; оркестрация (fallback/retry/валидация) ровно одна, в `llm.service`
- [ ] Новый OpenAI-совместимый провайдер добавляется без правок кода (env-блок + строка в реестре профилей)
- [ ] `lint` + `typecheck` чистые
