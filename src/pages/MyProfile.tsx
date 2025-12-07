import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Camera, Mail, LogOut, Check, Loader2 } from 'lucide-react';

export default function MyProfile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch email connection status
  const { data: emailConnection, isLoading: connectionLoading } = useQuery({
    queryKey: ['email-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_email_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'outlook')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      const names = profile.full_name?.split(' ') || [];
      setFirstName(names[0] || '');
      setLastName(names.slice(1).join(' ') || '');
    }
  }, [profile]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const fullName = `${firstName} ${lastName}`.trim();
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: 'Profile updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    },
  });

  // Connect Outlook
  const connectOutlook = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Please log in again', variant: 'destructive' });
        return;
      }

      const response = await supabase.functions.invoke('outlook-oauth-start', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start OAuth');
      }

      if (response.data?.authUrl) {
        // Open OAuth popup
        const popup = window.open(response.data.authUrl, 'outlook-oauth', 'width=600,height=700');
        
        // Listen for message from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'OUTLOOK_CONNECTED' && event.data?.success) {
            queryClient.invalidateQueries({ queryKey: ['email-connection'] });
            toast({ title: 'Outlook connected successfully!' });
            window.removeEventListener('message', handleMessage);
          }
        };
        window.addEventListener('message', handleMessage);
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      toast({ title: 'Failed to connect Outlook', description: error.message, variant: 'destructive' });
    }
  };

  // Disconnect email
  const disconnectEmail = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_email_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'outlook');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-connection'] });
      toast({ title: 'Email disconnected' });
    },
    onError: (error) => {
      toast({ title: 'Failed to disconnect', description: error.message, variant: 'destructive' });
    },
  });

  // Sign out everywhere
  const signOutEverywhere = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast({ title: 'Signed out of all devices' });
    } catch (error: any) {
      toast({ title: 'Failed to sign out', description: error.message, variant: 'destructive' });
    }
  };

  const getInitials = () => {
    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-medium text-foreground">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Personal Data */}
        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Personal Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar Section */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-20 w-20 border border-border/50">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-lg bg-muted/50 text-muted-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-background border border-border/50 flex items-center justify-center hover:bg-muted/50 transition-colors">
                    <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Profile Image</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    512×512 px, max 2.5 MB
                  </p>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-normal text-muted-foreground">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-normal text-muted-foreground">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-normal text-muted-foreground">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="h-9 text-sm bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-normal text-muted-foreground">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => updateProfile.mutate()}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : null}
                  Update Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Security & Integrations */}
        <div className="space-y-6">
          {/* Email Sync Card */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Email (2-way sync)</CardTitle>
              <CardDescription className="text-xs">
                Sync emails between the CRM & your personal email account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground">Select your email provider</p>
              
              {/* Outlook Option */}
              <div 
                className={`flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer ${
                  emailConnection ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:border-border hover:bg-muted/30'
                }`}
                onClick={!emailConnection ? connectOutlook : undefined}
              >
                <div className="h-8 w-8 rounded bg-[#0078d4]/90 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Outlook</p>
                  {emailConnection && (
                    <p className="text-xs text-muted-foreground truncate">{emailConnection.email}</p>
                  )}
                </div>
                {emailConnection ? (
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-xs text-primary font-medium">Connected</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Click to connect</span>
                )}
              </div>

              <div className="flex justify-end">
                {emailConnection ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectEmail.mutate()}
                    disabled={disconnectEmail.isPending}
                    className="h-8 text-xs"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={connectOutlook} className="h-8 text-xs">
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sign Out Everywhere Card */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Sign Out Everywhere</CardTitle>
              <CardDescription className="text-xs">
                Sign out of all devices and sessions, including this one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={signOutEverywhere}
                  className="h-8 text-xs"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  Sign Out Everywhere
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
