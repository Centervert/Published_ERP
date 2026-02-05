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
       <div className="relative h-2 bg-border rounded-full overflow-hidden mb-3">
         <div
           className="absolute left-0 top-0 h-full bg-primary transition-all duration-500 ease-out"
           style={{ width: `${progress}%` }}
         />
       </div>
 
       {/* Step info */}
       <div className="flex justify-between items-center text-sm">
         <span className="text-muted-foreground">
           Step {currentStep} of {totalSteps}
         </span>
         <span className="font-medium text-foreground">
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
                 ? 'bg-primary'
                 : i + 1 === currentStep
                 ? 'bg-primary ring-4 ring-primary/30'
                 : 'bg-border'
             )}
           />
         ))}
       </div>
     </div>
   );
 };
