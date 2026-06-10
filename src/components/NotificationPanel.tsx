import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Notification } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Bell,
  CheckCheck,
  UserPlus,
  CalendarClock,
  CheckCircle2,
  ArrowRightCircle,
  X,
} from 'lucide-react';

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  getMemberById: (id: string) => { name: string; color: string; avatar: string } | undefined;
}

const typeConfig: Record<string, { icon: ReactNode; color: string; bgColor: string }> = {
  task_assigned: {
    icon: <UserPlus className="w-4 h-4" />,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  task_postponed: {
    icon: <CalendarClock className="w-4 h-4" />,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  task_completed: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  task_inserted: {
    icon: <ArrowRightCircle className="w-4 h-4" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
};

export default function NotificationPanel({
  notifications,
  unreadCount,
  isOpen,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l shadow-2xl animate-slide-in flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">通知</h2>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                全部已读
              </Button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 通知列表 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bell className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notif => {
                const config = typeConfig[notif.type] || typeConfig.task_assigned;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-4 transition-colors cursor-pointer hover:bg-accent/50',
                      !notif.read && 'bg-primary/5',
                    )}
                    onClick={() => !notif.read && onMarkRead(notif.id)}
                  >
                    <div className="flex gap-3">
                      <div className={cn('p-2 rounded-lg flex-shrink-0', config.bgColor, config.color)}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-medium', !notif.read && 'text-foreground')}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                          {new Date(notif.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
