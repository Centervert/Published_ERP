 import { Button } from '@/components/ui/button';
 import { Gift, Sparkles } from 'lucide-react';

interface GiveawayHeroProps {
  onEnterClick: () => void;
}

export const GiveawayHero = ({ onEnterClick }: GiveawayHeroProps) => {
  return (
     <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden bg-background">
       {/* Subtle background pattern */}
       <div className="absolute inset-0 opacity-30">
         <div className="absolute inset-0" style={{
           backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.1) 1px, transparent 1px),
                            radial-gradient(circle at 75% 75%, hsl(var(--primary) / 0.1) 1px, transparent 1px)`,
           backgroundSize: '60px 60px',
         }} />
       </div>
 
       <div className="relative z-10 container mx-auto px-4 py-16 text-center">
         <div className="max-w-4xl mx-auto">
           {/* Badge */}
           <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
             <Sparkles className="w-4 h-4 text-primary" />
             <span className="text-primary text-sm font-medium">Limited Time Giveaway</span>
          </div>

          {/* H1 Title */}
           <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Publish with a Partner:
            <br />
             <span className="text-primary">The Comprehensive Publishing Experience Giveaway</span>
          </h1>

          {/* H2 Subtitle */}
           <h2 className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Claim your chance to publish for free* including a comprehensive eBook package, 
            personalized website, and curated coaching sessions on a topic of your choice.
          </h2>

          {/* CTA Button */}
          <Button
            onClick={onEnterClick}
            size="lg"
             className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-10 py-6 h-auto rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <Gift className="w-5 h-5 mr-2" />
            Enter to Win
          </Button>
        </div>
      </div>
    </section>
  );
};
