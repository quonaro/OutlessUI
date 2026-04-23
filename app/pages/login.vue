<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { LogIn } from 'lucide-vue-next'
import { getFirstAdminStatus, login, registerFirstAdmin } from '~/utils/services/auth'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false,
})

const FormSchema = toTypedSchema(z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
}))

const { handleSubmit, errors, defineField } = useForm({
  validationSchema: FormSchema,
})

const [username] = defineField('username')
const [password] = defineField('password')

const config = useRuntimeConfig()
const { apiBase } = config.public

const auth = useAuth()
const isBootstrapMode = ref(false)
const isInitialLoading = ref(true)
const isLoading = ref(false)
const errorMessage = ref('')

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = isBootstrapMode.value
      ? await registerFirstAdmin(values, apiBase)
      : await login(values, apiBase)
    auth.setToken(response.token)
    await navigateTo('/')
  }
  catch (error) {
    errorMessage.value = isBootstrapMode.value
      ? 'Failed to create first admin'
      : 'Invalid username or password'
  }
  finally {
    isLoading.value = false
  }
})

onMounted(async () => {
  console.log('[login.vue] onMounted called')
  console.log('[login.vue] apiBase:', apiBase)
  console.log('[login.vue] auth.isAuthenticated.value:', auth.isAuthenticated.value)

  if (auth.isAuthenticated.value) {
    navigateTo('/')
    return
  }

  try {
    console.log('[login.vue] Calling getFirstAdminStatus...')
    const status = await getFirstAdminStatus(apiBase)
    console.log('[login.vue] Status received:', status)
    isBootstrapMode.value = status.can_register
  }
  catch (error) {
    console.error('[login.vue] Error in getFirstAdminStatus:', error)
    errorMessage.value = 'Failed to load auth state'
  }
  finally {
    console.log('[login.vue] Setting isInitialLoading to false')
    isInitialLoading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 relative">
    <div class="absolute top-4 right-4">
      <ThemeToggle />
    </div>
    <Card class="w-full max-w-md bg-card border-border">
      <CardHeader class="space-y-1">
        <CardTitle class="text-2xl font-bold text-center text-card-foreground">
          {{ isBootstrapMode ? 'Create First Admin' : 'Admin Login' }}
        </CardTitle>
        <CardDescription class="text-center text-muted-foreground">
          {{ isBootstrapMode
            ? 'No admins found. Create the first admin account to continue'
            : 'Enter your credentials to access the admin panel' }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p v-if="isInitialLoading" class="text-sm text-muted-foreground text-center">
          Loading...
        </p>
        <form @submit="onSubmit" class="space-y-4">
          <div class="space-y-2">
            <Label for="username" class="text-foreground">Username</Label>
            <Input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="admin"
              class="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            <p v-if="errors.username" class="text-sm text-destructive">
              {{ errors.username }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="password" class="text-foreground">Password</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            <p v-if="errors.password" class="text-sm text-destructive">
              {{ errors.password }}
            </p>
          </div>

          <p v-if="errorMessage" class="text-sm text-destructive text-center">
            {{ errorMessage }}
          </p>

          <Button
            type="submit"
            class="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            :disabled="isLoading || isInitialLoading"
          >
            <LogIn v-if="!isLoading" class="mr-2 h-4 w-4" />
            <span v-if="isLoading">{{ isBootstrapMode ? 'Creating...' : 'Signing in...' }}</span>
            <span v-else>{{ isBootstrapMode ? 'Create admin' : 'Sign in' }}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
