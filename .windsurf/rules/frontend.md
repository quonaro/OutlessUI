---
trigger: always_on
---
# Frontend Next — Architecture Rules & Standards

> Reference guide for the future YourTask frontend rewrite.
> Stack: Nuxt 4 + Shadcn-vue + TanStack Query + Zod + Pinia.
> This document is the source of truth when the rewrite begins.

---

## Stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | Nuxt 4 | `app/` directory structure |
| Language | TypeScript | strict mode, no `any` |
| UI | Shadcn-vue | atomic components only |
| Styling | Tailwind CSS | utility classes only, zero custom CSS |
| Server state | TanStack Query v5 | reads via `useQuery`, writes via `useMutation` |
| Client state | Pinia | auth session, theme, UI-only state |
| Validation | Zod | schema-first, `z.infer<>` for all types |
| Fetching | ofetch | native Nuxt, no axios |
| Icons | @heroicons/vue | no other icon packs |
| Forms | Vee-Validate + Zod | no manual validation logic |
| Package manager | pnpm | strict mode, `shamefully-hoist=false` |

---

## Hard File Size Limits

| File type | Max lines | Over limit → |
|---|---|---|
| Component (.vue) | 300 | extract logic to `use[FeatureName].ts` |
| Composable (.ts) | 200 | split by responsibility |
| Store (Pinia) | 150 | split into multiple stores |
| Service (.ts) | 150 | split by domain |

**STOP and ask before creating any file that will exceed these limits.**

---

## Directory Structure

```
app/                          # Nuxt 4: all frontend assets live here
  components/
    ui/                       # Shadcn atomic components only. No business logic.
    [shared-component].vue    # Cross-feature shared components
  composables/                # Global composables: useAuth, useApi, usePermissions
  layouts/                    # Page layout templates
  pages/                      # File-based routing (Nuxt auto-generates routes)
  middleware/                 # Route guards (auth, permissions)
  plugins/                    # Nuxt plugins (TanStack Query setup, etc.)

features/
  [feature-name]/
    components/               # Components used only in this feature
    composables/              # Feature-scoped composables
    schemas/                  # Zod schemas + inferred TypeScript types
    services/                 # API call functions for this feature

stores/                       # Pinia stores — client-only global state
types/                        # Shared TypeScript types
```

Rules:
- Component used only inside one feature → `features/[name]/components/`, NOT `app/components/`.
- `app/pages/` contains composition only — no business logic, no API calls directly.
- `app/composables/` is for global composables only. Feature logic goes in `features/[name]/composables/`.

---

## Schema-First Development (Zod)

Every API response must have a Zod schema before writing any component logic.

```typescript
// features/tasks/schemas/task.ts
import { z } from "zod"

export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  status_id: z.number().nullable(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  assignee_ids: z.array(z.number()),
  created_at: z.string().datetime(),
})

// Infer TypeScript type — never write it manually
export type Task = z.infer<typeof TaskSchema>
```

**FORBIDDEN:** manually written TypeScript interfaces for API data:
```typescript
// FORBIDDEN
interface Task {
  id: number
  title: string
  // ...
}

// REQUIRED
type Task = z.infer<typeof TaskSchema>
```

Validate at the API boundary:
```typescript
// services/tasks.ts
export async function fetchTask(id: number): Promise<Task> {
  const raw = await $fetch(`/api/v1/tasks/${id}`)
  return TaskSchema.parse(raw)  // throws if API contract is broken
}
```

---

## Styling — Zero-CSS Policy

- **FORBIDDEN:** `<style>` blocks in any `.vue` file. No exceptions.
- **FORBIDDEN:** `:deep()`, `!important`, inline `style=` attributes.
- **FORBIDDEN:** SCSS/SASS files or imports.
- **FORBIDDEN:** Custom CSS variables declared in components.

If a Shadcn component needs visual modification → edit it directly in `app/components/ui/`.

Mobile-first:
```html
<!-- WRONG -->
<div class="w-[1200px] mobile:w-full">

<!-- CORRECT -->
<div class="w-full md:w-[1200px]">
```

---

## Vue 3 / Nuxt 4 Patterns

```typescript
// REQUIRED: script setup with TypeScript
<script setup lang="ts">

// REQUIRED: defineModel for v-model (Vue 3.4+)
const model = defineModel<string>()
// FORBIDDEN: manual props + emit('update:modelValue')

// REQUIRED: computed to filter before v-for
const activeTasks = computed(() => tasks.value.filter(t => !t.archived))
// FORBIDDEN: v-for + v-if on same element

// REQUIRED: shallowRef for large API list data
const tasks = shallowRef<Task[]>([])
// FORBIDDEN: ref([]) for large lists from API

// REQUIRED: defineAsyncComponent for heavy components
const RichEditor = defineAsyncComponent(() => import('./RichEditor.vue'))
```

---

## Data Fetching — TanStack Query

```typescript
// READS — useQuery
const { data: tasks, isPending, isError } = useQuery({
  queryKey: ['tasks', projectId],
  queryFn: ({ signal }) => fetchTasks(projectId, { signal }),
  staleTime: 5 * 60 * 1000,
})

// WRITES — useMutation
const { mutate: createTask, isPending: isCreating } = useMutation({
  mutationFn: (data: TaskCreate) => createTaskApi(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
})
```

**FORBIDDEN:**
```typescript
const loading = ref(false)   // FORBIDDEN for API state
const tasks = ref<Task[]>([]) // FORBIDDEN as API data container in Pinia
```

**Pinia scope:**
- ✅ Auth session (`useAuthStore`)
- ✅ Theme (`useThemeStore`)
- ✅ Sidebar open/close state
- ❌ Tasks, projects, users — these live in TanStack Query cache only

---

## Nuxt 4 SSR Rules

```typescript
// useAsyncData for SSR-prefetched data (page-level)
const { data: project } = await useAsyncData(
  `project-${id}`,
  () => fetchProject(id)
)

// useFetch shorthand (auto-key, auto-SSR)
const { data: user } = await useFetch(`/api/v1/users/${id}`)

// Client-only data (no SSR needed) → useQuery as usual
```

- `useAsyncData` / `useFetch` for page-level initial data (SSR prefetch).
- `useQuery` for interactive/user-triggered data (client-side only).
- Never fetch the same resource in both `useAsyncData` and `useQuery` — pick one.

---

## Forms

```typescript
// REQUIRED: vee-validate + zod
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const FormSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
})

const { handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(FormSchema),
})

// FORBIDDEN: manual validation
// if (!form.title) { error.value = 'Required' }
```

---

## TypeScript Rules

- **FORBIDDEN:** `any` without an explicit `// reason:` comment on the same line.
- **FORBIDDEN:** `@ts-ignore` without explanation.
- **FORBIDDEN:** casting with `as SomeType` without a Zod parse boundary.
- All API shapes → Zod schema → `z.infer<>`. No manual interfaces.

---

## Permission Guards

```typescript
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return navigateTo('/login')
})

// Feature-level permission check
const { can } = usePermissions()
if (!can('task:update', projectId)) throw createError({ statusCode: 403 })
```

---

## Migration Protocol (from old Vue 3 codebase)

When porting a feature from the old frontend:

1. **Do NOT copy Naive UI components** — rebuild with Shadcn primitives.
2. **Extract Zod schemas first** from existing TypeScript interfaces.
3. **Replace axios calls** with `$fetch` / `useFetch` / `useQuery`.
4. **Delete all `<style>` blocks** before writing any new code.
5. If component logic exceeds 300 lines → extract to composable first.
6. Old Pinia stores that hold server data → replace with `useQuery`.

---

## Stop and Ask — mandatory

Stop immediately and ask the user before:
- Adding any `<style>` block, SCSS, or custom CSS.
- Creating a component over 300 lines.
- Using `v-html` (XSS risk).
- Installing a new pnpm dependency.
- Using `useAsyncData` and `useQuery` for the same data.
- Creating a proxy/wrapper component that adds no logic.