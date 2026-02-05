import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GiveawayProgress } from './GiveawayProgress';
import { GiveawayFileUpload } from './GiveawayFileUpload';
import { 
  US_STATES, 
  GENRE_OPTIONS, 
  MARKETING_SERVICES_OPTIONS,
  WRITING_STAGE_OPTIONS,
  MARKETING_CONFIDENCE_OPTIONS 
} from '@/lib/giveaway-constants';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { useGiveawaySubmission, GiveawayFormData, initialFormData } from '@/hooks/useGiveawaySubmission';
import { useGiveawayAnalytics } from '@/hooks/useGiveawayAnalytics';
import { toast } from '@/hooks/use-toast';

const TOTAL_STEPS = 9;

interface GiveawayQuestionnaireProps {
  onClose: () => void;
}

export const GiveawayQuestionnaire = ({ onClose }: GiveawayQuestionnaireProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<GiveawayFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { submitEntry, isSubmitting, uploadProgress } = useGiveawaySubmission();
  const { trackProgress, trackCompletion, getAnalyticsData } = useGiveawayAnalytics();

  // Track progress when step changes
  useEffect(() => {
    const progress = Math.round((currentStep / TOTAL_STEPS) * 100);
    trackProgress(progress);
  }, [currentStep, trackProgress]);

  const updateField = useCallback(<K extends keyof GiveawayFormData>(
    field: K,
    value: GiveawayFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const toggleArrayItem = useCallback((field: 'genres' | 'marketingServicesUsed', value: string) => {
    setFormData(prev => {
      const currentArray = prev[field];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  }, []);

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1: // Demographics
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Please enter a valid email';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.state) newErrors.state = 'State is required';
        break;
      case 2: // Referral - optional, but validate email if provided
        if (formData.referrerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.referrerEmail)) {
          newErrors.referrerEmail = 'Please enter a valid email';
        }
        break;
      case 3: // Genre
        if (formData.genres.length === 0) newErrors.genres = 'Please select at least one genre';
        if (formData.genres.includes('other') && !formData.otherGenre.trim()) {
          newErrors.otherGenre = 'Please specify the genre';
        }
        break;
      case 4: // Marketing services - optional
        break;
      case 5: // Marketing reason
        if (!formData.primaryMarketingReason.trim()) newErrors.primaryMarketingReason = 'This field is required';
        break;
      case 6: // Published before
        if (formData.hasPublishedBefore === null) newErrors.hasPublishedBefore = 'Please select an option';
        break;
      case 7: // Writing stage
        if (!formData.writingStage) newErrors.writingStage = 'Please select an option';
        break;
      case 8: // Marketing confidence
        if (!formData.marketingConfidence) newErrors.marketingConfidence = 'Please select an option';
        break;
      case 9: // File upload
        if (!formData.manuscriptFile) newErrors.manuscriptFile = 'Please upload your manuscript';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, formData]);

  const handleNext = useCallback(() => {
    if (validateStep()) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep()) return;

    const analyticsData = getAnalyticsData();
    const result = await submitEntry(formData, analyticsData);

    if (result.success) {
      await trackCompletion();
      navigate('/giveaway-success', { 
        state: { 
          referralCode: result.referralCode,
          name: formData.name 
        } 
      });
    } else {
      toast({
        title: 'Submission Failed',
        description: result.error || 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [validateStep, getAnalyticsData, submitEntry, formData, trackCompletion, navigate]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#171927]">Tell us about yourself</h3>
              <p className="text-gray-500 mt-2">We'd love to get to know you better!</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="Jane Doe"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="jane@example.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => updateField('phone', formatPhoneNumber(e.target.value))}
                  placeholder="(555) 123-4567"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={e => updateField('city', e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select value={formData.state} onValueChange={value => updateField('state', value)}>
                    <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#171927]">Were you referred?</h3>
              <p className="text-gray-500 mt-2">Let us know if someone sent you our way! (Optional)</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="referrerName">Referrer's Name</Label>
                <Input
                  id="referrerName"
                  value={formData.referrerName}
                  onChange={e => updateField('referrerName', e.target.value)}
                  placeholder="John Smith"
                />
              </div>

              <div>
                <Label htmlFor="referrerEmail">Referrer's Email</Label>
                <Input
                  id="referrerEmail"
                  type="email"
                  value={formData.referrerEmail}
                  onChange={e => updateField('referrerEmail', e.target.value)}
                  placeholder="john@example.com"
                  className={errors.referrerEmail ? 'border-red-500' : ''}
                />
                {errors.referrerEmail && <p className="text-red-500 text-sm mt-1">{errors.referrerEmail}</p>}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#171927]">What's your book's genre?</h3>
              <p className="text-gray-500 mt-2">Select all that apply</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GENRE_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.genres.includes(option.value)
                      ? 'border-[#FFA76C] bg-[#FFA76C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Checkbox
                    checked={formData.genres.includes(option.value)}
                    onCheckedChange={() => toggleArrayItem('genres', option.value)}
                  />
                  <span className="text-[#171927]">{option.label}</span>
                </label>
              ))}
            </div>

            {formData.genres.includes('other') && (
              <div>
                <Label htmlFor="otherGenre">Please specify *</Label>
                <Input
                  id="otherGenre"
                  value={formData.otherGenre}
                  onChange={e => updateField('otherGenre', e.target.value)}
                  placeholder="Enter your genre"
                  className={errors.otherGenre ? 'border-red-500' : ''}
                />
                {errors.otherGenre && <p className="text-red-500 text-sm mt-1">{errors.otherGenre}</p>}
              </div>
            )}

            {errors.genres && <p className="text-red-500 text-sm mt-1">{errors.genres}</p>}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#171927]">Marketing Experience</h3>
              <p className="text-gray-500 mt-2">What marketing services have you used before? (Optional)</p>
            </div>
            
            <div className="space-y-3">
              {MARKETING_SERVICES_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.marketingServicesUsed.includes(option.value)
                      ? 'border-[#FFA76C] bg-[#FFA76C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Checkbox
                    checked={formData.marketingServicesUsed.includes(option.value)}
                    onCheckedChange={() => toggleArrayItem('marketingServicesUsed', option.value)}
                  />
                  <span className="text-[#171927]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#171927]">Your Marketing Goals</h3>
              <p className="text-gray-500 mt-2">What is your primary reason for marketing your book?</p>
            </div>
            
            <div>
              <Textarea
                value={formData.primaryMarketingReason}
                onChange={e => updateField('primaryMarketingReason', e.target.value)}
                placeholder="Share your goals and what you hope to achieve..."
                rows={5}
                className={errors.primaryMarketingReason ? 'border-red-500' : ''}
              />
              {errors.primaryMarketingReason && (
                <p className="text-red-500 text-sm mt-1">{errors.primaryMarketingReason}</p>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#171927]">Publishing Experience</h3>
              <p className="text-gray-500 mt-2">Have you published a book before?</p>
            </div>
            
            <RadioGroup
              value={formData.hasPublishedBefore === null ? '' : formData.hasPublishedBefore.toString()}
              onValueChange={value => updateField('hasPublishedBefore', value === 'true')}
              className="space-y-3"
            >
              {[
                { value: 'true', label: 'Yes, I have published before' },
                { value: 'false', label: 'No, this will be my first book' },
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.hasPublishedBefore?.toString() === option.value
                      ? 'border-[#FFA76C] bg-[#FFA76C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <RadioGroupItem value={option.value} />
                  <span className="text-[#171927]">{option.label}</span>
                </label>
              ))}
            </RadioGroup>

            {errors.hasPublishedBefore && (
              <p className="text-red-500 text-sm mt-1">{errors.hasPublishedBefore}</p>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#171927]">Writing Progress</h3>
              <p className="text-gray-500 mt-2">How close are you to finishing writing?</p>
            </div>
            
            <RadioGroup
              value={formData.writingStage}
              onValueChange={value => updateField('writingStage', value)}
              className="space-y-3"
            >
              {WRITING_STAGE_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.writingStage === option.value
                      ? 'border-[#FFA76C] bg-[#FFA76C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <RadioGroupItem value={option.value} />
                  <span className="text-[#171927]">{option.label}</span>
                </label>
              ))}
            </RadioGroup>

            {errors.writingStage && (
              <p className="text-red-500 text-sm mt-1">{errors.writingStage}</p>
            )}
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#171927]">Marketing Confidence</h3>
              <p className="text-gray-500 mt-2">How confident are you in marketing your book?</p>
            </div>
            
            <RadioGroup
              value={formData.marketingConfidence}
              onValueChange={value => updateField('marketingConfidence', value)}
              className="space-y-3"
            >
              {MARKETING_CONFIDENCE_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.marketingConfidence === option.value
                      ? 'border-[#FFA76C] bg-[#FFA76C]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <RadioGroupItem value={option.value} />
                  <span className="text-[#171927]">{option.label}</span>
                </label>
              ))}
            </RadioGroup>

            {errors.marketingConfidence && (
              <p className="text-red-500 text-sm mt-1">{errors.marketingConfidence}</p>
            )}
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-[#171927]">Upload Your Manuscript</h3>
              <p className="text-gray-500 mt-2">
                Submit your manuscript draft, chapters, or complete outline
              </p>
            </div>
            
            <GiveawayFileUpload
              file={formData.manuscriptFile}
              onFileChange={file => updateField('manuscriptFile', file)}
              error={errors.manuscriptFile}
            />

            {isSubmitting && (
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FFA76C] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <GiveawayProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between gap-4">
          {currentStep === 1 ? (
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <Button onClick={handleNext} className="bg-[#FFA76C] hover:bg-[#ff9a52] text-[#171927]">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#FFA76C] hover:bg-[#ff9a52] text-[#171927] min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Entry'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
