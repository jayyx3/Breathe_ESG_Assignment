import React, { createContext, useState, useEffect, useContext } from 'react';
import * as api from '../api/endpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('accessToken');
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Interceptor logout listener: triggers if API throws a 401 Unauthorized
    const handleLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth_logout', handleLogout);
    return () => {
      window.removeEventListener('auth_logout', handleLogout);
    };
  }, []);

  const loginUser = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(username, password);
      
      // Save tokens
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      
      // Retrieve and save user details (Simple JWT returns user id/access, let's store default details)
      const userObj = { username };
      localStorage.setItem('user', JSON.stringify(userObj));
      
      setUser(userObj);
      setIsAuthenticated(true);
      setLoading(false);
      return true;
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.detail || 'Invalid username or password';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        loginUser,
        logoutUser,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
