import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, UserRole } from "@/types/auth";

export const DEMO_USERS: Record<UserRole, UserProfile> = {
  "super-admin": {
    id: "usr-super-1",
    name: "Dr. Vikram Sethi",
    email: "dr.vikram@edulms.ai",
    role: "super-admin",
    organization: "Apex AI Institute",
    twoFactorEnabled: true,
  },
  admin: {
    id: "usr-admin-1",
    name: "Ananya Iyer",
    email: "ananya.ops@edulms.ai",
    role: "admin",
    organization: "Apex AI Institute",
    twoFactorEnabled: true,
  },
  teacher: {
    id: "usr-teacher-1",
    name: "Prof. Rajesh Verma",
    email: "rajesh.verma@edulms.ai",
    role: "teacher",
    organization: "Apex AI Institute",
    twoFactorEnabled: true,
  },
  student: {
    id: "usr-student-1",
    name: "Arjun Mehta",
    email: "arjun.m@learner.ai",
    role: "student",
    organization: "Apex AI Institute",
    activeBatch: "Cohort 7 (Live + Replay)",
    twoFactorEnabled: false,
  },
  evaluator: {
    id: "usr-eval-1",
    name: "Kavita Rao",
    email: "kavita.eval@edulms.ai",
    role: "evaluator",
    organization: "Apex AI Institute",
    twoFactorEnabled: true,
  },
  support: {
    id: "usr-support-1",
    name: "Nikhil Joshi",
    email: "nikhil.mentor@edulms.ai",
    role: "support",
    organization: "Apex AI Institute",
    twoFactorEnabled: true,
  },
};

interface AuthContextType {
  user: UserProfile;
  role: UserRole;
  isAuthenticated: boolean;
  impersonatingFrom: UserProfile | null;
  switchRole: (role: UserRole) => void;
  impersonateUser: (targetUser: UserProfile) => void;
  stopImpersonation: () => void;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "lms_active_user";
const IMPERSONATION_STORAGE_KEY = "lms_impersonation_from";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return DEMO_USERS.student; // Default entry role for rich learning experience
  });

  const [impersonatingFrom, setImpersonatingFrom] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {}
  }, [user]);

  const switchRole = (newRole: UserRole) => {
    const newUser = DEMO_USERS[newRole];
    setUser(newUser);
    setImpersonatingFrom(null);
    try {
      localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    } catch {}
  };

  const impersonateUser = (targetUser: UserProfile) => {
    setImpersonatingFrom(user);
    try {
      localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(user));
    } catch {}
    setUser(targetUser);
  };

  const stopImpersonation = () => {
    if (impersonatingFrom) {
      setUser(impersonatingFrom);
      setImpersonatingFrom(null);
      try {
        localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      } catch {}
    }
  };

  const logout = () => {
    setUser(DEMO_USERS.student);
    setImpersonatingFrom(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        isAuthenticated: true,
        impersonatingFrom,
        switchRole,
        impersonateUser,
        stopImpersonation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
