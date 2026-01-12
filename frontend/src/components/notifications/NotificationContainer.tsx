"use client";

import React from "react";
import { useNotificationContext, NotificationType } from "./NotificationProvider";

// Icons for each notification type
const icons: Record<NotificationType, React.ReactNode> = {
    success: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    info: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    loading: (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    ),
};

// Styles for each notification type
const typeStyles: Record<NotificationType, string> = {
    success: "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
    error: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
    warning: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
    info: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
    loading: "bg-gradient-to-r from-slate-600 to-slate-700 text-white",
};

export function NotificationContainer() {
    const { notifications, removeNotification } = useNotificationContext();

    if (notifications.length === 0) return null;

    return (
        <div
            className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
            role="region"
            aria-label="Notifications"
        >
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`${typeStyles[notification.type]} rounded-xl shadow-2xl p-4 pointer-events-auto animate-slide-in-right flex items-start gap-3`}
                    role="alert"
                    aria-live="polite"
                >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">{icons[notification.type]}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {notification.title && (
                            <p className="font-bold text-sm">{notification.title}</p>
                        )}
                        <p className="text-sm opacity-95">{notification.message}</p>
                    </div>

                    {/* Dismiss button */}
                    {notification.dismissible && (
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                            aria-label="Dismiss notification"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
