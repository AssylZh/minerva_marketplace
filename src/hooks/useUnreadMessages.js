import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getConversations } from "../services/api";

export function useUnreadMessages(isAuthenticated) {
  const [notifications, setNotifications] = useState([]);
  const prevConvosRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const navigateToConversation = useCallback((notification) => {
    dismiss(notification.id);
    navigate(`/messages?convo=${notification.convoId}`);
  }, [dismiss, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      if (location.pathname === "/messages") return;

      try {
        const convos = await getConversations();
        if (!Array.isArray(convos)) return;

        const prev = prevConvosRef.current;

        convos.forEach((convo) => {
          const prevConvo = prev.find((c) => c.id === convo.id);
          const currentFingerprint = `${convo.last_message || ""}-${convo.last_message_has_image ? "img" : "text"}`;
          const prevFingerprint = prevConvo
            ? `${prevConvo.last_message || ""}-${prevConvo.last_message_has_image ? "img" : "text"}`
            : "";
          const isNewMessage =
            (convo.last_message || convo.last_message_has_image) &&
            (!prevConvo || prevFingerprint !== currentFingerprint);

          if (isNewMessage) {
            const id = `${convo.id}-${Date.now()}`;
            const preview = convo.last_message || "Sent an image";
            const notification = {
              id,
              message: `${convo.other_user}: "${preview}"`,
              convoId: convo.id,
            };

            setNotifications((prev) => [...prev, notification]);
            setTimeout(() => {
              setNotifications((prev) => prev.filter((n) => n.id !== id));
            }, 5000);
          }
        });

        prevConvosRef.current = convos;
      } catch {
        // silently fail
      }
    };

    getConversations().then((convos) => {
      if (Array.isArray(convos)) prevConvosRef.current = convos;
    });

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, location.pathname]);

  return { notifications, dismiss, navigateToConversation };
}
