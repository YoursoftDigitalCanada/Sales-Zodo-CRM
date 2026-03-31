import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import {
  getNotifications,
  markAllAsRead as markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationEntity,
} from "@/features/notifications";
import { resolveNotificationTarget } from "@/features/notifications/utils/notification-navigation";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  iconSize?: number;
  badgeClassName?: string;
  dropdownClassName?: string;
}

interface BellNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  target?: string;
  time: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
}

const notificationTypeConfig: Record<
  string,
  { icon: LucideIcon; iconClassName: string; iconBgClassName: string }
> = {
  info: {
    icon: Activity,
    iconClassName: "text-[#0891B2]",
    iconBgClassName: "bg-[#0891B2]/10",
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "text-[#01C44A]",
    iconBgClassName: "bg-[#01C44A]/10",
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: "text-[#D97706]",
    iconBgClassName: "bg-[#D97706]/10",
  },
  error: {
    icon: AlertTriangle,
    iconClassName: "text-[#DC2626]",
    iconBgClassName: "bg-[#DC2626]/10",
  },
  message: {
    icon: MessageSquare,
    iconClassName: "text-[#0891B2]",
    iconBgClassName: "bg-[#0891B2]/10",
  },
  task: {
    icon: CheckCircle2,
    iconClassName: "text-[#6637F4]",
    iconBgClassName: "bg-[#6637F4]/10",
  },
  deal: {
    icon: DollarSign,
    iconClassName: "text-[#01C44A]",
    iconBgClassName: "bg-[#01C44A]/10",
  },
  calendar: {
    icon: Calendar,
    iconClassName: "text-[#0891B2]",
    iconBgClassName: "bg-[#0891B2]/10",
  },
  system: {
    icon: Settings,
    iconClassName: "text-[#475569]",
    iconBgClassName: "bg-[#F1F5F9]",
  },
  mention: {
    icon: Users,
    iconClassName: "text-[#0891B2]",
    iconBgClassName: "bg-[#0891B2]/10",
  },
};

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp).getTime();

  if (Number.isNaN(date)) {
    return "";
  }

  const diffSeconds = Math.floor((Date.now() - date) / 1000);

  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 172800) return "Yesterday";

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function normalizeNotification(notification: NotificationEntity): BellNotification {
  const normalizedType = typeof notification.type === "string" ? notification.type.toLowerCase() : "info";
  const config = notificationTypeConfig[normalizedType] || notificationTypeConfig.info;

  return {
    id: notification.id,
    title: notification.title || "Notification",
    message: notification.message || "",
    read: Boolean(notification.isRead),
    target: resolveNotificationTarget(notification),
    time: formatRelativeTime(notification.createdAt),
    icon: config.icon,
    iconClassName: config.iconClassName,
    iconBgClassName: config.iconBgClassName,
  };
}

export function NotificationBell({
  className,
  buttonClassName,
  iconClassName,
  iconSize = 18,
  badgeClassName,
  dropdownClassName,
}: NotificationBellProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<BellNotification[]>([]);

  const loadNotifications = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const data = await getNotifications({ limit: 10 });
        setNotifications(data.map(normalizeNotification));
      } catch (error) {
        if (!silent) {
          toast({
            title: "Notifications unavailable",
            description: "Could not load notifications right now.",
            variant: "destructive",
          });
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadNotifications(true);

    const intervalId = window.setInterval(() => {
      void loadNotifications(true);
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const openTarget = useCallback(
    (target?: string) => {
      if (!target) {
        navigate("/notifications");
        return;
      }

      if (/^https?:\/\//i.test(target)) {
        window.open(target, "_blank", "noopener,noreferrer");
        return;
      }

      navigate(target.startsWith("/") ? target : `/${target}`);
    },
    [navigate],
  );

  const handleNotificationClick = useCallback(
    async (notification: BellNotification) => {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: true,
              }
            : item,
        ),
      );

      try {
        if (!notification.read) {
          await markNotificationAsRead(notification.id);
        }
      } catch {
        // Keep the optimistic UI state.
      }

      setIsOpen(false);
      openTarget(notification.target);
    },
    [openTarget],
  );

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      })),
    );

    try {
      await markAllNotificationsAsRead();
    } catch {
      toast({
        title: "Could not update notifications",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Open notifications"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);

          if (nextOpen) {
            void loadNotifications();
          }
        }}
        className={cn(
          "relative overflow-visible rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-2 text-[#94A3B8] transition-colors hover:text-[#475569]",
          buttonClassName,
        )}
      >
        <Bell size={iconSize} className={cn("text-[#475569]", iconClassName)} />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#FF7B36] px-1 text-[9px] font-bold leading-none text-white",
              badgeClassName,
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-white card-shadow sm:w-80",
              dropdownClassName,
            )}
          >
            <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.06)] p-4">
              <h4 className="font-semibold text-[#0F172A]">Notifications</h4>
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[#0891B2] hover:underline disabled:cursor-not-allowed disabled:text-[#94A3B8]"
                disabled={unreadCount === 0}
              >
                Mark all as read
              </button>
            </div>

            {isLoading ? (
              <div className="p-4 text-sm text-[#475569]">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-[#0F172A]">No notifications yet</p>
                <p className="mt-1 text-xs text-[#94A3B8]">You&apos;re all caught up.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => {
                  const Icon = notification.icon;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-[rgba(15,23,42,0.06)] p-4 text-left transition-colors last:border-b-0 hover:bg-[#F8FAFC]",
                        !notification.read && "bg-[#0891B2]/5",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md",
                          notification.iconBgClassName,
                        )}
                      >
                        <Icon size={18} className={notification.iconClassName} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          {!notification.read && (
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#0891B2]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "truncate text-sm text-[#0F172A]",
                                notification.read ? "font-medium" : "font-semibold",
                              )}
                            >
                              {notification.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-[#475569]">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-[11px] text-[#94A3B8]">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border-t border-[rgba(15,23,42,0.06)] bg-white p-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/notifications");
                }}
                className="text-sm font-medium text-[#0891B2] hover:underline"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
