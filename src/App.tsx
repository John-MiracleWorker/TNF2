import { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { Toaster } from '@/components/ui/toaster';
import { PWAInstallBanner } from '@/components/ui/PWAInstallBanner';
import { PWAUpdateBanner } from '@/components/ui/PWAUpdateBanner';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Pages
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import JournalPage from './pages/JournalPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PrayerPage from './pages/PrayerPage';
import DevotionalPage from './pages/DevotionalPage';
import ScriptureMemoryPage from './pages/ScriptureMemoryPage';
import BibleStudyPage from './pages/BibleStudyPage';
import BiblePage from './pages/BiblePage';
import HabitsPage from './pages/HabitsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import PricingPage from './pages/PricingPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CheckoutCancelPage from './pages/CheckoutCancelPage';
import DeveloperPanelPage from './pages/DeveloperPanelPage';
import CommunitiesPage from './pages/CommunitiesPage';
import GoalsPage from './pages/GoalsPage';
import LiveStreamPage from './pages/LiveStreamPage';

// Context
export const AuthContext = createContext<{
  session: Session | null;
  isLoading: boolean;
}>({
  session: null,
  isLoading: true,
});

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    try {
      // Check if we have required environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables!');
        setHasError(true);
        setErrorMessage('Missing Supabase configuration. Please check your environment variables (.env.local file)');
        setIsLoading(false);
        return;
      }
      
      // Check if user is authenticated
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setIsLoading(false);
      }).catch(error => {
        console.error("Auth session error:", error);
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Failed to check authentication status. Please verify your Supabase configuration.");
        
        toast({
          title: 'Connection Error',
          description: 'We had trouble connecting to our services. Please try again later.',
          variant: 'destructive',
        });
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setIsLoading(false);
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error("Auth initialization error:", error);
      setIsLoading(false);
      setHasError(true);
      setErrorMessage("Failed to initialize authentication. Please check your Supabase configuration.");
      
      toast({
        title: 'Authentication Error',
        description: 'There was a problem setting up authentication. Please refresh the page.',
        variant: 'destructive',
      });
    }
  }, []);

  // Protected route wrapper component
  const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-navy"></div>
      </div>;
    }
    
    if (!session) {
      return <Navigate to="/login" />;
    }
    
    return children;
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-cream p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Application Error</h1>
          <p className="text-red-600 mb-6">{errorMessage || "Something went wrong while loading the application"}</p>
          <div className="text-navy/70 mb-4 text-left">
            <p className="font-medium mb-2">Possible solutions:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Check that you have created an <code>.env.local</code> file with your Supabase credentials</li>
              <li>Verify that the Supabase URL and anon key are correct</li>
              <li>Ensure your Supabase project is running and accessible</li>
              <li>Check your network connection</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-navy text-cream rounded-lg hover:bg-navy/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      <Router>
        <PWAInstallBanner />
        <PWAUpdateBanner />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
          
          {/* Redirect /reading-plans to /bible with reading plans tab selected */}
          <Route path="/reading-plans" element={<Navigate to="/bible" replace />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } />
          <Route path="/journal" element={
            <ProtectedRoute>
              <JournalPage />
            </ProtectedRoute>
          } />
          <Route path="/prayer" element={
            <ProtectedRoute>
              <PrayerPage />
            </ProtectedRoute>
          } />
          <Route path="/devotionals" element={
            <ProtectedRoute>
              <DevotionalPage />
            </ProtectedRoute>
          } />
          <Route path="/scripture-memory" element={
            <ProtectedRoute>
              <ScriptureMemoryPage />
            </ProtectedRoute>
          } />
          <Route path="/bible-study" element={
            <ProtectedRoute>
              <BibleStudyPage />
            </ProtectedRoute>
          } />
          <Route path="/bible" element={
            <ProtectedRoute>
              <BiblePage />
            </ProtectedRoute>
          } />
          <Route path="/habits" element={
            <ProtectedRoute>
              <HabitsPage />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <DeveloperPanelPage />
            </ProtectedRoute>
          } />
          <Route path="/communities" element={
            <ProtectedRoute>
              <CommunitiesPage />
            </ProtectedRoute>
          } />
          <Route path="/goals" element={
            <ProtectedRoute>
              <GoalsPage />
            </ProtectedRoute>
          } />
          <Route path="/livestream" element={
            <ProtectedRoute>
              <LiveStreamPage />
            </ProtectedRoute>
          } />
        </Routes>
        <Toaster />
      </Router>
    </AuthContext.Provider>
  );
}

export default App;