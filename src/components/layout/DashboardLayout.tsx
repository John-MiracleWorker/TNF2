import { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  Book, 
  Hand, 
  BookOpen, 
  FileBadge, 
  PenTool, 
  BarChart3, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search, 
  Settings, 
  Calendar, 
  ChevronDown,
  ChevronRight,
  BookText,
  BookMarked,
  Users,
  Target,
  Tv,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TrueNorthLogo } from '@/components/ui/TrueNorthLogo';
import { AuthContext } from '@/App';
import { supabase, getNotifications, getProfile } from '@/lib/supabase';
import { Notification, UserProfile } from '@/lib/types';
import { SubscriptionBadge } from '@/components/ui/SubscriptionBadge';
import { NotificationsManager } from '@/components/ui/NotificationsManager';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Footer from './Footer';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isScriptureMenuOpen, setIsScriptureMenuOpen] = useState(false);
  const [isGrowthMenuOpen, setIsGrowthMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useContext(AuthContext);

  // Check if the current route is a scripture-related route
  const isScriptureRoute = [
    '/bible', 
    '/scripture-memory', 
    '/bible-study', 
    '/reading-plans',
    '/devotionals'
  ].some(path => location.pathname === path);
  
  // Check if the current route is a growth-related route
  const isGrowthRoute = [
    '/habits',
    '/goals'
  ].some(path => location.pathname === path);

  useEffect(() => {
    if (session) {
      loadDashboardData();
    }
  }, [session]);

  // Set scripture menu open state based on current route
  useEffect(() => {
    setIsScriptureMenuOpen(isScriptureRoute);
    setIsGrowthMenuOpen(isGrowthRoute);
  }, [isScriptureRoute, isGrowthRoute]);

  const loadDashboardData = async () => {
    try {
      // Load user profile
      let userProfileData = null;
      if (session?.user?.id) {
        userProfileData = await getProfile(session.user.id);
      }
      
      // Load notifications
      const notificationsData = await getNotifications();
      
      setUserProfile(userProfileData);
      setNotifications(notificationsData.filter(n => !n.is_read));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Get the user's display name or fallback to other options
  const getUserDisplayName = () => {
    // First try to use the profile display name
    if (userProfile?.display_name) {
      return userProfile.display_name;
    }
    
    // Then try the first name
    if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    
    // Fall back to the email username
    return session?.user?.email?.split('@')[0] || 'User';
  };

  const mainNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Journal', href: '/journal', icon: Book },
    { name: 'Prayer', href: '/prayer', icon: Hand },
    { name: 'Communities', href: '/communities', icon: Users },
    { name: 'Live Stream', href: '/livestream', icon: Tv },
  ];
  
  const scriptureNavItems = [
    { name: 'Bible Explorer', href: '/bible', icon: Search },
    { name: 'Reading Plans', href: '/reading-plans', icon: Calendar },
    { name: 'Devotionals', href: '/devotionals', icon: BookOpen },
    { name: 'Scripture Memory', href: '/scripture-memory', icon: FileBadge },
    { name: 'Bible Study', href: '/bible-study', icon: PenTool },
  ];
  
  const growthNavItems = [
    { name: 'Habits', href: '/habits', icon: BarChart3 },
    { name: 'Goals', href: '/goals', icon: Target },
  ];
  
  // Check if user is admin (only show Admin link if is_admin is true or has tiuni65@gmail.com email)
  const isAdmin = userProfile?.is_admin || session?.user?.email === 'tiuni65@gmail.com';

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Mobile Header */}
      <header className="bg-navy text-cream p-4 w-full md:hidden flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <TrueNorthLogo size={24} className="text-gold" />
          <span className="font-bold">TrueNorth</span>
          <SubscriptionBadge />
        </div>
        
        <div className="flex items-center gap-2">
          <NotificationsManager />
          
          <Button
            variant="ghost"
            size="icon"
            className="text-cream hover:text-gold"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>
      
      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <motion.div
          className="md:hidden fixed inset-0 z-30 bg-navy/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ width: '100%', height: '100%' }}
        >
          <div className="flex flex-col h-full pt-16 pb-6 px-4 overflow-y-auto">
            <nav className="flex-1">
              <ul className="space-y-1">
                {mainNavItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-lg",
                        location.pathname === item.href
                          ? "bg-gold/20 text-gold"
                          : "text-cream hover:bg-navy-800 hover:text-gold"
                      )}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  </li>
                ))}
                
                {/* Scripture Menu for Mobile */}
                <li>
                  <Collapsible 
                    open={isScriptureMenuOpen} 
                    onOpenChange={setIsScriptureMenuOpen}
                    className="w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center justify-between w-full px-4 py-3 rounded-lg",
                          isScriptureRoute
                            ? "bg-gold/20 text-gold"
                            : "text-cream hover:bg-navy-800 hover:text-gold"
                        )}
                      >
                        <div className="flex items-center">
                          <BookMarked className="h-5 w-5 mr-3" />
                          Bible & Scripture
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isScriptureMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                      <ul className="space-y-1 mt-1">
                        {scriptureNavItems.map((item) => (
                          <li key={item.name}>
                            <Link
                              to={item.href}
                              className={cn(
                                "flex items-center px-4 py-2 rounded-lg",
                                location.pathname === item.href
                                  ? "bg-gold/10 text-gold"
                                  : "text-cream/80 hover:bg-navy-800 hover:text-gold"
                              )}
                              onClick={() => setIsSidebarOpen(false)}
                            >
                              <item.icon className="h-4 w-4 mr-2" />
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
                
                {/* Growth Menu for Mobile */}
                <li>
                  <Collapsible 
                    open={isGrowthMenuOpen} 
                    onOpenChange={setIsGrowthMenuOpen}
                    className="w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center justify-between w-full px-4 py-3 rounded-lg",
                          isGrowthRoute
                            ? "bg-gold/20 text-gold"
                            : "text-cream hover:bg-navy-800 hover:text-gold"
                        )}
                      >
                        <div className="flex items-center">
                          <LayoutDashboard className="h-5 w-5 mr-3" />
                          Habits & Goals
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isGrowthMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                      <ul className="space-y-1 mt-1">
                        {growthNavItems.map((item) => (
                          <li key={item.name}>
                            <Link
                              to={item.href}
                              className={cn(
                                "flex items-center px-4 py-2 rounded-lg",
                                location.pathname === item.href
                                  ? "bg-gold/10 text-gold"
                                  : "text-cream/80 hover:bg-navy-800 hover:text-gold"
                              )}
                              onClick={() => setIsSidebarOpen(false)}
                            >
                              <item.icon className="h-4 w-4 mr-2" />
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
                
                {/* Add Admin link if user is admin */}
                {isAdmin && (
                  <li>
                    <Link
                      to="/admin"
                      className={cn(
                        "flex items-center px-4 py-3 rounded-lg",
                        location.pathname === '/admin'
                          ? "bg-gold/20 text-gold"
                          : "text-cream hover:bg-navy-800 hover:text-gold"
                      )}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <Settings className="h-5 w-5 mr-3" />
                      Admin Panel
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
            
            <div className="border-t border-cream/10 pt-4 space-y-2">
              <Link
                to="/profile"
                className="flex items-center px-4 py-3 rounded-lg text-cream hover:bg-navy-800 hover:text-gold"
                onClick={() => setIsSidebarOpen(false)}
              >
                <User className="h-5 w-5 mr-3" />
                Profile
              </Link>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-3 rounded-lg text-cream hover:bg-navy-800 hover:text-gold"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Desktop Layout */}
      <div className="flex-grow flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 lg:w-72 bg-navy text-cream flex-col h-screen sticky top-0">
          <div className="p-4 flex items-center space-x-2">
            <TrueNorthLogo size={32} className="text-gold" />
            <span className="font-bold text-xl">TrueNorth</span>
            <SubscriptionBadge />
          </div>
          
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <ul className="space-y-1">
              {mainNavItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-lg transition-colors",
                      location.pathname === item.href
                        ? "bg-gold/20 text-gold"
                        : "text-cream hover:bg-navy-800 hover:text-gold"
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                </li>
              ))}
              
              {/* Scripture Menu for Desktop */}
              <li>
                <Collapsible 
                  open={isScriptureMenuOpen} 
                  onOpenChange={setIsScriptureMenuOpen}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors",
                        isScriptureRoute
                          ? "bg-gold/20 text-gold"
                          : "text-cream hover:bg-navy-800 hover:text-gold"
                      )}
                    >
                      <div className="flex items-center">
                        <BookMarked className="h-5 w-5 mr-3" />
                        Bible & Scripture
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isScriptureMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4">
                    <ul className="space-y-1 mt-1">
                      {scriptureNavItems.map((item) => (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex items-center px-4 py-2 rounded-lg transition-colors",
                              location.pathname === item.href
                                ? "bg-gold/10 text-gold"
                                : "text-cream/80 hover:bg-navy-800 hover:text-gold"
                            )}
                          >
                            <item.icon className="h-4 w-4 mr-2" />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </li>

              {/* Growth Menu for Desktop */}
              <li>
                <Collapsible 
                  open={isGrowthMenuOpen} 
                  onOpenChange={setIsGrowthMenuOpen}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors",
                        isGrowthRoute
                          ? "bg-gold/20 text-gold"
                          : "text-cream hover:bg-navy-800 hover:text-gold"
                      )}
                    >
                      <div className="flex items-center">
                        <LayoutDashboard className="h-5 w-5 mr-3" />
                        Habits & Goals
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isGrowthMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4">
                    <ul className="space-y-1 mt-1">
                      {growthNavItems.map((item) => (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex items-center px-4 py-2 rounded-lg transition-colors",
                              location.pathname === item.href
                                ? "bg-gold/10 text-gold"
                                : "text-cream/80 hover:bg-navy-800 hover:text-gold"
                            )}
                          >
                            <item.icon className="h-4 w-4 mr-2" />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </li>
              
              {/* Add Admin link if user is admin */}
              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    className={cn(
                      "flex items-center px-4 py-3 rounded-lg transition-colors",
                      location.pathname === '/admin'
                        ? "bg-gold/20 text-gold"
                        : "text-cream hover:bg-navy-800 hover:text-gold"
                    )}
                  >
                    <Settings className="h-5 w-5 mr-3" />
                    Admin Panel
                  </Link>
                </li>
              )}
            </ul>
          </nav>
          
          <div className="border-t border-cream/10 p-4 space-y-2">
            <Link
              to="/profile"
              className={cn(
                "flex items-center px-4 py-3 rounded-lg transition-colors",
                location.pathname === '/profile'
                  ? "bg-gold/20 text-gold"
                  : "text-cream hover:bg-navy-800 hover:text-gold"
              )}
            >
              <User className="h-5 w-5 mr-3" />
              Profile
            </Link>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-3 rounded-lg text-cream hover:bg-navy-800 hover:text-gold transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </button>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Desktop Header */}
          <header className="hidden md:flex items-center justify-end bg-cream border-b border-gray-200 p-4 sticky top-0 z-10">
            <div className="flex items-center space-x-4">
              <NotificationsManager />
              
              <div className="h-8 w-px bg-gray-200" />
              
              <Link to="/profile" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-navy text-cream flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-navy font-medium">
                  {getUserDisplayName()}
                </span>
              </Link>
            </div>
          </header>
          
          {/* Page Content */}
          <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
            {children}
          </div>
          
          {/* Footer */}
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;