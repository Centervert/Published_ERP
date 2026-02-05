import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { GiveawayHero } from '@/components/giveaway/GiveawayHero';
import { GiveawayHowToEnter } from '@/components/giveaway/GiveawayHowToEnter';
import { GiveawayEligibility } from '@/components/giveaway/GiveawayEligibility';
import { GiveawayQuestionnaire } from '@/components/giveaway/GiveawayQuestionnaire';
import { useGiveawayAnalytics } from '@/hooks/useGiveawayAnalytics';

const PublishWithPartnerGiveaway = () => {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const { trackQuestionnaireStart } = useGiveawayAnalytics();

  const handleEnterClick = () => {
    setShowQuestionnaire(true);
    trackQuestionnaireStart();
  };

  const handleCloseQuestionnaire = () => {
    setShowQuestionnaire(false);
  };

  return (
    <>
      <Helmet>
        <title>Publish with a Partner | Publishing Package Giveaway</title>
        <meta 
          name="description" 
          content="New to publishing? Partner with our experts: enter to win a chance to turn your idea into a real eBook + author website, with free guidance sessions." 
        />
        <meta property="og:title" content="Publish with a Partner | Publishing Package Giveaway" />
        <meta 
          property="og:description" 
          content="Enter to win a free comprehensive eBook package, personalized website, and curated coaching sessions." 
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <GiveawayHero onEnterClick={handleEnterClick} />

        {/* How to Enter Section */}
        <GiveawayHowToEnter />

        {/* Eligibility Section */}
        <GiveawayEligibility />

        {/* Footer */}
        <footer className="bg-[#171927] py-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Author Services. All rights reserved.
          </p>
        </footer>

        {/* Questionnaire Modal */}
        {showQuestionnaire && (
          <GiveawayQuestionnaire onClose={handleCloseQuestionnaire} />
        )}
      </div>
    </>
  );
};

export default PublishWithPartnerGiveaway;
