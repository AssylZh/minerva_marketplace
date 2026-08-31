import API_BASE from "../config";

export const getToken = () => {
  const u = JSON.parse(localStorage.getItem("mm_auth_user") || "{}");
  return u?.token;
};

export const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
};

export const getConversations = async () => {
  const res = await fetch(`${API_BASE}/messages/conversations`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
};

export const getMessages = async (convoId) => {
  const res = await fetch(`${API_BASE}/messages/conversations/${convoId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
};

export const sendMessage = async (convoId, { body, imageFile }) => {
  const form = new FormData();
  form.append("body", body || "");
  if (imageFile) {
    form.append("image", imageFile);
  }
  const res = await fetch(`${API_BASE}/messages/conversations/${convoId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: form,
  });
  return res.json();
};

export const getUnreadCount = async () => {
  const res = await fetch(`${API_BASE}/messages/unread-count`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.unread_count ?? 0;
};

export const editMessage = async (msgId, body) => {
  const res = await fetch(`${API_BASE}/messages/${msgId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ body }),
  });
  return res.json();
};

export const deleteMessage = async (msgId) => {
  await fetch(`${API_BASE}/messages/${msgId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

export const markConversationRead = async (convoId) => {
  try {
    await fetch(`${API_BASE}/messages/conversations/${convoId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(`Unexpected error: ${error}`);
    }
  }
};
