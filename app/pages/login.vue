<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { LogIn } from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth'
import { login } from '../../features/auth/services/auth'

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

const authStore = useAuthStore()
const isLoading = ref(false)
const errorMessage = ref('')

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await login(values)
    authStore.setToken(response.token)
    await navigateTo('/')
  }
  catch (error) {
    errorMessage.value = 'Invalid username or password'
  }
  finally {
    isLoading.value = false
  }
})

onMounted(() => {
  if (authStore.isAuthenticated) {
    navigateTo('/')
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
    <Card class="w-full max-w-md bg-zinc-900 border-zinc-800">
      <CardHeader class="space-y-1">
        <CardTitle class="text-2xl font-bold text-center text-white">
          Admin Login
        </CardTitle>
        <CardDescription class="text-center text-zinc-400">
          Enter your credentials to access the admin panel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit="onSubmit" class="space-y-4">
          <div class="space-y-2">
            <Label for="username" class="text-zinc-300">Username</Label>
            <Input
              id="username"
              v-model="username"
              type="text"
              placeholder="admin"
              class="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
            <p v-if="errors.username" class="text-sm text-red-400">
              {{ errors.username }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="password" class="text-zinc-300">Password</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
            <p v-if="errors.password" class="text-sm text-red-400">
              {{ errors.password }}
            </p>
          </div>

          <p v-if="errorMessage" class="text-sm text-red-400 text-center">
            {{ errorMessage }}
          </p>

          <Button
            type="submit"
            class="w-full bg-white text-black hover:bg-zinc-200"
            :disabled="isLoading"
          >
            <LogIn v-if="!isLoading" class="mr-2 h-4 w-4" />
            <span v-if="isLoading">Signing in...</span>
            <span v-else>Sign in</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
