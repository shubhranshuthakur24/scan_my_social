# .agents Guide

## Purpose

This folder contains reusable skill instructions for coding tasks.
Use these skills with either:

1. Codex execution flow (implementation-first), or
2. Antigravity agent prompts (strategy/audit flow in `resources/.antigravity/agents`).

## Folder Map

1. Skills: `.agents/skills/*/SKILL.md`
2. Skill rule packs: `.agents/skills/laravel-best-practices/rules/*.md`
3. Antigravity prompts: `resources/.antigravity/agents/*.md`

## When to Use Each Skill

| Skill | Use When | Expected Output Format |
|---|---|---|
| `laravel-best-practices` | Any Laravel backend change/review (controllers, models, migrations, validation, queues, security, performance) | For review tasks: findings by severity (`Critical`, `Major`, `Medium`, `Minor`) + concrete fixes. For implementation tasks: `Plan`, `Changes`, `Risk notes`, `Validation`, `Next action`. |
| `inertia-react-development` | Inertia React pages, navigation, forms (`Link`, `Form`, `useForm`, router), deferred props, polling | `Plan`, page/component changes, UX/loading/error handling, validation status. |
| `tailwindcss-development` | Utility-class styling, responsive layouts, Tailwind class fixes, dark-mode parity (project is Tailwind v3) | `Plan`, UI class changes, responsive/dark-mode notes, verification checklist. |
| `socialite-development` | OAuth/Social login setup and fixes (redirect/callback, scopes, provider mapping, testing) | `Plan`, auth flow changes, security checks (`state`, redirects, account linking), validation/test status. |

## Antigravity Agent Prompts

Use these from `resources/.antigravity/agents` when you need strict review or strategy framing.

| Agent Prompt | Use When | Required Output Shape |
|---|---|---|
| `codex-agent.md` | Day-to-day implementation with strict safety | `Plan` -> `Changes made` -> `Risk notes` -> `Validation status` -> `Next action` |
| `backend-agent.md` | Strict Laravel backend code review | `Summary` -> `Critical` -> `Major` -> `Medium` -> `Minor` -> `Required fixes` |
| `frontend-agent.md` | Strict frontend/UI architecture and performance review | `Summary` -> `Critical` -> `Major` -> `Medium` -> `Minor` -> `Required fixes` |
| `production-audit-agent.md` | Final production-readiness audit | `Production verdict` -> `Critical failures` -> `Major` -> `Medium` -> `Minor` -> `Required fixes` -> `Scores` |
| `antigravity-agent.md` | Growth/positioning/monetization strategy execution | `Plan` -> `Strategic decisions` -> `Execution steps` -> `Metrics` -> `Risks` -> `Next action` |
| `autodm.md` | AutoDM product strategy planning | Follow sections defined in file (`Positioning`, `Core strategy`, `Growth loops`, etc.) |

## How to Use With Codex

1. Choose one base mode:
`codex-agent.md` for implementation or `backend/frontend/production-audit` for review.
2. Add relevant skill(s) from `.agents/skills`.
3. Provide task scope and target files.
4. Require expected output format explicitly.

Prompt template:

```text
Use base agent: resources/.antigravity/agents/codex-agent.md
Apply skills: .agents/skills/laravel-best-practices/SKILL.md, .agents/skills/socialite-development/SKILL.md
Task: <exact task>
Scope: <files/routes/tests>
Output format: Plan, Changes made, Risk notes, Validation status, Next action
```

## How to Use With Antigravity

1. Select the antigravity prompt file for your goal.
2. Paste it first in the chat/session.
3. Add your project-specific context and constraints.
4. Ask for output exactly in that file's required sections.

Prompt template:

```text
Use agent prompt: resources/.antigravity/agents/production-audit-agent.md
Scope: auth, billing, queues, webhooks
Constraints: assume hostile production traffic, list findings by severity
Output: exactly the required sections from the prompt file
```

## Selection Rules

1. Backend auth/security/data integrity: `laravel-best-practices` (+ `socialite-development` if OAuth).
2. Inertia UI flow/forms: `inertia-react-development` (+ `tailwindcss-development` for styling).
3. Release readiness: `production-audit-agent.md`.
4. Strategy/growth: `antigravity-agent.md` or `autodm.md`.
