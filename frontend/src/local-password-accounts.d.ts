declare module "virtual:local-password-accounts" {
  const accounts: ReadonlyArray<{
    role: import("@/types").UserRole
    email: string
    password: string
  }>
  export default accounts
}
