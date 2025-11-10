import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../utils/api";

const AuthContext = createContext(null);

const decodeTokenPayload = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode token payload", error);
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowInSeconds;
};

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    role: user.role || "customer",
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("authToken");

      if (token && isTokenExpired(token)) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setLoading(false);
        toast.info("Session expired. Please log in again.", { autoClose: 1500 });
        return;
      }

      if (storedUser && token) {
        const parsedUser = normalizeUser(JSON.parse(storedUser));
        setUser(parsedUser);
        if (parsedUser.role !== JSON.parse(storedUser).role) {
          localStorage.setItem("user", JSON.stringify(parsedUser));
        }
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      const { data } = await api.post("/auth/login", credentials);

      const normalizedUser = normalizeUser(data.user);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      localStorage.setItem("authToken", data.token);
      setUser(normalizedUser);
      setIsAuthenticated(true);
      toast.success("Logged in successfully!", { autoClose: 1000 });
      return data;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to log in. Please try again.";
      throw new Error(message);
    }
  };

  const signup = async (userData) => {
    try {
      const { data } = await api.post("/auth/register", userData);
      toast.success(
        data.message || "Account created. Check your email for the code.",
        { autoClose: 1000 }
      );
      return data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Failed to create account. Please try again.";
      throw new Error(message);
    }
  };

  const verifyEmail = async ({ email, otp }) => {
    try {
      const { data } = await api.post("/auth/verify-email", { email, otp });

      const normalizedUser = normalizeUser(data.user);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      localStorage.setItem("authToken", data.token);
      setUser(normalizedUser);
      setIsAuthenticated(true);
      toast.success(data.message || "Email verified successfully!", {
        autoClose: 1000,
      });
      return data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Failed to verify email. Please try again.";
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setUser(null);
    setIsAuthenticated(false);
    toast.info("Logged out.", { autoClose: 1000 });
  };

  const isAdmin = Boolean(user?.role === "admin");

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    loading,
    login,
    signup,
    verifyEmail,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
