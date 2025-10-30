// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAddress, useConnectionStatus } from "@thirdweb-dev/react";

interface AuthState {
  address: string | null;
  timestamp: number;
  walletType: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  authState: AuthState | null;
  login: (address: string, walletType: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const address = useAddress();
  const connectionStatus = useConnectionStatus();
  const [authState, setAuthState] = useState<AuthState | null>(null);

  // 初回ロード時にローカルストレージから認証情報を復元
  useEffect(() => {
    const stored = localStorage.getItem("gifterra_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // 24時間以内の認証情報のみ有効
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setAuthState(parsed);
        } else {
          localStorage.removeItem("gifterra_auth");
        }
      } catch (e) {
        console.error("Failed to parse auth state:", e);
        localStorage.removeItem("gifterra_auth");
      }
    }
  }, []);

  // ウォレット接続状態と同期
  useEffect(() => {
    if (address && connectionStatus === "connected") {
      const walletType = "connected"; // 実際のウォレットタイプは後で取得可能
      login(address, walletType);
    } else if (connectionStatus === "disconnected" && authState) {
      // ウォレット切断時は認証状態をクリア
      logout();
    }
  }, [address, connectionStatus]);

  const login = (address: string, walletType: string) => {
    const newAuthState: AuthState = {
      address,
      timestamp: Date.now(),
      walletType,
    };
    setAuthState(newAuthState);
    localStorage.setItem("gifterra_auth", JSON.stringify(newAuthState));
  };

  const logout = () => {
    setAuthState(null);
    localStorage.removeItem("gifterra_auth");
  };

  const isAuthenticated = !!authState && !!address && connectionStatus === "connected";

  return (
    <AuthContext.Provider value={{ isAuthenticated, authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
