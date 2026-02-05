import { cn } from '@/lib/utils';

interface GiveawayProgressProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = [
  'About You',
  'Referral',
  'Genre',
  'Marketing',
  'Your Goals',
  'Experience',
  'Writing Status',
  'Confidence',
  'Manuscript',
];

export const GiveawayProgress = ({ currentStep, totalSteps }: GiveawayProgressProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#FFA76C] to-[#ff9a52] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step info */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="font-medium text-[#171927]">
          {stepLabels[currentStep - 1] || `Step ${currentStep}`}
        </span>
      </div>

      {/* Step dots (visible on larger screens) */}
      <div className="hidden md:flex justify-between mt-4">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full transition-all duration-300',
              i + 1 < currentStep
                ? 'bg-[#FFA76C]'
                : i + 1 === currentStep
                ? 'bg-[#FFA76C] ring-4 ring-[#FFA76C]/30'
                : 'bg-gray-200'
            )}
          />
        ))}
      </div>
    </div>
  );
};
