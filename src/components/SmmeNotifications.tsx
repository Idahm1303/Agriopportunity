"use client";

import Link from "next/link";
import { useState } from "react";
import { getFarmerAlertCopy } from "@/lib/notification-copy";

type SmmeNotification = {
  id: string;
  matchReason: string;
  readAt: Date | string | null;
  emailSentAt: Date | string | null;
  createdAt: Date | string;
  opportunity: {
    id: string;
    title: string;
    type: string;
    closingDate: Date | string | null;
    province: string | null;
  };
};

export function SmmeNotifications({
  initialNotifications,
  audience = "SMME",
  language = "English",
}: {
  initialNotifications: SmmeNotification[];
  audience?: "SMME" | "FARMER";
  language?: string;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const farmerCopy = getFarmerAlertCopy(language);
  const heading = audience === "FARMER" ? farmerCopy.heading : "New programme alerts";

  const markAsRead = async (notificationId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/read`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update this notification.");
      setNotifications((current) => current.map((notification) =>
        notification.id === notificationId ? { ...notification, readAt: new Date().toISOString() } : notification,
      ));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update this notification.");
    }
  };

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-forest/10" aria-labelledby="opportunity-notifications-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="opportunity-notifications-heading" className="font-display text-xl text-forest">{heading}</h2>
        {unreadCount ? <span className="rounded-full bg-goldSoft px-3 py-1 text-xs font-semibold text-forest">{unreadCount} {audience === "FARMER" ? farmerCopy.newLabel : "new"}</span> : null}
      </div>
      {notifications.length ? (
        <ul className="mt-3 space-y-3">
          {notifications.map((notification) => (
            <li key={notification.id} className={`rounded-xl p-3 ${notification.readAt ? "bg-cream" : "bg-cream2"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/opportunities/${notification.opportunity.id}`} className="font-semibold text-forest underline">{notification.opportunity.title}</Link>
                  <p className="mt-1 text-sm text-inkSoft">{audience === "FARMER" ? farmerCopy.reason : notification.matchReason}</p>
                  <p className="mt-1 text-xs text-inkSoft">
                    {notification.opportunity.province ?? "National"}
                    {notification.opportunity.closingDate ? ` · ${audience === "FARMER" ? farmerCopy.closes : "Closes"} ${new Date(notification.opportunity.closingDate).toLocaleDateString()}` : ""}
                  </p>
                  {!notification.emailSentAt ? <p className="mt-1 text-xs text-inkSoft">{audience === "FARMER" ? farmerCopy.emailFailed : "In-app alert · Email alert was not sent"}</p> : null}
                </div>
                {!notification.readAt ? <button type="button" onClick={() => void markAsRead(notification.id)} className="rounded-lg border border-forest/20 px-3 py-2 text-xs font-semibold text-forest">{audience === "FARMER" ? farmerCopy.markRead : "Mark as read"}</button> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-inkSoft">{audience === "FARMER" ? farmerCopy.empty : "Matching SMME programmes and funding calls will appear here when they open. Email alerts are sent when email delivery is configured."}</p>
      )}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
