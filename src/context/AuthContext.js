import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    const stored = localStorage.getItem("mm_auth_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem("mm_auth_user");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("mm_auth_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mm_auth_user");
  };

  const value = { user, login, logout, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
