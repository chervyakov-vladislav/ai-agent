# Task 10 — Адаптер GitLab (ключевой корпоративный)

|                 |                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Приоритет**   | 2 — после Task 09                                                                                                                                                               |
| **Зависимости** | Task 09 (каркас), Task 07 (мок — сразу; туннель — для боевых вебхуков), Task 08 (LLM-стратегии: в корпорате — профиль Qwen поверх generic-транспорта), Task 14 (queue-пайплайн) |

## Контекст

GitLab — основная VCS корпоративного контура (подтверждено). Первый полноценный адаптер на каркасе из Task 09. Модель якорей inline-комментариев у GitLab отличается от GitHub: discussions с `position` (base_sha / head_sha / old_line / new_line) — это самая специфичная часть задачи.

## Объём работ

### 1. Вебхук

- `dto-validators/webhook/gitlab.schema.ts`: события MR (`opened` / `updated` / `merged`) → `WebhookCommands`
- Семантика по аналогии с GitHub-схемой: `opened`/`updated` → analyze, `merged` в default branch → indexing
- Проверка `X-Gitlab-Token` (middleware из Task 09)
- Fixture `fixtures/webhook/gitlab-mr-opened.json` для мока из Task 07

### 2. Модуль `modules/vcs-gitlab/` (Service-Adapter)

- `gitlab.service.ts`: REST API v4 — получение diff MR, содержимого файлов, публикации ревью
- `gitlab.adapter.ts`: реализация `PullRequestSourcePort` + `RepoSourcePort`
- Публикация: summary-комментарий в MR + inline через discussions (`position`: base_sha/head_sha, old/new line)
- Auth: `PRIVATE-TOKEN`; env `GITLAB_URL`, `GITLAB_TOKEN` (в env-config, условно-обязательные)
- `gitlab.mapper.ts`: payload/ответы API → доменные типы (`FilteredFileDiff` и т.д.)

### 3. Проверка

- Полный цикл на тестовом MR в корпоративном GitLab (или локально через мок)

## Критерии приёмки (DoD)

- [ ] MR в GitLab: webhook → анализ → summary + inline-комментарии в изменённые строки
- [ ] merged в default branch → dispatchIndexing (паритет с GitHub-флоу)
- [ ] Мок GitLab-вебхука работает локально (`npm run mock:webhook -- --vcs gitlab`)
- [ ] Захардкоженных gitlab-зависимостей в контрактах нет (всё через порты/фабрику)
- [ ] `lint` + `typecheck` чистые
