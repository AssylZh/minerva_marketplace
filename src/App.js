import Header from "./components/Header";
import Toast from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Messages from "./pages/Messages";
import Post from "./pages/Post";
import Items from "./pages/Items";
import Item from "./pages/Item";
import EditItem from "./pages/EditItem";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useUnreadMessages } from "./hooks/useUnreadMessages";

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { notifications, dismiss, navigateToConversation } = useUnreadMessages(isAuthenticated);

  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/post" element={<ProtectedRoute><Post /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/items" element={<ProtectedRoute><Items /></ProtectedRoute>} />
          <Route path="/items/:itemID" element={<ProtectedRoute><Item /></ProtectedRoute>} />
          <Route path="/items/:itemID/edit" element={<ProtectedRoute><EditItem /></ProtectedRoute>} />
        </Routes>
      </main>
      <Toast notifications={notifications} onDismiss={dismiss} onOpen={navigateToConversation} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
