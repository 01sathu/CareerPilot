import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Briefcase,
  Clock,
  Info,
  ExternalLink,
  X
} from 'lucide-react';
import notificationService from '../../services/notification.service';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [toastMessage, setToastMessage] = useState(null);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count (FR-108)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Ignore polling errors
    }
  }, []);

  // Fetch notification list
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: 25 };
      if (activeTab === 'unread') {
        params.isRead = 'false';
      }
      const data = await notificationService.getNotifications(params);
      setNotifications(data.notifications || []);
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // Polling every 60s and on window focus (FR-108)
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);

    const onFocus = () => fetchUnreadCount();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchUnreadCount]);

  // When dropdown opens, fetch list
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkRead = async (e, notif) => {
    e.stopPropagation();
    try {
      if (notif.isRead) {
        await notificationService.markUnread(notif._id);
      } else {
        await notificationService.markRead(notif._id);
      }
      await fetchUnreadCount();
      await fetchNotifications();
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      await fetchUnreadCount();
      await fetchNotifications();
    } catch {
      // Ignore
    }
  };

  const handleDelete = async (e, notifId) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notifId);
      await fetchUnreadCount();
      await fetchNotifications();
    } catch {
      // Ignore
    }
  };

  // Click-through navigation with missing entity fallback (FR-110)
  const handleNotificationClick = async (notif) => {
    // Mark as read if not already read
    if (!notif.isRead) {
      try {
        await notificationService.markRead(notif._id);
        fetchUnreadCount();
      } catch {
        // Ignore
      }
    }

    setIsOpen(false);

    if (notif.relatedEntityType === 'interview') {
      navigate('/calendar');
    } else if (notif.relatedEntityType === 'application' && notif.relatedEntityId) {
      navigate('/applications');
    } else {
      // System or general
      navigate('/calendar');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'interview_reminder':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      case 'follow_up_reminder':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'application_status_changed':
        return <Briefcase className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-rose-500 rounded-full px-1 shadow-md shadow-rose-500/50 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden text-left animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center space-x-1 font-medium transition"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 px-4 py-2 border-b border-slate-800/60 bg-slate-900/40 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeTab === 'unread'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread
            </button>
          </div>

          {/* Toast Alert */}
          {toastMessage && (
            <div className="p-2.5 mx-3 mt-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="text-amber-400 ml-2">
                ✕
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-400 font-medium">No notifications</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {activeTab === 'unread' ? 'You are all caught up!' : 'Reminders and status updates appear here.'}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 transition cursor-pointer flex items-start space-x-3 group ${
                    notif.isRead
                      ? 'bg-slate-900/50 hover:bg-slate-800/60'
                      : 'bg-brand-950/20 hover:bg-brand-950/30 border-l-2 border-brand-500'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 flex-shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs truncate ${
                          notif.isRead ? 'text-slate-300 font-medium' : 'text-white font-bold'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono ml-2 flex-shrink-0">
                        {new Date(notif.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">
                        {notif.type.replace(/_/g, ' ')}
                      </span>

                      <div className="flex items-center space-x-2 opacity-80 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={(e) => handleMarkRead(e, notif)}
                          className="text-[11px] text-slate-400 hover:text-brand-300 p-1 rounded"
                          title={notif.isRead ? 'Mark as unread' : 'Mark as read'}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, notif._id)}
                          className="text-[11px] text-slate-500 hover:text-rose-400 p-1 rounded"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
