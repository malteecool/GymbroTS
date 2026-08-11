import React, { createContext, useContext, ReactNode } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuthContext } from './AuthProvider';

interface NotificationContextType {
    unreadCount: number;
    refresh: () => Promise<void>;
    markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { userInfo } = useAuthContext();
    const notifications = useNotifications(userInfo?.id);

    return <NotificationContext.Provider value={notifications}>{children}</NotificationContext.Provider>;
}

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationContext must be used within a NotificationProvider');
    }
    return context;
}
