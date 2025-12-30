import { useAuth } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import AuthForm from './components/Auth/AuthForm';
import DashboardLayout from './components/Layout/DashboardLayout';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <OfflineProvider>
      <DashboardLayout />
    </OfflineProvider>
  );
}

export default App;
