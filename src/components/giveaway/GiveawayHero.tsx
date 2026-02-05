import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';

interface GiveawayHeroProps {
  onEnterClick: () => void;
}

export const GiveawayHero = ({ onEnterClick }: GiveawayHeroProps) => {
  return (
    <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#171927] via-[#1e2235] to-[#171927]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #FFA76C 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, #FFA76C 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#171927]/80 to-transparent" />

      <div className="relative z-10 container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFA76C]/20 rounded-full mb-6">
            <Gift className="w-4 h-4 text-[#FFA76C]" />
            <span className="text-[#FFA76C] text-sm font-medium">Limited Time Giveaway</span>
          </div>

          {/* H1 Title */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Publish with a Partner:
            <br />
            <span className="text-[#FFA76C]">The Comprehensive Publishing Experience Giveaway</span>
          </h1>

          {/* H2 Subtitle */}
          <h2 className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Claim your chance to publish for free* including a comprehensive eBook package, 
            personalized website, and curated coaching sessions on a topic of your choice.
          </h2>

          {/* CTA Button */}
          <Button
            onClick={onEnterClick}
            size="lg"
            className="bg-[#FFA76C] hover:bg-[#ff9a52] text-[#171927] font-semibold text-lg px-10 py-6 h-auto rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#FFA76C]/30"
          >
            <Gift className="w-5 h-5 mr-2" />
            Enter to Win
          </Button>
        </div>
      </div>
    </section>
  );
};
