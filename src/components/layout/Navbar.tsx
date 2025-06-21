import { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { TrueNorthLogo } from '@/components/ui/TrueNorthLogo';
import { AuthContext } from '@/App';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { session } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navLinks = [
    { name: 'Features', href: isHomePage ? '#features' : '/#features' },
    { name: 'How It Works', href: isHomePage ? '#how-it-works' : '/#how-it-works' },
    { name: 'Pricing', href: '/pricing' },
  ];

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-sm shadow-sm py-3'
          : 'bg-transparent py-5'
      }`}
      style={{ left: 0, right: 0 }}
    >
      <div className="container-custom mx-auto px-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <TrueNorthLogo size={32} />
            <span className="font-bold text-xl text-foreground">TrueNorth</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link key={link.name} to={link.href} className="nav-link font-medium">
                {link.name}
              </Link>
            ))}
            <Button
              asChild
              variant="navy"
              className="text-primary-foreground hover:bg-primary/90"
            >
              {session ? (
                <Link to="/dashboard">Dashboard</Link>
              ) : (
                <Link to="/login">Sign In</Link>
              )}
            </Button>
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-foreground p-2"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="md:hidden bg-background absolute top-full left-0 right-0 shadow-md w-full"
        >
          <div className="container-custom py-4 flex flex-col space-y-3 px-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="nav-link py-2 font-medium"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <Button
              asChild
              variant="navy"
              className="w-full mt-2"
            >
              {session ? (
                <Link to="/dashboard" onClick={() => setIsOpen(false)}>Dashboard</Link>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)}>Sign In</Link>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;