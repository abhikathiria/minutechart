import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const email = localStorage.getItem("email");
      const companyName = localStorage.getItem("companyName");
      const userId = localStorage.getItem("userId");
      setUser({
        token,
        email: email ?? null,
        companyName: companyName ?? null,
        userId: userId ? Number(userId) : null,
      });
    }
  }, []);


  const login = (payload) => {
    // payload from API: { token, email?, userId?, companyName? }
    if (payload.email) localStorage.setItem("email", payload.email);
    if (payload.userId) localStorage.setItem("userId", String(payload.userId));
    if (payload.companyName) localStorage.setItem("companyName", payload.companyName);

    localStorage.setItem("token", payload.token);
    setUser({
      token: payload.token,
      email: payload.email ?? localStorage.getItem("email"),
      companyName: payload.companyName ?? localStorage.getItem("companyName"),
      userId: payload.userId ?? Number(localStorage.getItem("userId")),
    });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
