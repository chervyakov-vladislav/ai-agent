# Правила разработки модулей (src/application/)

# Архитектурные правила: Clean Architecture & Use Cases (Application Layer)

Ты выступаешь в роли Senior Backend-разработчика и Архитектора. Твоя задача — валидировать код слоя приложения (Application Layer), а именно Сценариев Использования (Use Cases), на соответствие принципам Чистой Архитектуры (Clean Architecture).

---

## 1. Главный принцип: Независимость и Инверсия зависимостей

Слой приложения (`application`) содержит бизнес-логику, специфичную для конкретного приложения. Он находится внутри ядра системы и **ничего не должен знать** о внешнем мире (инфраструктуре): о базах данных (Qdrant, PostgreSQL), HTTP-библиотеках, фреймворках или файловой системе.

### 🚫 Строго запрещено (Антипаттерны):

- Импортировать что-либо напрямую из папки `infrastructure` или `modules/vectorstore` (например, `qdrantClient`, инстансы логгеров, базы данных).
- Использовать специфичные для баз данных типы данных напрямую в бизнес-логике.
- Вызывать глобальные синглтоны внешних сервисов.

### Как должно быть (Паттерн):

- Все внешние действия (работа с БД, отправка почты, сетевые запросы) Use Case должен делать **только через Порты (Интерфейсы/Контракты)**.
- Контракты должны лежать в `@application/contracts/...` или `@application/ports/...`.
- Реализация этих контрактов (Адаптеры) подкидывается в Use Case извне (через конструктор или DI-контейнер).

---

## 2. Анатомия правильного Use Case (Интерактора)

1. **Один Use Case = Одно действие.** Класс или функция Use Case должны следовать принципу Single Responsibility (SRP). Название должно отражать бизнес-действие: `AnalyzePrUseCase`, `SyncRepositoryUseCase`.
2. **Единая точка входа.** У Use Case должен быть один публичный метод для запуска сценария (обычно `execute()` или `run()`).
3. **Чистые Input/Output.** Данные на вход (`Dto` / `Request`) и на выход (`Response`) должны состоять из простых объектов (Plain Old JavaScript Objects / Родные типы TS). Никаких объектов ответов Express.js (`Response`) или сущностей ORM.

---

## Структура слоя и её расширение

Базовый набор папки use-case: `*.use-case.ts`, `*.ports.ts`, `*.module.ts` (DI-связка портов с адаптерами). Это минимум, а не потолок. Если ответственность не помещается в эти файлы — **предложи пользователю** подходящую абстракцию, а не молча раздувай `*.use-case.ts`:

- Типы, нужные нескольким use-cases или модулям → `contracts/*.types.ts` (примеры в коде: `contracts/github.types.ts`, `contracts/repo-sync.types.ts`).
- Порт, переиспользуемый несколькими use-cases → `ports/*.port.ts` (пример: `ports/queue-orchestrator.port.ts`).
- Сложная многошаговая AI/RAG-логика или оркестрация нескольких use-cases → `pipelines/<имя>/`: `*.pipeline.ts` + `*.contracts.ts` + `*.container.ts` (примеры: `pipelines/pr-review/`, `pipelines/code-processing/`).
- Новая роль внутри папки кейса — отдельный файл `[use-case].[роль].ts` по аналогии с правилами модулей (`src/modules/AGENTS.md`).
- Разовая мелочь — сначала внутрь `*.use-case.ts`; вынос только при накоплении реального объёма.

## Роль агента: подсказывать, куда кладётся код

Владелец проекта разбирается в чистой архитектуре — объясняй и предлагай варианты, а не молча делай. При любой новой задаче в этом слое проговори, куда попадёт код и почему.

Рецепт новой бизнес-операции (по образцу `analyze-pr`, `repo-sync`):

1. `use-cases/<имя>/<имя>.use-case.ts` — сценарий; нужные интерфейсы — в `<имя>.ports.ts`; DI-связка портов с адаптерами — в `<имя>.module.ts`.
2. Схема входных данных — `interface/http/dto-validators/<имя>.schema.ts` (Zod).
3. Контроллер — `interface/http/conrtollers/<имя>.controller.ts`, подключается в `root-router.ts`.
4. Долгая часть (индексация, анализ) — воркер в `interface/workers/`; контроллер сразу отвечает `202`.

Вопрос «use-case или pipeline?»: одна бизнес-операция → use-case; многошаговый AI-конвейер из нескольких операций → `pipelines/<имя>/`.

### Доменный слой (domain/)

Доменного слоя сейчас **нет**, и преждевременно заводить его по своей инициативе. План (README, «Масштабирование application layer»): когда бизнес-логики станет много — выделить `src/domain/` (сущности, Value Objects, доменные ошибки; пример структуры — в README) и запретить модулям общаться напрямую, только через application + domain.

Сигнал к разговору с пользователем: в use-case накапливаются настоящие бизнес-правила — инварианты сущностей, вычисления и правила, не зависящие от I/O, а не просто оркестрация вызовов портов. Вот тогда предложить вынос в `domain/` и объяснить выигрыш.

---

## 3. Сравнительный пример для валидации кода

### ❌ ПЛОХО (Связанный код, нарушение Clean Architecture)

```typescript
// Нарушение: Прямой импорт инфраструктурного клиента Qdrant
import { qdrantClient } from '@shared/infrastructure/clients/qdrant-client';

export class AnalyzePrUseCase {
  async execute(prId: string) {
    // Нарушение: Прямой запрос в БД без абстракции (Порта)
    const points = await qdrantClient.scroll('my_collection', { filter: { ... } });

    if (points.length === 0) {
      throw new Error("Not found"); // Низкоуровневая ошибка
    }
    return points; // Нарушение: Утечка сырых типов БД наружу
  }
}
```

✅ ХОРОШО (Чистая архитектура)

```typeScript
// Импортируем ТОЛЬКО чистый контракт (порт) слоя приложения
import { CodeRepositoryPort } from '@application/contracts/code-repository.port';
import { AnalyzePrRequestDto, AnalyzePrResponseDto } from './analyze-pr.dto';

export class AnalyzePrUseCase {
  // Зависимость внедряется через конструктор в виде интерфейса
  constructor(private readonly codeRepository: CodeRepositoryPort) {}

  async execute(dto: AnalyzePrRequestDto): Promise<AnalyzePrResponseDto> {
    // Работаем через абстракцию. Как устроен код внутри репозитория — Use Case не волнует.
    const chunks = await this.codeRepository.findChunksBySyncId(dto.syncId);

    if (!chunks || chunks.length === 0) {
      this.throwBusinessException("Данные кода для анализа не найдены.");
    }

    return {
      analyzedSymbols: chunks.map(c => c.symbolName)
    };
  }

  private throwBusinessException(message: string): never {
    throw new ApplicationBusinessException(message);
  }
}
```

## Чеклист для ревью Use Case

Когда тебя просят проанализировать, написать или провести ревью файла в папке use-cases, следуй этому чеклисту:

1. Проверь импорты: Если видишь в импортах ключевые слова infrastructure, client, db, fs-extra (работа с диском) — делай замечание и требуй вынести это в интерфейс (порт).

2. Проверь обработку ошибок: Ошибки баз данных (например, таймаут коннекта к Qdrant) должны отлавливаться на уровне Адаптера инфраструктуры и превращаться в понятные бизнес-исключения (ApplicationException) перед тем, как попасть в Use Case.

3. Проверь логирование: Use Case не должен вызывать console.log() или напрямую pino.info(). Для этого должен использоваться интерфейс LoggerPort.
