import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("fms_token") || "");
    const [isInitializing, setIsInitializing] = useState(true);

    // Initialize auth state
    useEffect(() => {
        async function initAuth() {
            if (!token) {
                setIsInitializing(false);
                return;
            }

            try {
                const data = await apiFetch("/auth/me", {}, token);
                setUser(data.user);
                setRole(data.user.role);
            } catch (err) {
                console.error("Auth init error:", err);
                // Token might be expired/invalid
                if (err.message === "Unauthorized") {
                    logout();
                }
            } finally {
                setIsInitializing(false);
            }
        }

        initAuth();
    }, [token]);

    const login = async (username, password) => {
        const data = await apiFetch("/auth/login", {
            method: "POST",
            body: { username, password },
        });

        localStorage.setItem("fms_token", data.token);
        setToken(data.token);
        // User data will be fetched by the useEffect hook since token changed
        return data;
    };

    const logout = () => {
        localStorage.removeItem("fms_token");
        setToken("");
        setUser(null);
        setRole(null);
    };

    // Provide a generic API fetch method bound to the current token
    const fetchApi = (path, options = {}) => {
        return apiFetch(path, options, token).catch(err => {
            // Auto-logout on 401 across the app
            if (err.message === "Unauthorized") {
                logout();
            }
            throw err;
        });
    };

    const value = {
        user,
        role,
        token,
        isAuthenticated: !!user,
        isInitializing,
        login,
        logout,
        fetchApi,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
