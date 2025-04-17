import { AuthApi, AuthLoginPost200ResponseUser, Configuration, DefaultConfig } from "@/api";
import { ca } from "date-fns/locale";
import { createContext, useState, useContext, ReactNode, useEffect } from "react";

interface AuthContextType {
  token: string | null;
  user: AuthLoginPost200ResponseUser | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithCookie: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const demoUser = { userId: "demo", name: "demo", profilePictureUrl: null };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("jwtToken") || null);
  const [user, setUser] = useState<AuthLoginPost200ResponseUser | null>(null);

  const [ready, setReady] = useState(false);

  DefaultConfig.config = new Configuration({
    basePath: DefaultConfig.basePath,
    accessToken: token ?? undefined,
  });
  const authApi = new AuthApi(DefaultConfig);

  const logout = () => setToken(null);

  const login = async (username: string, password: string) => {
    if (isDemoMode) {
      setToken('demo-token');
      setUser(demoUser);
      return;
    }
    const res = await authApi.authLoginPost({
      authLoginPostRequest: {
        userId: username,
        password
      },
    });
    setToken(res.token);
    setUser(res.user);
  };

  const loginWithCookie = async () => {
    if (isDemoMode) {
      const demoUser = { userId: 'demo', name: 'Demo User', profilePictureUrl: null };
      setToken('demo-token');
      setUser(demoUser);
      return;
    }
    const { token, user } = await authApi.authCheckGet({
      credentials: "include",
    });
    setToken(token);
    setUser(user);
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem("jwtToken", token);
    } else {
      localStorage.removeItem("jwtToken");
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (isDemoMode) {
      setUser(demoUser);
      setReady(true);
      return;
    }
    const fetchUser = async () => {
      try {
        const res = await authApi.authCheckGet({
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        setUser(res.user);
      } finally {
        setReady(true);
      }
    };
    if (token && !user && !ready) {
      fetchUser();
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return "Loading...";
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        loginWithCookie,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
