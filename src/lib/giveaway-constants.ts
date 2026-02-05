// US States list
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

// Genre options
export const GENRE_OPTIONS = [
  { value: 'childrens', label: "Children's Stories" },
  { value: 'memoir', label: 'Memoir' },
  { value: 'biography', label: 'Biography/Autobiography' },
  { value: 'how-to', label: 'How-To/Educational' },
  { value: 'self-help', label: 'Self-Help' },
  { value: 'travel', label: 'Travel' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'romance', label: 'Romance' },
  { value: 'true-crime', label: 'True-Crime' },
  { value: 'other', label: 'Other' },
];

// Marketing services options
export const MARKETING_SERVICES_OPTIONS = [
  { value: 'social-media', label: 'Social Media (Instagram, Facebook, X, Pinterest, TikTok)' },
  { value: 'direct-emails', label: 'Direct Emails' },
  { value: 'publicity', label: 'Publicity Services/Personal Publicist' },
  { value: 'website', label: 'Website Services' },
  { value: 'paid-ads', label: 'Paid Advertisements' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'promotional-items', label: 'Promotional items (bookmarks, themed merchandise)' },
];

// Writing stage options
export const WRITING_STAGE_OPTIONS = [
  { value: 'final-draft', label: 'I have completed my final draft' },
  { value: 'rough-draft', label: 'I have completed a rough draft' },
  { value: 'few-chapters', label: 'I have a few chapters' },
  { value: 'outline', label: 'I have an outline' },
];

// Marketing confidence options
export const MARKETING_CONFIDENCE_OPTIONS = [
  { value: 'completely', label: 'Completely confident' },
  { value: 'fairly', label: 'Fairly confident' },
  { value: 'somewhat', label: 'Somewhat confident' },
  { value: 'slightly', label: 'Slightly confident' },
  { value: 'not', label: 'Not confident' },
];

// Eligibility criteria
export const ELIGIBILITY_CRITERIA = [
  'Must be 18 years or older to enter.',
  'All authors must submit a complete book outline, or a minimum of 2 chapters from the book.',
  'Recipients agree to submit the completed manuscript within one year of receipt of giveaway earnings.',
  'Submitted content must be original, previously unpublished, and cannot be AI generated.',
  'Manuscript content must follow publishing imprint guidelines.',
  'Participants may not apply if they have previously won an Author Services giveaway within one year of application date.',
  'Participants may only submit 1 entry per month. Contestant referrals will result in 1 additional chance to win, a maximum of 5 referrals.',
  'Giveaway promotional items may not be transferred, gifted, or otherwise utilized for a recipient other than the giveaway winner.',
  'Sweep-steaks recipients permit Author Services and affiliated brands to use recipient\'s likeness or image, name, website, and eBook design in future promotional materials.',
  '*All federal, state, and local taxes, fees, and surcharges on any prize won are the sole responsibility of the winner. Winners may be required to provide a valid taxpayer identification number and complete any necessary tax forms before receiving their prize. Sponsor will not be responsible for any tax obligations or related costs incurred as a result of accepting a prize. Winners are encouraged to consult with a tax professional regarding any potential tax liabilities.',
];

// How to enter steps
export const HOW_TO_ENTER_STEPS = [
  'Click the link to fill out a short questionnaire.',
  'Submit your manuscript draft, chapters, or complete outline.',
  'Do a happy dance! You are one step closer to concierge publishing!',
];

// Accepted file types for manuscript upload
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/rtf': ['.rtf'],
  'text/rtf': ['.rtf'],
};

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
