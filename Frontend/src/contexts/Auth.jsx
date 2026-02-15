import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

//_____________________________________________________________
//WHAT IS THIS FOR???
// This context manages authentication state across the app. It provides the current user, auth token, and functions to log in and log out. It also handles restoring the user on app load using the token stored in localStorage.
//_____________________________________________________________

export const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  // Restore user on app load so the user remains logged in across refreshes
  useEffect(() => {
    const restoreUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        setUser({
          id: data.id,
          username: data.username,
          name: data.first_name || data.username,
          role: data.role,
          library: data.library || [], // ⭐ ADD THIS
          author_keys: data.author_keys || [], // optional but useful
        });
      } catch (err) {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreUser();
  }, [token]);

  const login = async (tokenValue) => {
    try {
      // Save token
      localStorage.setItem("token", tokenValue);
      setToken(tokenValue);

      // Fetch user info from /auth/me
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${tokenValue}`,
        },
      });

      const data = await res.json();

      // Normalize and store user
      setUser({
        id: data.id,
        username: data.username,
        name: data.first_name || data.username,
        role: data.role,
        library: data.library || [],
        author_keys: data.author_keys || [],
      });
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
