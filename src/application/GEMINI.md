- **Важно:** Начинай каждый ответ по фронтенду со слова "ФРОНТ:".

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

## Инструкция для Gemini при анализе кода Use Case

Когда тебя просят проанализировать, написать или провести ревью файла в папке use-cases, следуй этому чеклисту:

1. Проверь импорты: Если видишь в импортах ключевые слова infrastructure, client, db, fs-extra (работа с диском) — делай замечание и требуй вынести это в интерфейс (порт).

2. Проверь обработку ошибок: Ошибки баз данных (например, таймаут коннекта к Qdrant) должны отлавливаться на уровне Адаптера инфраструктуры и превращаться в понятные бизнес-исключения (ApplicationException) перед тем, как попасть в Use Case.

3. Проверь логирование: Use Case не должен вызывать console.log() или напрямую pino.info(). Для этого должен использоваться интерфейс LoggerPort.
