import { FileText, Upload, PartyPopper } from 'lucide-react';

const steps = [
  {
    icon: FileText,
    title: 'Fill Out the Questionnaire',
    description: 'Click the link to fill out a short questionnaire about you and your book.',
  },
  {
    icon: Upload,
    title: 'Submit Your Manuscript',
    description: 'Submit your manuscript draft, chapters, or complete outline.',
  },
  {
    icon: PartyPopper,
    title: 'Do a Happy Dance!',
    description: 'You are one step closer to concierge publishing!',
  },
];

export const GiveawayHowToEnter = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-center text-[#171927] mb-12">
          How to Enter
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:shadow-lg transition-shadow duration-300"
            >
              {/* Step number */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#FFA76C] text-[#171927] font-bold flex items-center justify-center text-sm">
                {index + 1}
              </div>

              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-4 mt-2 rounded-full bg-[#171927]/5 flex items-center justify-center">
                <step.icon className="w-8 h-8 text-[#171927]" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-[#171927] mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
