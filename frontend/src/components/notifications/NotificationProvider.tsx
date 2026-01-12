"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

// Notification types
export type NotificationType = "success" | "error" | "warning" | "info" | "loading";

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    title?: string;
    duration?: number; // ms, 0 = persistent
    dismissible?: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, "id">) => string;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Generate unique ID
const generateId = () => `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Default durations by type (ms)
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
    success: 4000,
    error: 6000,
    warning: 5000,
    info: 4000,
    loading: 0, // persistent until dismissed
};

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const addNotification = useCallback(
        (notification: Omit<Notification, "id">): string => {
            const id = generateId();
            const duration = notification.duration ?? DEFAULT_DURATIONS[notification.type];
            const dismissible = notification.dismissible ?? true;

            const newNotification: Notification = {
                ...notification,
                id,
                duration,
                dismissible,
            };

            setNotifications((prev) => {
                // Limit to 5 max, remove oldest if exceeded
                const updated = [...prev, newNotification];
                if (updated.length > 5) {
                    return updated.slice(-5);
                }
                return updated;
            });

            // Auto-dismiss after duration (if not 0/persistent)
            if (duration > 0) {
                setTimeout(() => {
                    removeNotification(id);
                }, duration);
            }

            return id;
        },
        [removeNotification]
    );

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    return (
        <NotificationContext.Provider
            value={{ notifications, addNotification, removeNotification, clearAll }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotificationContext must be used within NotificationProvider");
    }
    return context;
}

// Developer-friendly hook
export function useNotify() {
    const { addNotification, removeNotification, clearAll } = useNotificationContext();

    return {
        success: (message: string, options?: Partial<Notification>) =>
            addNotification({ type: "success", message, ...options }),

        error: (message: string, options?: Partial<Notification>) =>
            addNotification({ type: "error", message, ...options }),

        warning: (message: string, options?: Partial<Notification>) =>
            addNotification({ type: "warning", message, ...options }),

        info: (message: string, options?: Partial<Notification>) =>
            addNotification({ type: "info", message, ...options }),

        loading: (message: string, options?: Partial<Notification>) =>
            addNotification({ type: "loading", message, duration: 0, ...options }),

        dismiss: removeNotification,
        clearAll,
    };
}
