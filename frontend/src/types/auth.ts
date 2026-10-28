export type UserRole =
  | "super-admin"
  | "admin"
  | "teacher"
  | "student"
  | "evaluator"
  | "support";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organization: string;
  twoFactorEnabled?: boolean;
  activeBatch?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  impersonatingFrom?: UserProfile | null; // For Super Admin "View As"
}
