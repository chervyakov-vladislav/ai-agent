# Task 11 — Адаптер Bitbucket (отложен — стартовать только при реальной потребности)

|                 |                                                                          |
| --------------- | ------------------------------------------------------------------------ |
| **Приоритет**   | 3 — опционально, в корпоративном контуре основная VCS — GitLab (Task 10) |
| **Зависимости** | Task 09                                                                  |

## Контекст

Стратегически каркас из Task 09 делает добавление Bitbucket дешёвым, но в корпоративном контуре основная VCS — GitLab. Задача запускается только если появится реальный Bitbucket-проект.

## Объём работ

### 0. Уточнить flavour (влияет на API и подписи)

- **Server / Data Center** (self-hosted): REST API свою версию, подпись `X-Hub-Signature-256`
- **Cloud**: другой REST API (api.bitbucket.org), подпись `X-Signature`

### 1. Вебхук

- `dto-validators/webhook/bitbucket.schema.ts`: события PR → `WebhookCommands`
- Fixture для мока из Task 07

### 2. Модуль `modules/vcs-bitbucket/` (Service-Adapter)

- `bitbucket.service.ts`: REST API — diff PR, содержимое файлов, публикация комментариев (модели якорей строк отличаются между Server и Cloud — уточнить на шаге 0)
- `bitbucket.adapter.ts`: реализация `PullRequestSourcePort` + `RepoSourcePort` через фабрику из Task 09
- Auth: токен по flavour; env `BITBUCKET_URL` (Server) / `BITBUCKET_TOKEN`

## Критерии приёмки (DoD)

- [ ] Flavour зафиксирован (Server/DC или Cloud)
- [ ] Полный цикл review на Bitbucket по аналогии с Task 10
- [ ] Мок Bitbucket-вебхука работает локально
- [ ] `lint` + `typecheck` чистые
