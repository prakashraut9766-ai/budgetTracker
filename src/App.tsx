import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailPage } from './pages/GroupDetailPage';

type Page = 'dashboard' | 'groups' | 'group-detail';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (currentPage === 'groups') {
    return (
      <GroupsPage
        onNavigateBack={() => setCurrentPage('dashboard')}
        onNavigateToGroup={(groupId) => {
          setSelectedGroupId(groupId);
          setCurrentPage('group-detail');
        }}
      />
    );
  }

  if (currentPage === 'group-detail' && selectedGroupId) {
    return (
      <GroupDetailPage
        groupId={selectedGroupId}
        onNavigateBack={() => setCurrentPage('groups')}
      />
    );
  }

  return <Dashboard onNavigateToGroups={() => setCurrentPage('groups')} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
