import { CheckCircle2 } from 'lucide-react';
import { ELIGIBILITY_CRITERIA } from '@/lib/giveaway-constants';

export const GiveawayEligibility = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-[#171927] mb-4">
          Eligibility
        </h2>
        <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
          Please review the following requirements before entering the giveaway.
        </p>

        <div className="max-w-3xl mx-auto space-y-4">
          {ELIGIBILITY_CRITERIA.map((criterion, index) => (
            <div
              key={index}
              className="flex gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:border-[#FFA76C]/30 transition-colors"
            >
              <CheckCircle2 className="w-5 h-5 text-[#FFA76C] flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-sm md:text-base">
                {criterion}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
