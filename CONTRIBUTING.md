# Contributing to Outless Frontend

Thanks for your interest in the Outless frontend.

## What is Outless

Outless is a VLESS node management system. This frontend provides the admin UI for managing nodes, groups, and access tokens.

**Stack:** Nuxt 4 + TypeScript + Shadcn-vue + TanStack Query + Zod.

---

## Architecture Rules

### 1. Zero-CSS Policy

- **FORBIDDEN:** `<style>` blocks in `.vue` files
- **FORBIDDEN:** SCSS/SASS
- **FORBIDDEN:** Inline `style="..."` attributes
- **REQUIRED:** Tailwind classes only
- **REQUIRED:** Mobile-first design

### 2. File Size Limits

| File Type | Max Lines | Action if Exceeded |
|-----------|-----------|-------------------|
| Component (`.vue`) | 250 | Extract logic to `composables/` |
| Composable (`.ts`) | 200 | Split into smaller utility functions |
| Service (`.ts`) | 150 | Separate by API domains |

**STOP:** Discuss architecture before creating files that violate these limits.

### 3. Data Integrity (Zod)

**No manual interfaces.** All types derived from schemas.

```typescript
// app/utils/schemas/task.ts
export const TaskSchema = z.object({
  id: z.number(),
  title: z.string().min(3),
  status: z.enum(['todo', 'done'])
})

export type Task = z.infer<typeof TaskSchema>

// Validation at boundaries
export const fetchTask = async (id: number): Promise<Task> => {
  const data = await $fetch(`/api/tasks/${id}`)
  return TaskSchema.parse(data)
}
```

### 4. State Management

1. **Server State (TanStack Query):** All API data (Tasks, Users, Projects)
   - *Forbidden:* Store API data in local state
2. **Client State (Composables/Pinia):** UI-only state (sidebar open, theme, auth token)
   - Use `useState` for persistent cross-component state
   - Use `useCookie` for tokens and settings
3. **Local State (`ref`/`reactive`):** Single-component state only (e.g., `isModalOpen`)

---

## Code Style

### TypeScript

- Strict mode enabled, no `any`
- Prefer `type` over `interface` for simple shapes
- Explicit return types on exported functions

### Vue Components

- Use `<script setup lang="ts">`
- Props: `defineProps<T>()` with Zod validation via `vue-zod`
- Emits: `defineEmits<T>()`
- Model: `defineModel()` for two-way binding

### Composables

- Naming: `useFeature.ts` (not `use-feature.ts`)
- Return object pattern: `return { data, isLoading, error }`
- Cleanup in `onUnmounted` if needed

### Nuxt 4 Patterns

- `shallowRef()` for large API data lists
- `useAsyncData` only in `pages/` for SSR
- `defineAsyncComponent` for heavy charts/modals

---

## Commits

Conventional Commits:

```
feat: add node group accordion component
fix: handle empty node list in group view
docs: update Zod schema examples
refactor: extract useGroups composable
test: add GroupAccordion story
style: fix tailwind class order
```

---

## PR Process

1. Fork → feature branch → PR
2. CI must pass (lint, typecheck, build)
3. Review from maintainer
4. Merge to main — via PR only

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit: API_BASE_URL=http://localhost:8080

# 3. Run dev server
pnpm dev

# 4. Type check
pnpm typecheck
```

---

## Questions?

Open an issue or discussion. Keep it technical and concise.
