import { useLocation, Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PartyPopper, Copy, Check, Instagram, Facebook, Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

const GiveawaySuccess = () => {
  const location = useLocation();
  const state = location.state as { referralCode?: string; name?: string } | null;
  const [copied, setCopied] = useState(false);

  // Redirect if accessed directly without submitting
  if (!state?.referralCode) {
    return <Navigate to="/Publish_with_Partner_Giveaway" replace />;
  }

  const referralLink = `${window.location.origin}/Publish_with_Partner_Giveaway?ref=${state.referralCode}`;

  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Referral link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please manually copy the link',
        variant: 'destructive',
      });
    }
  };

  const firstName = state.name?.split(' ')[0] || 'there';

  return (
    <>
      <Helmet>
        <title>Entry Submitted | Publish with a Partner Giveaway</title>
        <meta name="robots" content="noindex" />
      </Helmet>

       <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          {/* Success Icon */}
          <div className="mb-8">
             <div className="w-24 h-24 mx-auto bg-primary rounded-full flex items-center justify-center animate-bounce">
               <PartyPopper className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>

          {/* Congratulations Message */}
           <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Congratulations, {firstName}!
          </h1>
           <p className="text-xl text-muted-foreground mb-8">
            Your entry has been submitted successfully. You're one step closer to concierge publishing!
          </p>

          {/* Referral Card */}
           <div className="bg-card rounded-2xl p-6 mb-8 border border-border shadow-sm">
             <h2 className="text-lg font-semibold text-foreground mb-2">
              Increase Your Chances!
            </h2>
             <p className="text-muted-foreground text-sm mb-4">
              Share your unique referral link with friends. Each friend who enters gives you an additional chance to win (up to 5 referrals).
            </p>

             <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
               <code className="flex-1 text-primary text-sm truncate">
                {referralLink}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyReferralCode}
                 className="text-foreground hover:text-primary flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

             <p className="text-muted-foreground text-xs mt-2">
               Your referral code: <span className="font-mono text-primary">{state.referralCode}</span>
            </p>
          </div>

          {/* Social Links */}
          <div className="mb-8">
             <p className="text-muted-foreground text-sm mb-4">Follow us for updates:</p>
            <div className="flex justify-center gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                 className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                 className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://authorservices.com"
                target="_blank"
                rel="noopener noreferrer"
                 className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* CTA */}
          <Link to="/">
            <Button
              size="lg"
               className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Explore Our Services
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>

          {/* Footer */}
           <p className="text-muted-foreground text-sm mt-12">
            © {new Date().getFullYear()} Author Services. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default GiveawaySuccess;
