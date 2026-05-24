import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Review from './pages/Review';

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'upload' | 'review'

  // If analyst is not logged in, force Login portal
  if (!isAuthenticated) {
    return <Login />;
  }

  // If logged in, wrap inside the app sidebar shell
  return (
    <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {currentTab === 'dashboard' && <Dashboard />}
      {currentTab === 'upload' && <Upload />}
      {currentTab === 'review' && <Review />}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
