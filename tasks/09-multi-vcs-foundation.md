# Task 09 — Мульти-VCS каркас: контракты, маршруты, фабрика (GitHub как эталон)

|                 |                                                    |
| --------------- | -------------------------------------------------- |
| **Приоритет**   | 1                                                  |
| **Зависимости** | нет; открывает задачи 10 (GitLab) и 11 (Bitbucket) |

## Контекст

Стратегия: один агент — три VCS (GitHub, GitLab, Bitbucket). Шов уже есть: `GithubWebhookSchema.transform()` в `dto-validators/analyze-pr.schema.ts` выдаёт единый внутренний формат `{analyzeCommand, syncCommand, metadata}`. Каждая VCS получает свою схему с тем же выходом + свой адаптер портов `PullRequestSourcePort` / `RepoSourcePort`. Контроллеры, очереди и use-case'ы не меняются.

## Объём работ

### 1. Нейтральные контракты

- `contracts/vcs.types.ts`:
  - `VcsSource = 'github' | 'gitlab' | 'bitbucket'`
  - `FileStatus` (вместо `GithubFileStatus`)
  - unified `WebhookCommands` — тип вывода transform-схем
- Убрать GitHub-специфику из очередей: `metadata.repoUrl = '/repos/...'` и GitHub API URL в `prUrl` → нейтральные идентификаторы + `source`
- `llm.types.ts` и остальные контракты не зависят от github-типов

### 2. Вебхуки

- `dto-validators/webhook/{github,gitlab,bitbucket}.schema.ts` — каждая схема: валидация payload → тот же `WebhookCommands`
- Маршруты: `/webhook/github/pr`, `/webhook/gitlab/mr`, `/webhook/bitbucket/pr` (явные маршруты проще автодетекта по заголовкам)
- Middleware проверки подписей:
  - GitHub: `X-Hub-Signature-256` (HMAC-SHA256)
  - GitLab: `X-Gitlab-Token` (сравнение токена)
  - Bitbucket: `X-Hub-Signature-256` (Server) / `X-Signature` (Cloud)
  - env `*_WEBHOOK_SECRET`: в production обязательны, в development опциональны (мок из Task 07)

### 3. Фабрика адаптеров

- `modules/github` остаётся эталонной реализацией портов (Service-Adapter по `src/modules/AGENTS.md`)
- `vcs.factory.ts`: отдаёт адаптер `PullRequestSourcePort` / `RepoSourcePort` по `metadata.source`
- Новые выделенные ответственности внутри модулей (мапперы, стратегии, промпты) — отдельный файл/подпапка по роли

## Критерии приёмки (DoD)

- [ ] Контракты не содержат GitHub-типов, `llm.types` от них не зависит
- [ ] GitHub-флоу работает на каркасе без изменения поведения (webhook → 202 → ревью)
- [ ] Подпись вебхука проверяется; без секрета в production — 401
- [ ] Заглушки-схемы gitlab/bitbucket валидируют fixtures и выдают `WebhookCommands`
- [ ] `lint` + `typecheck` чистые
