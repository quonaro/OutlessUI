# Outless Frontend

Nuxt 4 frontend for Outless project.

## Stack

- **Framework**: Nuxt 4
- **Language**: TypeScript (strict mode)
- **UI**: Shadcn-vue
- **Styling**: Tailwind CSS
- **Server State**: TanStack Query v5
- **Client State**: Pinia
- **Validation**: Zod + Vee-Validate
- **Fetching**: ofetch
- **Icons**: Lucide-vue-next
- **Package Manager**: pnpm

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Type Check

```bash
pnpm typecheck
```

## Architecture

See `frontend.md` for detailed architecture rules and standards.

### Directory Structure

```
app/                          # Nuxt 4 assets
  components/
    ui/                       # Shadcn atomic components
  composables/                # Global composables
  layouts/                    # Page layouts
  pages/                      # File-based routing
  middleware/                 # Route guards
  plugins/                    # Nuxt plugins

features/
  [feature-name]/
    components/               # Feature-specific components
    composables/              # Feature-scoped composables
    schemas/                  # Zod schemas
    services/                 # API calls

stores/                       # Pinia stores (client state only)
types/                        # Shared TypeScript types
```

### Key Rules

- **Schema-First**: All API data must have Zod schemas before component logic
- **Zero-CSS**: No `<style>` blocks, no custom CSS
- **TanStack Query**: Server state lives in query cache, not Pinia
- **File Size Limits**: Components < 300 lines, composables < 200 lines
