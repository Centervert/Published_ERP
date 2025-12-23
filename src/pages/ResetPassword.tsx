import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import authorServicesLogo from '@/assets/author-services-logo.png';

const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [tokenType, setTokenType] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid recovery session or need to verify a token
    const checkSession = async () => {
      // First check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsValidSession(true);
        setIsCheckingSession(false);
        return;
      }

      // Check for token_hash in URL (PKCE flow - scanner resistant)
      const urlParams = new URLSearchParams(window.location.search);
      const hash = urlParams.get('token_hash');
      const type = urlParams.get('type');
      
      if (hash && type) {
        // Store token info but DON'T verify yet - wait for user interaction
        setTokenHash(hash);
        setTokenType(type);
        setNeedsVerification(true);
        setIsCheckingSession(false);
        return;
      }

      // Check for hash parameters (legacy flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const hashType = hashParams.get('type');
      
      if (accessToken && (hashType === 'recovery' || hashType === 'invite')) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (!error) {
          setIsValidSession(true);
        }
      }
      
      setIsCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleVerifyToken = async () => {
    if (!tokenHash || !tokenType) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: tokenType as 'recovery' | 'invite' | 'email',
      });

      if (error) {
        console.error('Token verification error:', error);
        toast({
          title: 'Link Expired',
          description: 'This invitation link has expired. Please request a new invite.',
          variant: 'destructive',
        });
        setNeedsVerification(false);
      } else if (data.session) {
        setIsValidSession(true);
        setNeedsVerification(false);
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast({
        title: 'Error',
        description: 'Failed to verify the invitation link.',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    try {
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setIsSuccess(true);
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully set.',
      });
    }

    setIsLoading(false);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show verification button for scanner-resistant flow
  if (needsVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img 
                src={authorServicesLogo} 
                alt="Author Services" 
                className="h-12 w-auto"
              />
            </div>
            <CardDescription>
              Click the button below to accept your invitation and set up your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={handleVerifyToken}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession && !isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img 
                src={authorServicesLogo} 
                alt="Author Services" 
                className="h-12 w-auto"
              />
            </div>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img 
              src={authorServicesLogo} 
              alt="Author Services" 
              className="h-12 w-auto"
            />
          </div>
          <CardDescription>
            {isSuccess ? 'Your password has been set' : 'Create your password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                You can now sign in with your new password.
              </p>
              <Button 
                className="w-full" 
                onClick={() => navigate('/auth')}
              >
                Go to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  'Set Password'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
