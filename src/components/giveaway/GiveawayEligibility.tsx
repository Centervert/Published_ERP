 import { CheckCircle2 } from 'lucide-react';
 import { ELIGIBILITY_CRITERIA } from '@/lib/giveaway-constants';

export const GiveawayEligibility = () => {
  return (
     <section className="py-16 bg-secondary">
      <div className="container mx-auto px-4">
         <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Eligibility
        </h2>
         <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
          Please review the following requirements before entering the giveaway.
        </p>

        <div className="max-w-3xl mx-auto space-y-4">
          {ELIGIBILITY_CRITERIA.map((criterion, index) => (
            <div
              key={index}
               className="flex gap-4 p-4 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
               <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
               <p className="text-foreground text-sm md:text-base">
                {criterion}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
