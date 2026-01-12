"use client";

import { useState } from "react";
import Link from "next/link";

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'bonus' | 'referral' | 'team_invitation'; // ✅ Added
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  isDismissible?: boolean;
  icon?: string;
  onDismiss?: () => void;
}

interface NotificationCardProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

export default function NotificationCard({ notification, onDismiss }: NotificationCardProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  if (!isVisible) return null;

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    bonus: 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 text-yellow-900',
    referral: 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-900',
    team_invitation: 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-900', // ✅ Added
  };

  const iconMap = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    bonus: '🎁',
    referral: '🎉',
    team_invitation: '👥', // ✅ Added
  };

  return (
    <div
      className={`${typeStyles[notification.type]} border-2 rounded-xl p-4 shadow-lg animate-slideDown mb-4`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-2xl">{notification.icon || iconMap[notification.type]}</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{notification.title}</h3>
            <p className="text-sm opacity-90">{notification.message}</p>
            
            {notification.actionUrl && notification.actionLabel && (
              <Link
                href={notification.actionUrl}
                className="inline-block mt-3 px-4 py-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-lg font-semibold text-sm transition-all shadow-sm"
              >
                {notification.actionLabel} →
              </Link>
            )}
          </div>
        </div>
        
        {notification.isDismissible !== false && (
          <button
            onClick={handleDismiss}
            className="ml-2 p-1 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
