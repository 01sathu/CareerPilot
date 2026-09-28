import React, { createContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken } from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Silent refresh on initial load to restore session if valid cookie exists
  const checkAuth = useCallback(async () => {
    try {
      const res = await api.post('/auth/refresh');
      if (res.data?.success && res.data?.data) {
        const { user: userData, accessToken } = res.data.data;
        setUser(userData);
        setAccessToken(accessToken);
      } else {
        setUser(null);
        setAccessToken(null);
      }
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for unauthorized events from api interceptor
    const handleUnauthorized = () => {
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [checkAuth]);

  // Login
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, accessToken } = res.data.data;
    setUser(userData);
    setAccessToken(accessToken);
    return userData;
  };

  // Register
  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const { user: newUser, accessToken } = res.data.data;
    setUser(newUser);
    setAccessToken(accessToken);
    return newUser;
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  // Update Profile
  const updateProfile = async (profileData) => {
    const res = await api.patch('/users/me', profileData);
    const updatedUser = res.data.data.user;
    setUser(updatedUser);
    return updatedUser;
  };

  // Change Password
  const changePassword = async (passwordData) => {
    const res = await api.post('/auth/change-password', passwordData);
    if (res.data.data?.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data;
  };

  // Delete Account (FR-121, FR-123)
  const deleteAccount = async (password, confirmation) => {
    const res = await api.delete('/users/me', {
      data: { password, confirmation }
    });
    setUser(null);
    setAccessToken(null);
    return res.data;
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
