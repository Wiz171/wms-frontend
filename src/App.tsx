import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UserManagementPage from './pages/UserManagementPage';
import ProductManagementPage from './pages/ProductManagementPage';
import CustomerManagementPage from './pages/CustomerManagementPage';
import OrderManagementPage from './pages/OrderManagementPage';
import TaskManagementPage from './pages/TaskManagementPage';
import { apiRequest, logout } from './api';
import type { User } from './api';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[App] useEffect - token:', localStorage.getItem('token'));
    const initializeApp = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        console.log('[App] No token found, not logged in');
        return;
      }

      try {
        const userData = await apiRequest<User>('/api/users/me');
        setUser(userData);
        console.log('[App] User data set:', userData);
      } catch (error) {
        console.error('[App] Failed to fetch user data:', error);
        localStorage.removeItem('token');
        toast.error('Session expired. Please login again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    console.log('[App] user state changed:', user);
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage 
                onLogin={(userData: User) => {
                  setUser(userData);
                  toast.success('Login successful!');
                }} 
              />
            )
          } 
        />
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/users"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <UserManagementPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/products"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <ProductManagementPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/customers"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <CustomerManagementPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/orders"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <OrderManagementPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/tasks"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <TaskManagementPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
