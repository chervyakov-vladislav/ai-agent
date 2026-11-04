# Task 17 — CI: GitHub Actions (портируемый, с заделом на GitLab CI/Jenkins)

|                 |                                                                    |
| --------------- | ------------------------------------------------------------------ |
| **Приоритет**   | 2 — после Task 16                                                  |
| **Зависимости** | Task 16 (тесты — главная ценность прогона), Task 04 (node:26 в CI) |
| **Открывает**   | автопроверку PR; быстрый перенос на корпоративный CI               |

## Контекст

Сейчас проверки только в pre-commit локально; на PR в GitHub не гоняется ничего. Будущий корпоративный CI не определён (Jenkins или GitLab CI) — поэтому принцип: **вся логика в npm-скриптах, workflow — тонкая обёртка без собственной логики**. Тогда GitLab CI = `.gitlab-ci.yml` с теми же `npm run *`, Jenkins = Jenkinsfile с теми же командами.

## Объём работ

### 1. `.github/workflows/ci.yml`

- Триггеры: `pull_request` + `push` в `develop`, `master`
- Job (один, последовательные шаги): checkout → `setup-node` (версия из `.nvmrc`, cache: npm) → `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`
- Никаких скриптовых шагов кроме `npm run *` — принцип портируемости

### 2. Dependabot

- Проверить `.github/dependabot.yml`: добавить экосистему `github-actions` для апдейта экшенов

### 3. README

- Бейдж статуса CI

## Технические заметки

- До Task 04 — в CI временно node:24 (или читать `.nvmrc`, если Task 04 уже добавил)
- Required status checks (branch protection на develop/master) — настройка в UI GitHub, вручную после первого зелёного прогона
- Двойник под GitLab CI / Jenkinsfile — отдельная задача в момент переезда репо в корпоративный контур; сейчас не создавать
- Job интеграционных тестов (`test:integration` из Task 18) добавляется в workflow отдельным шагом, когда Task 18 реализован

## Критерии приёмки (DoD)

- [ ] PR в develop запускает пайплайн; lint/typecheck/test/build проходят
- [ ] Намеренно сломанный тест/тип роняет пайплайн (проверено в отдельной ветке)
- [ ] `grep -n "run:" .github/workflows/ci.yml` показывает только npm-команды
- [ ] Кэш node_modules работает (второй прогон быстрее)
- [ ] Dependabot апдейтит actions
