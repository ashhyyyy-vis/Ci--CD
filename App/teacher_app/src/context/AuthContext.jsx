import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [offset, setOffset] = useState(0);

  // Restore auth from localStorage on refresh
  useEffect(() => {
    const saved = localStorage.getItem("auth");
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed.user);
      setToken(parsed.token);
      setOffset(parsed.offset);
    }
  }, []);

  const login = (userData, tokenData, serverTimeData) => {
    const clientNow = Date.now();
    const offset = serverTimeData - clientNow;
    setUser(userData);
    setToken(tokenData);
    setOffset(offset);

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: userData,
        token: tokenData,
        offset,
      })
    );
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setUser(null);
    setToken(null);
    setOffset(0);
  };

  return (
    <AuthContext.Provider value={{ user, token, offset, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
