import type { Locale } from '../i18n/locales';

type Item = { icon: string; title: string; description: string; href: string; image?: string };
type Group = { title: string; items: Item[] };

const english: Record<string, { title: string; intro: string; groups: Group[] }> = {
  learn: { title: 'Use AI', intro: 'Learn what AI can do, how to ask useful questions, and when to check its work.', groups: [
    { title: 'Getting started', items: [
      { icon: '✦', title: 'Start with AI', description: 'Understand the basics and use AI safely.', href: '/learn/getting-started/' },
      { icon: '?', title: 'What AI is—and is not', description: 'Build a simple, realistic mental model.', href: '/learn/basics/what-ai-is/' },
      { icon: '✎', title: 'Ask a useful question', description: 'Use a simple prompt formula without jargon.', href: '/learn/basics/how-to-prompt/' },
      { icon: '✓', title: 'Check AI answers', description: 'AI can sound certain and still be wrong.', href: '/learn/basics/check-ai-answers/' },
      { icon: '◉', title: 'Voice, images, and files', description: 'Know what an upload can reveal.', href: '/learn/basics/voice-images-and-files/' }
    ]},
    { title: 'Work and communication', items: [
      { icon: 'Aa', title: 'Write and translate', description: 'Create clear messages while preserving meaning.', href: '/learn/everyday/write-and-translate/' },
      { icon: '▤', title: 'Understand a document', description: 'Explain difficult wording without exposing the document.', href: '/learn/everyday/understand-a-document/' },
      { icon: '✎', title: 'Contracts and marketing', description: 'Draft useful text without exposing private details.', href: '/learn/work/contracts-and-marketing/' },
      { icon: '▣', title: 'Homework and learning', description: 'Use AI to learn without copying.', href: '/learn/learning/homework-help/' },
      { icon: '⚕', title: 'Health information', description: 'Use AI for understanding, never diagnosis.', href: '/learn/health/medical-information/' }
    ]}
  ]},
  safety: { title: 'Stay safe online', intro: 'Protect your accounts, money, information, and devices.', groups: [
    { title: 'Protect what matters', items: [
      { icon: '●', title: 'Accounts and passwords', description: 'Keep accounts secure and recoverable.', href: '/safety/accounts/passwords/' },
      { icon: '₹', title: 'Money, OTP and UPI', description: 'Recognize payment tricks before money leaves.', href: '/safety/money/otp-and-upi/' },
      { icon: '◈', title: 'Personal information', description: 'Know what should never be shared.', href: '/safety/privacy/what-to-share/' }
    ]},
    { title: 'Recognize danger', items: [
      { icon: '⌁', title: 'Fake links and apps', description: 'Check before you tap or install.', href: '/safety/scams/fake-links-and-apps/' },
      { icon: '☎', title: 'Fake calls and messages', description: 'Spot impersonation and urgency scams.', href: '/safety/scams/fake-calls-and-messages/' },
      { icon: '▦', title: 'QR and payment scams', description: 'Understand what you are approving before entering a PIN.', href: '/safety/scams/qr-and-payment-scams/' },
      { icon: '⌘', title: 'Remote-access scams', description: 'Never hand control of your screen to an unexpected caller.', href: '/safety/scams/remote-access-and-support/' },
      { icon: '₹', title: 'Job, investment, and loan scams', description: 'Recognize fees, guaranteed returns, and task traps.', href: '/safety/scams/job-investment-and-loan-scams/' },
      { icon: '◉', title: 'Impersonation and digital arrest', description: 'Verify voices, videos, officials, and urgent family calls.', href: '/safety/scams/impersonation-and-digital-arrest/' },
      { icon: '▤', title: 'Deepfakes and misinformation', description: 'Question convincing images and claims.', href: '/safety/scams/deepfakes/' },
      { icon: '▯', title: 'Phones and apps', description: 'Control apps, permissions, updates, and access.', href: '/safety/devices/apps-on-phone/' }
    ]},
    { title: 'Recover and prepare', items: [
      { icon: '2×', title: 'Two-step verification', description: 'Add a second lock to important accounts.', href: '/safety/accounts/two-step-verification/' },
      { icon: '↺', title: 'Account recovery', description: 'Prepare recovery details before you need them.', href: '/safety/accounts/recovery/' },
      { icon: '▯', title: 'Lost or stolen phone', description: 'Lock the device, SIM, and important accounts.', href: '/safety/devices/lost-or-stolen-phone/' },
      { icon: '↓', title: 'Updates, backups, and permissions', description: 'Three habits that prevent many emergencies.', href: '/safety/devices/updates-backups-and-permissions/' }
    ]}
  ]},
  guides: { title: 'Apply it to my life', intro: 'Choose where you want to use these skills. Each path has a clear sequence and finish line.', groups: [
    { title: 'At home', items: [
      { icon: '⌂', title: 'Managing a household', description: 'Communication, documents, family privacy, and payments.', href: '/pathways/managing-a-household/' },
      { icon: '♡', title: 'Caring for family', description: 'Health information, children’s privacy, and urgent requests.', href: '/pathways/family-caregiving/' },
      { icon: '☀', title: 'Older adults', description: 'Calls, payments, medical claims, and account protection.', href: '/pathways/older-adults/' }
    ]},
    { title: 'At work', items: [
      { icon: '🔧', title: 'Skilled trades', description: 'Quotations, customer messages, privacy, and payments.', href: '/pathways/skilled-trades/', image: '/images/stock/trades.jpg' },
      { icon: '⚕', title: 'Healthcare', description: 'Low-risk communication with strict patient-data boundaries.', href: '/pathways/healthcare/', image: '/images/stock/healthcare.jpg' },
      { icon: '▦', title: 'Small business', description: 'Customers, marketing, contracts, and payments.', href: '/pathways/small-business/' },
      { icon: '▣', title: 'Office work', description: 'Productive AI use without leaking company information.', href: '/pathways/office-work/' },
      { icon: '⌖', title: 'Gig and delivery work', description: 'Customer, location, account, and payment safety.', href: '/pathways/gig-and-delivery-work/' }
    ]},
    { title: 'Learning and career', items: [
      { icon: '◎', title: 'Students', description: 'Learn, check facts, and avoid plagiarism.', href: '/pathways/students/' },
      { icon: '✎', title: 'Teachers', description: 'Create useful material while protecting students.', href: '/pathways/teachers/' },
      { icon: '↗', title: 'Job seekers', description: 'Applications, interviews, and fake-job protection.', href: '/pathways/job-seekers/' }
    ]},
    { title: 'Software and technology', items: [
      { icon: '</>', title: 'Software developers', description: 'Code review, secrets, dependencies, licensing, and prompt injection.', href: '/pathways/software-developers/' },
      { icon: '✓', title: 'QA and testers', description: 'Test ideas, synthetic data, coverage, accessibility, and mobile testing.', href: '/pathways/qa-testers/' }
    ]}
  ]},
  help: { title: 'Get help now', intro: 'A mistake is not the end. Act quickly, one step at a time.', groups: [
    { title: 'Something went wrong', items: [
      { icon: '!', title: 'What to do first', description: 'Immediate steps after sharing information, losing money, or losing access.', href: '/help/after-a-mistake/' },
      { icon: '₹', title: 'I sent money or shared an OTP', description: 'Contact your bank and report financial cybercrime quickly.', href: '/help/sent-money-or-shared-otp/' },
      { icon: '●', title: 'My account may be hacked', description: 'Secure recovery details, sessions, and passwords.', href: '/help/hacked-account/' },
      { icon: '▯', title: 'My phone was lost or stolen', description: 'Lock the phone, SIM, and important accounts.', href: '/safety/devices/lost-or-stolen-phone/' },
      { icon: '⌘', title: 'I installed a suspicious app', description: 'Disconnect it and protect important accounts.', href: '/help/suspicious-app/' },
      { icon: '♡', title: 'I am being threatened or impersonated', description: 'Preserve evidence and get trusted help.', href: '/help/blackmail-or-fake-image/' }
    ]}
  ]}
};

const sectionNames: Record<Locale, Record<string, [string, string]>> = {
  en: {},
  hi: { learn: ['AI का उपयोग करें', 'AI क्या कर सकता है, अच्छे सवाल कैसे पूछें और जवाब कब जाँचें।'], safety: ['ऑनलाइन सुरक्षित रहें', 'अपने खाते, पैसे, जानकारी और फ़ोन को सुरक्षित रखें।'], guides: ['आपके लिए गाइड', 'अपने काम या जिम्मेदारी के अनुसार रास्ता चुनें।'], help: ['अभी मदद पाएँ', 'गलती के बाद जल्दी और सही कदम उठाएँ।'] },
  or: { learn: ['AI ବ୍ୟବହାର କରନ୍ତୁ', 'AI କ’ଣ କରିପାରେ ଓ ଉତ୍ତର କେବେ ଯାଞ୍ଚ କରିବେ ଶିଖନ୍ତୁ।'], safety: ['ଅନଲାଇନ୍‌ରେ ସୁରକ୍ଷିତ ରୁହନ୍ତୁ', 'ଆକାଉଣ୍ଟ, ଟଙ୍କା, ସୂଚନା ଓ ଡିଭାଇସ୍ ସୁରକ୍ଷିତ ରଖନ୍ତୁ।'], guides: ['ଆପଣଙ୍କ ପାଇଁ ଗାଇଡ୍', 'କାମ ଓ ଦାୟିତ୍ୱ ଅନୁସାରେ ପଥ ବାଛନ୍ତୁ।'], help: ['ଏବେ ସାହାଯ୍ୟ ପାଆନ୍ତୁ', 'ଭୁଲ ପରେ ଶୀଘ୍ର ସଠିକ୍ ପଦକ୍ଷେପ ନିଅନ୍ତୁ।'] },
  ta: { learn: ['AI பயன்படுத்துங்கள்', 'AI என்ன செய்யும், பதிலை எப்போது சரிபார்க்க வேண்டும் என்பதை அறிக.'], safety: ['இணையத்தில் பாதுகாப்பு', 'கணக்குகள், பணம், தகவல் மற்றும் சாதனங்களைப் பாதுகாக்கவும்.'], guides: ['உங்களுக்கான வழிகாட்டிகள்', 'உங்கள் வேலை அல்லது பொறுப்புக்கு ஏற்ற பாதையைத் தேர்ந்தெடுக்கவும்.'], help: ['இப்போது உதவி பெறுங்கள்', 'தவறுக்குப் பிறகு விரைவாகச் சரியான நடவடிக்கை எடுங்கள்.'] },
  te: { learn: ['AI ఉపయోగించండి', 'AI ఏమి చేయగలదో, సమాధానాన్ని ఎప్పుడు తనిఖీ చేయాలో తెలుసుకోండి.'], safety: ['ఆన్‌లైన్‌లో సురక్షితంగా ఉండండి', 'ఖాతాలు, డబ్బు, సమాచారం మరియు పరికరాలను కాపాడుకోండి.'], guides: ['మీ కోసం మార్గదర్శకాలు', 'మీ పని లేదా బాధ్యతకు సరిపోయే మార్గాన్ని ఎంచుకోండి.'], help: ['ఇప్పుడే సహాయం పొందండి', 'తప్పు తర్వాత త్వరగా సరైన చర్య తీసుకోండి.'] },
  kn: { learn: ['AI ಬಳಸಿ', 'AI ಏನು ಮಾಡಬಹುದು ಮತ್ತು ಉತ್ತರವನ್ನು ಯಾವಾಗ ಪರಿಶೀಲಿಸಬೇಕು ಎಂಬುದನ್ನು ಕಲಿಯಿರಿ.'], safety: ['ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿರಿ', 'ಖಾತೆ, ಹಣ, ಮಾಹಿತಿ ಮತ್ತು ಸಾಧನಗಳನ್ನು ರಕ್ಷಿಸಿ.'], guides: ['ನಿಮಗಾಗಿ ಮಾರ್ಗದರ್ಶಿಗಳು', 'ನಿಮ್ಮ ಕೆಲಸ ಅಥವಾ ಜವಾಬ್ದಾರಿಗೆ ತಕ್ಕ ಮಾರ್ಗವನ್ನು ಆರಿಸಿ.'], help: ['ಈಗ ಸಹಾಯ ಪಡೆಯಿರಿ', 'ತಪ್ಪಿನ ನಂತರ ತ್ವರಿತವಾಗಿ ಸರಿಯಾದ ಕ್ರಮ ಕೈಗೊಳ್ಳಿ.'] },
  bn: { learn: ['AI ব্যবহার করুন', 'AI কী করতে পারে এবং কখন উত্তর যাচাই করবেন তা শিখুন।'], safety: ['অনলাইনে নিরাপদ থাকুন', 'অ্যাকাউন্ট, টাকা, তথ্য ও ডিভাইস সুরক্ষিত রাখুন।'], guides: ['আপনার জন্য নির্দেশিকা', 'কাজ বা দায়িত্ব অনুযায়ী পথ বেছে নিন।'], help: ['এখনই সাহায্য নিন', 'ভুলের পরে দ্রুত সঠিক পদক্ষেপ নিন।'] }
};

export function getSection(section: string, locale: Locale) {
  const base = english[section];
  if (!base) return undefined;
  const translated = sectionNames[locale][section];
  return translated ? { ...base, title: translated[0], intro: translated[1] } : base;
}
