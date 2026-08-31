import { useEffect, useState, useRef } from "react";
import { getConversations, getMessages, sendMessage, editMessage, deleteMessage, markConversationRead } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import emptyMessages from "../assets/empty-messages.svg";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { itemImageSrc } from "../config";

function formatMessageTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Messages() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const pollingRef = useRef(null);
  const prevLastMessageIdRef = useRef(null);

  useEffect(() => {
    const fetchConvos = () => {
      getConversations().then((data) => {
        setConversations((prev) => {
          const list = Array.isArray(data) ? data : [];
          // Preserve temp conversations from the current state
          prev.forEach((c) => {
            if (c._temp && !list.some((x) => x.id === c.id)) {
              list.unshift(c);
            }
          });
          // Also restore temp conversations from localStorage drafts
          const draftKeys = Object.keys(localStorage).filter(k => k.startsWith("draft_convo_") && localStorage.getItem(k));
          draftKeys.forEach(key => {
            const id = Number(key.replace("draft_convo_", ""));
            if (id && !list.some(c => c.id === id)) {
              const meta = JSON.parse(localStorage.getItem(`convo_meta_${id}`) || "{}");
              list.unshift({
                id,
                other_user: meta.other_user || "",
                item_title: meta.item_title || "",
                last_message: null,
                _temp: true,
              });
            }
          });
          return list;
        });
        setLoadingConvos(false);
      });
    };
    fetchConvos();
    const interval = setInterval(fetchConvos, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const convoIdFromUrl = Number(searchParams.get("convo"));
    if (!convoIdFromUrl) return;
    if (selectedConvo?.id === convoIdFromUrl) return;

    const convo = conversations.find((c) => c.id === convoIdFromUrl);
    if (convo) {
      selectConvoWithDraft(convo);
    } else if (!loadingConvos) {
      // Empty conversation from Contact Seller — inject into sidebar temporarily
      const navState = location.state || {};
      const meta = JSON.parse(localStorage.getItem(`convo_meta_${convoIdFromUrl}`) || "{}");
      const tempConvo = {
        id: convoIdFromUrl,
        other_user: navState.other_user || meta.other_user || "",
        item_title: navState.item_title || meta.item_title || "",
        last_message: null,
        _temp: true,
      };
      setConversations((prev) => {
        if (prev.some((c) => c.id === convoIdFromUrl)) return prev;
        return [tempConvo, ...prev];
      });
      setSelectedConvo(tempConvo);
      getMessages(convoIdFromUrl).then((data) => {
        setMessages(Array.isArray(data) ? data : []);
      });
      // Save meta so we can restore this temp convo if user comes back with a draft
      localStorage.setItem(`convo_meta_${convoIdFromUrl}`, JSON.stringify({
        other_user: navState.other_user || "Seller",
        item_title: navState.item_title || "",
      }));
      const draft = localStorage.getItem(`draft_convo_${convoIdFromUrl}`) || "";
      setInput(draft);
    }
  }, [conversations, searchParams, selectedConvo, loadingConvos, location.state]);

  useEffect(() => {
    if (!selectedConvo) return;
    const poll = () => {
      if (document.visibilityState === "hidden") return;
      getMessages(selectedConvo.id).then((data) => {
        const list = Array.isArray(data) ? data : [];
        const last = list.length ? list[list.length - 1] : null;
        const prevId = prevLastMessageIdRef.current;
        if (last && last.id !== prevId) {
          if (last.sender_id !== currentUserId) {
            markConversationRead(selectedConvo.id);
          }
          prevLastMessageIdRef.current = last.id;
        }
        setMessages(list);
      });
    };
    pollingRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollingRef.current);
  }, [selectedConvo, currentUserId]);

  const selectConvo = (convo) => {
    prevLastMessageIdRef.current = null;
    setSelectedConvo(convo);
    getMessages(convo.id).then((data) => {
      const list = Array.isArray(data) ? data : [];
      setMessages(list);
      const last = list.length ? list[list.length - 1] : null;
      prevLastMessageIdRef.current = last ? last.id : null;
      markConversationRead(convo.id);
    });
  };

  // Save draft to localStorage when input changes
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (selectedConvo) {
      if (val.trim()) {
        localStorage.setItem(`draft_convo_${selectedConvo.id}`, val);
      } else {
        localStorage.removeItem(`draft_convo_${selectedConvo.id}`);
      }
    }
  };

  // Restore draft when selecting a conversation; clear URL param so the
  // URL-based effect doesn't snap back to a previous conversation.
  const selectConvoWithDraft = (convo) => {
    if (searchParams.get("convo")) {
      navigate("/messages", { replace: true });
    }
    selectConvo(convo);
    const draft = localStorage.getItem(`draft_convo_${convo.id}`) || "";
    setInput(draft);
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || !selectedConvo) return;
    const msg = await sendMessage(selectedConvo.id, { body: input, imageFile });
    setMessages((prev) => [...prev, msg]);
    setInput("");
    setImageFile(null);
    localStorage.removeItem(`draft_convo_${selectedConvo.id}`);
    localStorage.removeItem(`convo_meta_${selectedConvo.id}`);
  };

  const handleEditStart = (msg) => {
    setEditingMsgId(msg.id);
    setEditInput(msg.body || "");
  };

  const handleEditSave = async (msgId) => {
    if (!editInput.trim()) return;
    const updated = await editMessage(msgId, editInput);
    setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
    setEditingMsgId(null);
    setEditInput("");
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm("Delete this message?")) return;
    await deleteMessage(msgId);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, body: "[deleted]", deleted: true } : m))
    );
  };

  const lastOwnMessageId = [...messages]
    .reverse()
    .find((m) => m.sender_id === currentUserId)?.id;

  return (
    <div className="container messages" style={{ display: "flex", gap: "1rem", padding: "1rem" }}>
      <div className="card conversations" style={{ width: "250px", padding: "1rem" }}>
        {loadingConvos && <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>Loading...</p>}
        {!loadingConvos && conversations.length === 0 && (
          <div className="empty-state">
            <img src={emptyMessages} alt="No messages" style={{ width: 80, marginBottom: 16, opacity: 0.9 }} />
            <div style={{ fontWeight: 500, marginBottom: 8 }}>No messages yet</div>
            <div style={{ color: "var(--text-muted)", marginBottom: 16 }}>You have not chatted with anyone yet.</div>
            <Link to="/items" className="btn-primary" style={{ textDecoration: "none", padding: "12px 20px" }}>
              Start browsing items
            </Link>
          </div>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => selectConvoWithDraft(c)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && selectConvoWithDraft(c)}
            className={`convo-item${selectedConvo?.id === c.id ? " convo-item--selected" : ""}`}
          >
            <p style={{ margin: 0, fontWeight: c.has_unread ? 800 : 600, color: "var(--text)" }}>
              {c.has_unread && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginRight: 6 }} />}
              {c.other_user}
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{c.item_title}</p>
            {(c.last_message || c.last_message_has_image) && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "var(--text-faint)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.last_message || "📷 Image"}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="card chat" style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", minHeight: "400px" }}>
        {!selectedConvo ? (
          <p style={{ color: "var(--text-muted)", margin: "auto" }}>Select a conversation.</p>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              {messages.map((m) => {
                const isMine = m.sender_id === currentUserId;
                const isEditing = editingMsgId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`message-bubble ${isMine ? "outgoing" : "incoming"}`}
                    style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "70%" }}
                  >
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleEditSave(m.id)}
                          autoFocus
                          aria-label="Edit message"
                          style={{ flex: 1, fontSize: 14 }}
                        />
                        <button type="button" onClick={() => handleEditSave(m.id)} className="btn-primary" style={{ padding: "4px 8px", fontSize: 12 }}>
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingMsgId(null)} style={{ padding: "4px 8px", fontSize: 12 }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {m.body ? (
                          <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</p>
                        ) : null}
                        {m.image_url ? (
                          <img
                            src={itemImageSrc(m.image_url)}
                            alt="Shared in chat"
                            className="message-image"
                          />
                        ) : null}
                        <div className="message-meta">
                          <span>{formatMessageTime(m.created_at)}</span>
                          {isMine && m.id === lastOwnMessageId && (
                            <span>{m.read_at ? "Seen" : "Sent"}</span>
                          )}
                        </div>
                      </>
                    )}
                    {isMine && !isEditing && !m.deleted && (
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                        <button
                          type="button"
                          aria-label="Edit message"
                          onClick={() => handleEditStart(m)}
                          style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", opacity: 0.85, padding: 0 }}
                        >
                          edit
                        </button>
                        <button
                          type="button"
                          aria-label="Delete message"
                          onClick={() => handleDelete(m.id)}
                          style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", opacity: 0.85, padding: 0 }}
                        >
                          delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                aria-label="Type a message"
                style={{ flex: 1 }}
              />
              <label className="btn-primary" style={{ width: "auto", padding: "10px 12px", cursor: "pointer" }} aria-label="Attach image">
                +
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
              </label>
              <button type="button" onClick={handleSend} className="btn-primary">
                Send
              </button>
            </div>
            {imageFile ? (
              <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: "12px" }}>
                Selected image: {imageFile.name}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
