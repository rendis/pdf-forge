/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_OIDC_TOKEN_URL: string
  readonly VITE_OIDC_USERINFO_URL: string
  readonly VITE_OIDC_LOGOUT_URL: string
  readonly VITE_OIDC_CLIENT_ID: string
  readonly VITE_USE_MOCK_AUTH: string
  readonly VITE_OIDC_PASSWORD_RESET_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
