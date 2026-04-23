---
trigger: always_on
---



# Frontend Next — Architecture Rules & Standards

> Source of truth для ре rewrite фронтенда YourTask.
> **Stack:** Nuxt 4 (app dir) + Shadcn-vue + TanStack Query + Zod.

---

## 🏗 Stack & Core Tools

| Layer | Tool | Notes |
|---|---|---|
| **Framework** | Nuxt 4 | Использование структуры `app/` |
| **Language** | TypeScript | Strict mode, запрет на `any` |
| **UI Components** | Shadcn-vue | Атомарные компоненты, правки внутри `ui/` |
| **Styling** | Tailwind CSS | Zero-CSS policy (никаких `<style>`) |
| **Server State** | TanStack Query v5 | Кэширование и синхронизация данных |
| **Client State** | Pinia | Только UI-state, сессия и тема |
| **Validation** | Zod | Единственный источник правды для типов |
| **Package Manager**| pnpm | Режим `shamefully-hoist=false` |

---

## 📏 Hard File Size Limits

| File type | Max lines | Action if exceeded |
|---|---|---|
| Component (`.vue`) | **250** | Вынести логику в `composables/` |
| Composable (`.ts`) | **200** | Разбить на мелкие утилитарные функции |
| Service (`.ts`) | **150** | Разделить по доменам API |

**STOP:** Перед созданием файла, который заведомо нарушит лимит, необходимо обсуждение архитектуры.

---

## 📂 Directory Structure (Standard Nuxt 4)

Все файлы фронтенда живут в папке `app/`. Используем стандартный авто-импорт Nuxt.

```text
app/
  assets/             # Глобальные стили (Tailwind directives) и статика
  components/
    ui/               # Shadcn компоненты (без бизнес-логики)
    shared/           # Общие компоненты (Buttons, Modals)
    tasks/            # Компоненты фичи Tasks
    projects/         # Компоненты фичи Projects
  composables/
    useAuth.ts        # Глобальные состояния
    tasks/            # Бизнес-логика конкретных фич
  layouts/            # Шаблоны страниц
  middleware/         # Auth guards и роутинг
  pages/              # Только композиция (минимум логики)
  plugins/            # TanStack Query, инстансы библиотек
  utils/
    schemas/          # Zod схемы и типы (TaskSchema, UserSchema)
    services/         # Чистые fetch-запросы (fetchTasks, updateTask)
  app.vue             # Корневой компонент
```

---

## 🛡 Data Integrity (Zod)

**Никаких ручных интерфейсов.** Все типы выводятся из схем.

```typescript
// app/utils/schemas/task.ts
export const TaskSchema = z.object({
  id: z.number(),
  title: z.string().min(3),
  status: z.enum(['todo', 'done'])
})

export type Task = z.infer<typeof TaskSchema>

// Использование в сервисе
export const fetchTask = async (id: number): Promise<Task> => {
  const data = await $fetch(`/api/tasks/${id}`)
  return TaskSchema.parse(data) // Валидация на границе
}
```

---

## 🎨 Styling — Zero-CSS Policy

* **FORBIDDEN:** Блоки `<style>` в `.vue` файлах.
* **FORBIDDEN:** Использование SCSS/SASS.
* **FORBIDDEN:** Атрибуты `style="..."` (инлайн-стили).
* **REQUIRED:** Только Tailwind классы.
* **REQUIRED:** Мобильный дизайн в приоритете (Mobile First).

---

## 🔄 State Management Rules

1.  **Server State (TanStack Query):** Все данные из API (Tasks, Users, Projects).
    * *Запрещено* хранить данные API в локальном state.
2.  **Client State (Composables):** Только то, что не живет в БД (Sidebar open, Current Theme, Auth Token).
    * Использовать `useState` для персистентного состояния между компонентами.
    * Использовать `useCookie` для токенов и настроек.
3.  **Local State (ref/reactive):** Только состояние внутри одного компонента (например, `isModalOpen`).

---

## 🚀 Nuxt 4 Patterns

* **`defineModel()`**: Для двусторонней связки (v-model).
* **`shallowRef()`**: Для больших списков данных из API (оптимизация производительности).
* **`useAsyncData`**: Только на уровне `pages/` для SSR.
* **`defineAsyncComponent`**: Для тяжелых чартов, редакторов и модалок.

