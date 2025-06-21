import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrueNorthLogo } from '@/components/ui/TrueNorthLogo';
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from '@/App';
import { signUp } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const registerSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useContext(AuthContext);
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // Redirect if already logged in
  if (session) {
    navigate('/dashboard');
    return null;
  }

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    
    try {
      console.log('Starting registration for:', data.email);
      const result = await signUp(data.email, data.password);
      
      console.log('Registration successful:', result);
      
      toast({
        title: 'Registration Successful',
        description: 'Your account has been created. You can now sign in with your credentials.',
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'An unexpected error occurred during registration';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Show helpful error messages for common issues
      if (errorMessage.includes('Database error') || errorMessage.includes('Database setup error')) {
        errorMessage = 'Database configuration issue detected. Please contact support or check that your Supabase project is properly configured with all required migrations.';
      } else if (errorMessage.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Please try signing in instead.';
      } else if (errorMessage.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (errorMessage.includes('Password')) {
        errorMessage = 'Password must be at least 8 characters long.';
      }
      
      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream relative">
      <Navbar />
      
      {/* Mountain Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/serene-mountains-background.png" 
          alt="Peaceful mountains" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cream/70"></div>
      </div>
      
      <main className="flex-grow flex items-center justify-center py-12 px-4 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-2">
                <TrueNorthLogo size={48} />
              </div>
              <h1 className="text-2xl font-bold text-navy">Create an Account</h1>
              <p className="text-navy/70">Join TrueNorth to begin your faith journey</p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full bg-navy text-cream hover:bg-navy/90"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-navy/70">
                Already have an account?{' '}
                <Link to="/login" className="text-gold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50/80 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> If you encounter database errors, please ensure your Supabase project is properly configured with all required database migrations. Check the README.md for setup instructions.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RegisterPage;