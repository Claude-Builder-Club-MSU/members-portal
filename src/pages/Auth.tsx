import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  // Redirect logged-in users (only after auth finishes loading)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize

    if (user) {
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectUrl, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  const validateEmail = (email: string) => {
    if (!email.endsWith('@msu.edu')) {
      toast({
        title: 'Invalid Email',
        description: 'Please use your @msu.edu email address.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Use signIn from AuthContext
        await signIn(email, password);

        toast({
          title: 'Success',
          description: 'Logged in successfully!',
        });

        // Navigate to dashboard
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirectUrl, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        // Sign up
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (!authData.user) {
          throw new Error('User creation failed');
        }

        toast({
          title: 'Success',
          description: 'Account created! Please check your email to verify.',
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary ${isMobile ? 'px-4 py-8' : 'px-4'}`}>
      <Card className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'}`}>
        <CardHeader className={isMobile ? 'pb-4' : ''}>
          <CardTitle className={isMobile ? 'text-xl' : ''}>{isLogin ? 'Login' : 'Sign Up'}</CardTitle>
          <CardDescription className={isMobile ? 'text-sm' : ''}>
            {isLogin ? 'Welcome back to Claude Builder Club' : 'Join Claude Builder Club @ MSU'}
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0' : ''}>
          <form onSubmit={handleSubmit} className={`space-y-4 ${isMobile ? 'space-y-3' : 'space-y-4'}`}>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email (@msu.edu)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.name@msu.edu"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className={`w-full ${isMobile ? 'h-11' : ''}`} disabled={loading}>
              {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className={`w-full hover:bg-transparent hover:text-primary transition-all duration-200 ${isMobile ? 'h-11 text-sm' : ''}`}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;