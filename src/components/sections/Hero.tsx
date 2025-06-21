import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CompassIllustration } from '../ui/CompassIllustration';

const Hero = () => {
  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-background relative overflow-hidden">
      {/* Mountain Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/serene-mountains-background.png" 
          alt="Peaceful mountains" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background"></div>
      </div>
      
      <div className="container-custom mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col space-y-6"
          >
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight drop-shadow-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Faith-Centered Guidance for Your Journey
            </motion.h1>
            
            <motion.p 
              className="text-lg text-muted-foreground max-w-xl drop-shadow-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              TrueNorth combines Biblical wisdom with AI technology to provide personalized spiritual guidance, encouragement, and practical advice for your daily walk.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Button size="lg" asChild variant="secondary" className="font-medium">
                <Link to="/pricing">
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary text-foreground hover:bg-accent/5">
                <Link to="#features">Learn More</Link>
              </Button>
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex justify-center md:justify-end"
          >
            <CompassIllustration />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;