import { AuthApi, AuthLoginPost200ResponseUser, Configuration, DefaultConfig } from "@/api";
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("jwtToken") || null);
  const [user, setUser] = useState<AuthLoginPost200ResponseUser | null>(null);

  const authApi = new AuthApi();
  DefaultConfig.config = new Configuration({
    basePath: DefaultConfig.basePath,
    accessToken: token ?? undefined,
  });
  

  const logout = () => setToken(null);

  const login = async (username: string, password: string) => {
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
    const {token, user} = await authApi.authGithubLoginGet({
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
