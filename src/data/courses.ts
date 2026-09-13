export type Course = {
  kind: 'course' | 'pathway';
  slug: string;
  icon: string;
  title: string;
  promise: string;
  outcome: string;
  lessons: { path: string; title: string; skill: string }[];
};

export const courses: Course[] = [
  {
    kind: 'course',
    slug: 'ai-confidence',
    icon: '✨',
    title: 'AI Confidence',
    promise: 'Learn to use AI for real tasks without exposing private information or trusting incorrect answers.',
    outcome: 'I can ask AI for useful help, protect private information, and check the result before I use it.',
    lessons: [
      { path: '/learn/basics/what-ai-is/', title: 'Understand AI', skill: 'Know what AI can and cannot do' },
      { path: '/learn/basics/how-to-prompt/', title: 'Ask clearly', skill: 'Write a useful prompt in plain language' },
      { path: '/learn/everyday/write-and-translate/', title: 'Do a real task', skill: 'Draft and translate a safe message' },
      { path: '/learn/basics/voice-images-and-files/', title: 'Share safely', skill: 'Remove private details before uploading' },
      { path: '/learn/basics/check-ai-answers/', title: 'Check the answer', skill: 'Verify important AI claims independently' }
    ]
  },
  {
    kind: 'course',
    slug: 'online-safety-essentials',
    icon: '🛡️',
    title: 'Online Safety Essentials',
    promise: 'Build the habits that protect your accounts, money, phone, and family from common digital threats.',
    outcome: 'I can protect my accounts and money, recognize pressure tactics, and act quickly after a mistake.',
    lessons: [
      { path: '/safety/core-rules/', title: 'Pause and recognize risk', skill: 'Apply the essential safety rules' },
      { path: '/safety/accounts/passwords/', title: 'Protect your accounts', skill: 'Use safer passwords' },
      { path: '/safety/accounts/two-step-verification/', title: 'Add a second lock', skill: 'Turn on two-step verification' },
      { path: '/safety/scams/fake-links-and-apps/', title: 'Spot fake links', skill: 'Check before tapping or installing' },
      { path: '/safety/money/otp-and-upi/', title: 'Protect your money', skill: 'Recognize OTP and UPI tricks' },
      { path: '/safety/devices/updates-backups-and-permissions/', title: 'Secure your phone', skill: 'Manage updates, backups, and permissions' },
      { path: '/help/after-a-mistake/', title: 'Recover calmly', skill: 'Take the right first steps after a mistake' }
    ]
  },
  {
    kind: 'course', slug: 'money-confidence', icon: '₹', title: 'Money Confidence',
    promise: 'Build a practical financial plan and make more informed decisions without chasing promises or exposing private records.',
    outcome: 'I can make a basic money plan, compare options, verify providers, and recognize when I need qualified help.',
    lessons: [
      { path: '/money/foundations/understand-your-money/', title: 'Understand your money', skill: 'See income, essential costs, and irregular expenses clearly' },
      { path: '/money/foundations/simple-budget/', title: 'Make a simple budget', skill: 'Give each part of your income a realistic job' },
      { path: '/money/foundations/emergency-fund/', title: 'Prepare for emergencies', skill: 'Build an accessible reserve gradually' },
      { path: '/money/foundations/understand-loans/', title: 'Understand loans', skill: 'Compare total cost instead of EMI alone' },
      { path: '/money/planning/save-invest-or-repay/', title: 'Choose by purpose', skill: 'Separate saving, investing, and debt repayment' },
      { path: '/money/planning/insurance-basics/', title: 'Understand insurance', skill: 'Check coverage, exclusions, costs, and providers' },
      { path: '/money/planning/retirement-basics/', title: 'Plan for later life', skill: 'Identify retirement needs and uncertainties' },
      { path: '/money/planning/verify-financial-products/', title: 'Verify before committing', skill: 'Check products and providers independently' }
    ]
  },
  {
    kind: 'course', slug: 'financial-fraud-defence', icon: '₹!', title: 'Financial Fraud Defence',
    promise: 'Recognize how financial scams apply pressure, interrupt the transaction, and respond quickly after a loss.',
    outcome: 'I can pause a suspicious transaction, verify it independently, and take the right steps if money is lost.',
    lessons: [
      { path: '/money/fraud/how-financial-fraud-works/', title: 'Recognize the pressure sequence', skill: 'Interrupt urgency, authority, emotion, and secrecy' },
      { path: '/safety/money/otp-and-upi/', title: 'Protect OTPs and UPI', skill: 'Know what must never be shared or approved' },
      { path: '/money/fraud/fake-payments-and-refunds/', title: 'Check payments and refunds', skill: 'Verify money in your own account' },
      { path: '/safety/scams/impersonation-and-digital-arrest/', title: 'Challenge impersonation', skill: 'Verify officials, voices, and videos another way' },
      { path: '/safety/scams/job-investment-and-loan-scams/', title: 'Reject guaranteed outcomes', skill: 'Spot task, investment, job, and loan traps' },
      { path: '/money/fraud/money-mules-and-account-rental/', title: 'Protect your bank identity', skill: 'Refuse account-rental and forwarding requests' },
      { path: '/money/fraud/recovery-scams/', title: 'Avoid a second fraud', skill: 'Recognize fake investigators and recovery agents' },
      { path: '/help/sent-money-or-shared-otp/', title: 'Act after a loss', skill: 'Contact the right institutions and preserve evidence' }
    ]
  }
];

export const pathways: Course[] = [
  {
    kind: 'pathway', slug: 'managing-a-household', icon: '🏠', title: 'Managing a Household',
    promise: 'Use AI for everyday communication and decisions while protecting your family and money.',
    outcome: 'I can use AI for household tasks without exposing private information or trusting unsafe advice.',
    lessons: [
      { path: '/learn/everyday/write-and-translate/', title: 'Write and translate', skill: 'Create clear everyday messages' },
      { path: '/learn/everyday/understand-a-document/', title: 'Understand documents', skill: 'Ask useful questions about difficult wording' },
      { path: '/safety/privacy/what-to-share/', title: 'Protect family information', skill: 'Remove private details before sharing' },
      { path: '/safety/scams/qr-and-payment-scams/', title: 'Check payments', skill: 'Recognize QR and payment tricks' }
    ]
  },
  {
    kind: 'pathway', slug: 'family-caregiving', icon: '♡', title: 'Caring for Family',
    promise: 'Use digital tools to support family members without taking unsafe medical or privacy risks.',
    outcome: 'I can find useful help for my family while checking health claims and protecting their privacy.',
    lessons: [
      { path: '/learn/health/medical-information/', title: 'Understand health information', skill: 'Use AI for questions, not diagnosis' },
      { path: '/safety/privacy/children/', title: 'Protect children’s privacy', skill: 'Share less about children online' },
      { path: '/safety/scams/fake-calls-and-messages/', title: 'Recognize impersonation', skill: 'Verify urgent calls independently' },
      { path: '/help/after-a-mistake/', title: 'Respond calmly', skill: 'Take the right first steps after a mistake' }
    ]
  },
  {
    kind: 'pathway', slug: 'older-adults', icon: '☀', title: 'Safer Digital Life for Older Adults',
    promise: 'Build confidence with calls, payments, health information, and account protection.',
    outcome: 'I can pause, verify unexpected requests, and protect my accounts, money, and health decisions.',
    lessons: [
      { path: '/safety/scams/fake-calls-and-messages/', title: 'Handle suspicious calls', skill: 'Recognize urgency and impersonation' },
      { path: '/safety/money/otp-and-upi/', title: 'Protect payments', skill: 'Keep OTPs and PINs secret' },
      { path: '/learn/health/medical-information/', title: 'Check medical claims', skill: 'Verify before acting on health information' },
      { path: '/safety/accounts/two-step-verification/', title: 'Add account protection', skill: 'Use a second security step' }
    ]
  },
  {
    kind: 'pathway', slug: 'skilled-trades', icon: '🔧', title: 'AI for Skilled Trades',
    promise: 'Use AI for quotations and customer communication while keeping details and payments safe.',
    outcome: 'I can use AI to communicate professionally without exposing customer data or losing money.',
    lessons: [
      { path: '/learn/basics/how-to-prompt/', title: 'Give AI a clear job', skill: 'Ask for a useful, bounded draft' },
      { path: '/learn/everyday/write-and-translate/', title: 'Message customers', skill: 'Write and translate clearly' },
      { path: '/safety/privacy/what-to-share/', title: 'Protect customer details', skill: 'Remove identifying information' },
      { path: '/safety/scams/qr-and-payment-scams/', title: 'Verify payment', skill: 'Check money in your own app' }
    ]
  },
  {
    kind: 'pathway', slug: 'healthcare', icon: '⚕', title: 'Responsible AI in Healthcare',
    promise: 'Use AI for general communication while protecting patients and preserving clinical judgment.',
    outcome: 'I can use AI for low-risk communication while keeping patient data and clinical decisions out of public tools.',
    lessons: [
      { path: '/learn/basics/voice-images-and-files/', title: 'Understand upload risk', skill: 'Recognize what files can reveal' },
      { path: '/safety/privacy/workplace-ai/', title: 'Protect restricted information', skill: 'Keep sensitive work data private' },
      { path: '/learn/health/medical-information/', title: 'Respect AI’s limits', skill: 'Keep clinical decisions with professionals' },
      { path: '/learn/basics/check-ai-answers/', title: 'Verify every important claim', skill: 'Check authoritative sources independently' }
    ]
  },
  {
    kind: 'pathway', slug: 'small-business', icon: '▦', title: 'AI for Small Business',
    promise: 'Communicate and draft faster while protecting customers, contracts, and payments.',
    outcome: 'I can use AI for business drafts while checking claims and protecting customer and payment information.',
    lessons: [
      { path: '/learn/work/contracts-and-marketing/', title: 'Draft responsibly', skill: 'Separate safe drafts from final decisions' },
      { path: '/safety/privacy/customer-data/', title: 'Protect customer data', skill: 'Use fictional or anonymized examples' },
      { path: '/safety/scams/qr-and-payment-scams/', title: 'Confirm payments', skill: 'Verify money in the receiving account' },
      { path: '/safety/scams/fake-links-and-apps/', title: 'Avoid fake support', skill: 'Use official channels and apps' }
    ]
  },
  {
    kind: 'pathway', slug: 'office-work', icon: '▣', title: 'AI at Office Work',
    promise: 'Use AI productively without leaking company, colleague, or customer information.',
    outcome: 'I can choose safe AI tasks at work and know when company approval is required.',
    lessons: [
      { path: '/learn/basics/how-to-prompt/', title: 'Prompt with boundaries', skill: 'Request a draft without private context' },
      { path: '/safety/privacy/workplace-ai/', title: 'Know what not to paste', skill: 'Classify workplace information by risk' },
      { path: '/learn/basics/check-ai-answers/', title: 'Check the work', skill: 'Verify facts before sharing a draft' },
      { path: '/safety/accounts/two-step-verification/', title: 'Protect work accounts', skill: 'Add a second login check' }
    ]
  },
  {
    kind: 'pathway', slug: 'gig-and-delivery-work', icon: '⌖', title: 'Safer Gig and Delivery Work',
    promise: 'Communicate clearly while protecting customer, location, account, and payment information.',
    outcome: 'I can use AI for safe communication and recognize fake onboarding, support, and payment requests.',
    lessons: [
      { path: '/learn/everyday/write-and-translate/', title: 'Communicate clearly', skill: 'Write without exposing order details' },
      { path: '/safety/scams/fake-links-and-apps/', title: 'Check support links', skill: 'Open official worker apps yourself' },
      { path: '/safety/scams/job-investment-and-loan-scams/', title: 'Avoid task scams', skill: 'Recognize fees and fake earnings' },
      { path: '/safety/scams/qr-and-payment-scams/', title: 'Protect payments', skill: 'Read every payment approval screen' }
    ]
  },
  {
    kind: 'pathway', slug: 'students', icon: '◎', title: 'Learn with AI as a Student',
    promise: 'Use AI to understand and practise without copying, inventing sources, or losing your own voice.',
    outcome: 'I can learn with AI, verify facts, and submit work that I understand and can explain.',
    lessons: [
      { path: '/learn/basics/what-ai-is/', title: 'Know the tool', skill: 'Understand why AI can be wrong' },
      { path: '/learn/learning/homework-help/', title: 'Use AI to learn', skill: 'Ask for explanations instead of answers' },
      { path: '/learn/learning/checking-facts-and-citations/', title: 'Check facts and sources', skill: 'Verify citations and avoid plagiarism' },
      { path: '/safety/privacy/what-to-share/', title: 'Protect your information', skill: 'Keep identity and school data private' }
    ]
  },
  {
    kind: 'pathway', slug: 'teachers', icon: '✎', title: 'Responsible AI for Teachers',
    promise: 'Create useful teaching drafts without exposing students or outsourcing professional judgment.',
    outcome: 'I can use AI for general teaching material while protecting students and checking accuracy.',
    lessons: [
      { path: '/learn/basics/how-to-prompt/', title: 'Design a clear request', skill: 'Set audience, level, and boundaries' },
      { path: '/learn/basics/check-ai-answers/', title: 'Check teaching material', skill: 'Verify facts before classroom use' },
      { path: '/safety/privacy/children/', title: 'Protect students', skill: 'Keep identifying student data private' },
      { path: '/learn/basics/voice-images-and-files/', title: 'Handle uploads safely', skill: 'Use fictional or approved examples' }
    ]
  },
  {
    kind: 'pathway', slug: 'job-seekers', icon: '↗', title: 'AI for Job Seekers',
    promise: 'Prepare stronger applications and interviews without inventing experience or falling for fake jobs.',
    outcome: 'I can use AI to present my real experience clearly and independently verify an employer.',
    lessons: [
      { path: '/learn/basics/how-to-prompt/', title: 'Ask for focused help', skill: 'Improve a draft without inventing facts' },
      { path: '/learn/everyday/understand-a-document/', title: 'Understand job documents', skill: 'Identify questions before agreeing' },
      { path: '/safety/scams/job-investment-and-loan-scams/', title: 'Recognize fake jobs', skill: 'Avoid fees and task scams' },
      { path: '/safety/accounts/recovery/', title: 'Protect your accounts', skill: 'Secure email and recovery details' }
    ]
  },
  {
    kind: 'pathway', slug: 'software-developers', icon: '</>', title: 'Responsible AI for Developers',
    promise: 'Use AI to develop faster while protecting code, systems, users, and the software supply chain.',
    outcome: 'I can use AI for development while independently reviewing security, correctness, dependencies, and licensing.',
    lessons: [
      { path: '/work/technology/safe-ai-coding/', title: 'Set safe coding boundaries', skill: 'Keep secrets and proprietary context out of prompts' },
      { path: '/work/technology/review-ai-code/', title: 'Review generated code', skill: 'Check correctness, security, operations, and maintenance' },
      { path: '/work/technology/packages-apis-and-licenses/', title: 'Verify dependencies', skill: 'Confirm packages, APIs, versions, and licenses' },
      { path: '/work/technology/prompt-injection/', title: 'Design AI features defensively', skill: 'Keep untrusted content away from privileged actions' }
    ]
  },
  {
    kind: 'pathway', slug: 'qa-testers', icon: '✓', title: 'AI for QA and Testers',
    promise: 'Use AI to broaden test thinking without exposing production data or mistaking volume for coverage.',
    outcome: 'I can use AI to generate test ideas and synthetic data while independently validating coverage and user impact.',
    lessons: [
      { path: '/work/technology/generate-test-ideas/', title: 'Generate risk-based ideas', skill: 'Explore boundaries, failures, roles, and abuse cases' },
      { path: '/work/technology/synthetic-test-data/', title: 'Protect real data', skill: 'Create purposeful synthetic fixtures' },
      { path: '/work/technology/validate-test-coverage/', title: 'Challenge the tests', skill: 'Prove assertions can detect meaningful defects' },
      { path: '/work/technology/accessibility-mobile-testing/', title: 'Test real user conditions', skill: 'Include accessibility, devices, networks, and languages' }
    ]
  }
];

export function getCourse(slug: string) {
  return [...courses, ...pathways].find((course) => course.slug === slug);
}

export function findLessons(pathname: string) {
  const route = pathname.replace(/^\/(hi|or|ta|te|kn|bn)/, '/');
  const matches = [];
  for (const course of [...courses, ...pathways]) {
    const index = course.lessons.findIndex((lesson) => lesson.path === route);
    if (index >= 0) matches.push({ course, index, lesson: course.lessons[index] });
  }
  return matches;
}
