import React, { createContext, useContext, useState } from "react";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "class" | "doubt" | "grade" | "system" | "payment";
  link?: string;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    title: "Live Class Starting Soon",
    message: "Agentic Workflows & Multi-Agent Systems begins in 15 minutes.",
    timestamp: "10 mins ago",
    read: false,
    type: "class",
    link: "/student/classroom/class-agentic-101",
  },
  {
    id: "notif-2",
    title: "AI Chapter Summary Published",
    message: "Lecture 8: Vector Databases & RAG Pipeline chapters are now ready.",
    timestamp: "1 hour ago",
    read: false,
    type: "system",
    link: "/student/replays/rep-rag-8",
  },
  {
    id: "notif-3",
    title: "New Student Doubt Assigned",
    message: "Aarav Sharma asked a doubt on Transformer Attention at 24:18.",
    timestamp: "2 hours ago",
    read: false,
    type: "doubt",
    link: "/teacher/doubts",
  },
  {
    id: "notif-4",
    title: "Evaluation Submitted",
    message: "Your submission for Milestone 2: LangChain RAG was graded: 94/100.",
    timestamp: "Yesterday",
    read: true,
    type: "grade",
    link: "/student/results/test-rag-2",
  },
];

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notif: Omit<AppNotification, "id" | "read" | "timestamp">) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const addNotification = (notif: Omit<AppNotification, "id" | "read" | "timestamp">) => {
    const newEntry: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      read: false,
      timestamp: "Just now",
    };
    setNotifications((prev) => [newEntry, ...prev]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
};
