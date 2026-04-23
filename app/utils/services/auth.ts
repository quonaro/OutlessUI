export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
}

export interface FirstAdminStatus {
  can_register: boolean
}

export async function login(credentials: LoginCredentials, baseURL: string): Promise<AuthResponse> {
  return $fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    body: credentials,
  })
}

export async function registerFirstAdmin(credentials: LoginCredentials, baseURL: string): Promise<AuthResponse> {
  return $fetch(`${baseURL}/auth/register-first-admin`, {
    method: 'POST',
    body: credentials,
  })
}

export async function getFirstAdminStatus(baseURL: string): Promise<FirstAdminStatus> {
  return $fetch(`${baseURL}/auth/first-admin-status`)
}
