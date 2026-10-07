"use client";

import { Bell, CheckCheck, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, User } from "@/lib/api";

type RiveraNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  applicationId?: string | null;
};

type NotificationResponse = {
  items: RiveraNotification[];
  unread: number;
};

function routeFor(item: RiveraNotification, user: User) {
  const role = user.roles.includes("BUSINESS") ? "business" : "creator";
  const type = item.type.toUpperCase();
  if (type.includes("MESSAGE")) return `/dashboard/${role}/messages`;
  if (type.includes("PAYMENT") || type.includes("FUND") || type.includes("PAYOUT"))
    return role === "business"
      ? "/dashboard/business/payments"
      : "/dashboard/creator/earnings";
  if (type.includes("OFFER")) return "/dashboard/creator/offers";
  if (type.includes("COLLAB") || type.includes("DELIVERABLE") || type.includes("REVISION"))
    return role === "business"
      ? "/dashboard/business/campaigns"
      : "/dashboard/creator/collaborations";
  if (type.includes("APPLICATION") || type.includes("PROPOSAL"))
    return role === "business"
      ? "/dashboard/business/campaigns"
      : "/dashboard/creator/applications";
  return user.roles.includes("ADMIN") ? "/admin" : `/dashboard/${role}`;
}

export function NotificationCenter({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationResponse>({ items: [], unread: 0 });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api<NotificationResponse>("/notifications");
      if (seen.current && typeof window !== "undefined" && "Notification" in window) {
        for (const item of next.items) {
          if (
            !seen.current.has(item.id) &&
            !item.readAt &&
            window.Notification.permission === "granted"
          ) {
            new window.Notification(item.title, {
              body: item.body,
              icon: "/images/rivera-notification.png",
              tag: item.id,
            });
          }
        }
      }
      seen.current = new Set(next.items.map((item) => item.id));
      setData(next);
    } catch {
      // Keep the last successful notification state during transient outages.
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window)
      setPermission(window.Notification.permission);
    void load();
    const timer = window.setInterval(() => void load(), 25_000);
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);

  async function markRead(item: RiveraNotification) {
    if (!item.readAt) {
      await api(`/notifications/${item.id}/read`, { method: "PATCH" });
      setData((current) => ({
        unread: Math.max(0, current.unread - 1),
        items: current.items.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
        ),
      }));
    }
  }

  async function markAllRead() {
    await api("/notifications/read-all", { method: "PATCH" });
    setData((current) => ({
      unread: 0,
      items: current.items.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    }));
  }

  async function enableDesktopAlerts() {
    if (!("Notification" in window)) return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
    if (result === "granted")
      new window.Notification("Rivera alerts are ready", {
        body: "Important partnership updates can now reach you here.",
        icon: "/images/rivera-notification.png",
      });
  }

  return (
    <div className="notification-center">
      <button
        className="notification-trigger"
        type="button"
        aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {data.unread > 0 && <span>{data.unread > 99 ? "99+" : data.unread}</span>}
      </button>
      {open && (
        <aside className="notification-panel" aria-label="Notifications">
          <header>
            <div>
              <p className="eyebrow">STAY IN THE LOOP</p>
              <h2>Notifications</h2>
            </div>
            <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}>
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="notification-actions">
            {permission === "default" && (
              <button type="button" onClick={() => void enableDesktopAlerts()}>
                Enable desktop alerts
              </button>
            )}
            {data.unread > 0 && (
              <button type="button" onClick={() => void markAllRead()}>
                <CheckCheck aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>
          <div className="notification-list">
            {!data.items.length && (
              <div className="notification-empty">
                <Bell aria-hidden="true" />
                <strong>You’re all caught up.</strong>
                <p>New campaign and collaboration moments will appear here.</p>
              </div>
            )}
            {data.items.map((item) => (
              <Link
                key={item.id}
                href={routeFor(item, user)}
                className={item.readAt ? "notification-item" : "notification-item unread"}
                onClick={() => {
                  void markRead(item);
                  setOpen(false);
                }}
              >
                <span className="notification-dot" />
                <span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <time dateTime={item.createdAt}>
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(item.createdAt))}
                  </time>
                </span>
                <ExternalLink aria-hidden="true" />
              </Link>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
