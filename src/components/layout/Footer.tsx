import { Link } from 'react-router-dom';
import { Heart, Mail } from 'lucide-react';
import { TrueNorthLogo } from '@/components/ui/TrueNorthLogo';
import { useContext, useRef } from 'react';
import { MusicControls } from '@/components/ui/MusicControls';
import { AuthContext } from '@/App';

const Footer = () => {
  const { session } = useContext(AuthContext);
  const audioRef = useRef<HTMLAudioElement | null>(
    typeof document !== 'undefined' ? document.querySelector('audio') : null
  );

  return (
    <footer className="bg-navy text-cream pt-12 pb-6">
      <div className="container-custom mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <TrueNorthLogo size={24} className="text-gold" />
            <span className="font-bold text-lg">TrueNorth</span>
          </div>
          
          <div className="flex items-center space-x-6 md:space-x-8">
            <Link to="#" className="text-cream hover:text-gold transition-colors">Privacy</Link>
            <Link to="#" className="text-cream hover:text-gold transition-colors">Terms</Link>
            <a 
              href="mailto:tiuni65@gmail.com" 
              className="text-cream hover:text-gold transition-colors flex items-center"
            >
              <Mail className="h-4 w-4 mr-1" />
              Contact
            </a>
          </div>
        </div>
        
        <div className="border-t border-cream/10 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-cream/70 mb-2 md:mb-0">
            © {new Date().getFullYear()} TrueNorth. All rights reserved.
          </p>
          
          <div className="flex items-center space-x-4">
            <p className="text-sm text-cream/70 flex items-center">
              Made with <Heart className="h-4 w-4 text-gold mx-1" /> and Biblical wisdom
            </p>
            
            {/* Music controls */}
            {session && audioRef.current && <MusicControls audioRef={audioRef} />}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;