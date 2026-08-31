/** Notification toasts that appear in the bottom-right corner for new messages. */
export default function Toast({ notifications, onDismiss, onOpen }) {
  if (notifications.length === 0) return null;

  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="toast"
          onClick={() => onOpen(n)}
        >
          <strong>New message</strong>
          <div style={{ marginBottom: 10 }}>{n.message}</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(n);
              }}
              className="btn-primary"
              style={{ padding: "4px 8px", fontSize: 12 }}
            >
              Open
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(n.id);
              }}
              style={{ padding: "4px 8px", fontSize: 12, background: "var(--secondary-btn)", color: "var(--secondary-btn-text)" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
