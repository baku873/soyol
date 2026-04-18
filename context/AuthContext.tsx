"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { apiClient } from "@/lib/apiClient";
//its replace
interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  imageUrl?: string;
  provider: "local" | "google" | "facebook";
  role?: "admin" | "user" | "vendor";
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  login: () => { },
  logout: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const setCartAuth = useCartStore((state) => state.setAuthenticated);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiClient<{ user: User }>("/api/auth/me");
        setUser(data.user);
        setCartAuth(true);
      } catch (error) {
        setUser(null);
        setCartAuth(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setCartAuth(true);
  };

  const logout = async () => {
    try {
      await apiClient("/api/auth/logout", { method: "DELETE" });
      setUser(null);
      setCartAuth(false);
      clearWishlist();
      clearCart();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: user?.role === "admin",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Returns { user, isSignedIn, isLoaded } for component consumption. */
export const useUser = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  return { user, isSignedIn: isAuthenticated, isLoaded: !isLoading };
};
