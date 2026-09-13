import type { Locale } from '../i18n/locales';

type Item = { icon: string; title: string; description: string; href: string; image?: string };
type Group = { title: string; items: Item[] };

const english: Record<string, { title: string; intro: string; groups: Group[] }> = {
  learn: { title: 'Use AI', intro: 'AI writes fluent answers. That is not the same as knowing. These pages show what it is, how to ask, and when to check.', groups: [
    { title: 'Getting started', items: [
      { icon: '✦', title: 'Start here', description: 'Six things you can do today, even if nobody taught you this.', href: '/learn/getting-started/' },
      { icon: '?', title: 'What AI is — and is not', description: 'A fluent answer can still be invented. Here is why.', href: '/learn/basics/what-ai-is/' },
      { icon: '✎', title: 'Ask a useful question', description: 'Say the job, the audience, and what it must not invent.', href: '/learn/basics/how-to-prompt/' },
      { icon: '✓', title: 'Check AI answers', description: '“Are you sure?” is not a check. This is.', href: '/learn/basics/check-ai-answers/' },
      { icon: '◉', title: 'Voice, images, and files', description: 'An upload is a copy leaving your phone.', href: '/learn/basics/voice-images-and-files/' }
    ]},
    { title: 'Work and communication', items: [
      { icon: 'Aa', title: 'Write and translate', description: 'Turn notes into a message — then read it before you send.', href: '/learn/everyday/write-and-translate/' },
      { icon: '▤', title: 'Understand a document', description: 'Explain one clause without uploading the whole contract.', href: '/learn/everyday/understand-a-document/' },
      { icon: '✎', title: 'Contracts and marketing', description: 'Draft the words. A human still checks the claims.', href: '/learn/work/contracts-and-marketing/' },
      { icon: '▣', title: 'Homework and learning', description: 'Ask it to explain, not to write the assignment.', href: '/learn/learning/homework-help/' },
      { icon: '⚕', title: 'Health information', description: 'Useful for background. Never for a dose or a diagnosis.', href: '/learn/health/medical-information/' }
    ]}
  ]},
  safety: { title: 'Stay safe online', intro: 'Your phone holds your money, your photos, and the codes that prove it is you. These pages show how to keep them.', groups: [
    { title: 'Protect what matters', items: [
      { icon: '●', title: 'Accounts and passwords', description: 'Email is the master key. Start there.', href: '/safety/accounts/passwords/' },
      { icon: '₹', title: 'Money, OTP and UPI', description: 'An OTP is a key, not a conversation. Receiving money does not need your PIN.', href: '/safety/money/otp-and-upi/' },
      { icon: '◈', title: 'Personal information', description: 'A delivery needs an address. It does not need your Aadhaar photo.', href: '/safety/privacy/what-to-share/' }
    ]},
    { title: 'Recognize danger', items: [
      { icon: '⌁', title: 'Fake links and apps', description: 'A logo and a padlock can sit on a fake page too.', href: '/safety/scams/fake-links-and-apps/' },
      { icon: '☎', title: 'Fake calls and messages', description: 'Hang up. Call back on a number you already have.', href: '/safety/scams/fake-calls-and-messages/' },
      { icon: '▦', title: 'QR and payment scams', description: 'Scanning is often sending, not receiving.', href: '/safety/scams/qr-and-payment-scams/' },
      { icon: '⌘', title: 'Remote-access scams', description: 'An unexpected caller does not get to see your screen.', href: '/safety/scams/remote-access-and-support/' },
      { icon: '₹', title: 'Job, investment, and loan scams', description: 'A small first payment is often bait, not a job.', href: '/safety/scams/job-investment-and-loan-scams/' },
      { icon: '◉', title: 'Impersonation and digital arrest', description: 'A uniform on a video call is not the police.', href: '/safety/scams/impersonation-and-digital-arrest/' },
      { icon: '▤', title: 'Deepfakes and misinformation', description: 'A convincing picture can still be invented.', href: '/safety/scams/deepfakes/' },
      { icon: '▯', title: 'Phones and apps', description: 'Install from the store you open yourself, not from a chat.', href: '/safety/devices/apps-on-phone/' }
    ]},
    { title: 'Recover and prepare', items: [
      { icon: '2×', title: 'Two-step verification', description: 'A second lock after the password, on this phone.', href: '/safety/accounts/two-step-verification/' },
      { icon: '↺', title: 'Account recovery', description: 'The backup email is also a key. Treat it like one.', href: '/safety/accounts/recovery/' },
      { icon: '▯', title: 'Lost or stolen phone', description: 'Lock it, block the SIM, then change email.', href: '/safety/devices/lost-or-stolen-phone/' },
      { icon: '↓', title: 'Updates, backups, and permissions', description: 'Repair holes, copy photos, and say no to a torch that wants contacts.', href: '/safety/devices/updates-backups-and-permissions/' }
    ]}
  ]},
  guides: { title: 'Apply it to my life', intro: 'Same skills, different days. Pick the life you are already in — home, work, study, or a trade.', groups: [
    { title: 'At home', items: [
      { icon: '⌂', title: 'Managing a household', description: 'School messages, bills, family photos, and the QR at the door.', href: '/pathways/managing-a-household/' },
      { icon: '♡', title: 'Caring for family', description: 'Health forwards, children’s privacy, and calls that cannot wait.', href: '/pathways/family-caregiving/' },
      { icon: '☀', title: 'Older adults', description: 'The bank call, the UPI PIN, the WhatsApp “doctor”.', href: '/pathways/older-adults/' }
    ]},
    { title: 'At work', items: [
      { icon: '🔧', title: 'Skilled trades', description: 'Write a quotation. Keep the customer’s address off the chat.', href: '/pathways/skilled-trades/', image: '/images/stock/trades.jpg' },
      { icon: '⚕', title: 'Healthcare', description: 'Draft general words. Patient names never leave the approved system.', href: '/pathways/healthcare/', image: '/images/stock/healthcare.jpg' },
      { icon: '▦', title: 'Small business', description: 'Customers, marketing, contracts — without pasting the real list.', href: '/pathways/small-business/' },
      { icon: '▣', title: 'Office work', description: 'Use AI at work without pasting the company into a personal chat.', href: '/pathways/office-work/' },
      { icon: '⌖', title: 'Gig and delivery work', description: 'Fake onboarding fees, fake support links, and the PIN at the door.', href: '/pathways/gig-and-delivery-work/' }
    ]},
    { title: 'Learning and career', items: [
      { icon: '◎', title: 'Students', description: 'Let it explain. You still write. You still check the textbook.', href: '/pathways/students/' },
      { icon: '✎', title: 'Teachers', description: 'Draft activities. Leave real students out of the prompt.', href: '/pathways/teachers/' },
      { icon: '↗', title: 'Job seekers', description: 'Sharpen a real CV. Do not pay to “unlock” an interview.', href: '/pathways/job-seekers/' }
    ]},
    { title: 'Software and technology', items: [
      { icon: '</>', title: 'Software developers', description: 'Read the generated code. Check the package. Keep secrets out of the prompt.', href: '/pathways/software-developers/' },
      { icon: '✓', title: 'QA and testers', description: 'More tests are not coverage. Invent data. Include real devices and access.', href: '/pathways/qa-testers/' }
    ]}
  ]},
  help: { title: 'Get help now', intro: 'A mistake is not the end of you. Hang up on the scammer, then take one official step at a time.', groups: [
    { title: 'Something went wrong', items: [
      { icon: '!', title: 'What to do first', description: 'Money left, a code shared, an account taken — start here.', href: '/help/after-a-mistake/' },
      { icon: '₹', title: 'I sent money or shared an OTP', description: 'Call the number on the card. Then 1930. Do not pay to “reverse” it.', href: '/help/sent-money-or-shared-otp/' },
      { icon: '●', title: 'My account may be hacked', description: 'Change the password, kick other devices out, check the backup email.', href: '/help/hacked-account/' },
      { icon: '▯', title: 'My phone was lost or stolen', description: 'Lock it from another device, block the SIM, tell the bank.', href: '/safety/devices/lost-or-stolen-phone/' },
      { icon: '⌘', title: 'I installed a suspicious app', description: 'Airplane mode. Uninstall. Do not open the bank on that phone yet.', href: '/help/suspicious-app/' },
      { icon: '♡', title: 'I am being threatened or impersonated', description: 'Do not pay. Save evidence. Tell someone you trust.', href: '/help/blackmail-or-fake-image/' }
    ]}
  ]}
};

const sectionNames: Record<Locale, Record<string, [string, string]>> = {
  en: {},
  hi: { learn: ['AI से काम लें', 'AI धाराप्रवाह लिखता है। जानना अलग बात है। ये पन्ने बताते हैं यह है क्या, कैसे पूछें, कब जाँचें।'], safety: ['ऑनलाइन सुरक्षित रहें', 'फ़ोन में पैसे, फ़ोटो, और वे कोड हैं जो साबित करते हैं कि आप आप हैं। ये पन्ने उन्हें बचाना सिखाते हैं।'], guides: ['ज़िंदगी में लगाएँ', 'वही बात, अलग दिन। घर, काम, पढ़ाई या अपना धंधा — जो ज़िंदगी चल रही है, वह चुनें।'], help: ['अभी मदद लें', 'गलती आख़िरी बात नहीं। ठग से फ़ोन काटें, फिर एक आधिकारिक कदम।'] },
  or: { learn: ['AIରେ କାମ ଧରନ୍ତୁ', 'AI ଧାରାପ୍ରବାହରେ ଲେଖେ। ଜାଣିବା ଅଲଗା କଥା। ଏହା କ’ଣ, କିପରି ପଚାରିବେ, କେବେ ଯାଞ୍ଚ କରିବେ।'], safety: ['ଅନଲାଇନ୍‌ରେ ସୁରକ୍ଷିତ ରୁହନ୍ତୁ', 'ଫୋନ୍‌ରେ ଟଙ୍କା, ଫଟୋ, ଆଉ ସେହି କୋଡ୍ ଅଛି ଯାହା ପ୍ରମାଣ କରେ ଆପଣ ଆପଣ।'], guides: ['ଜୀବନରେ ଲଗାନ୍ତୁ', 'ସେହି କଥା, ଅଲଗା ଦିନ। ଘର, କାମ, ପଢ଼ା କିମ୍ବା ଧନ୍ଦା — ଚାଲୁଥିବା ଜୀବନ ବାଛନ୍ତୁ।'], help: ['ଏବେ ସାହାଯ୍ୟ ନିଅନ୍ତୁ', 'ଭୁଲ ଶେଷ କଥା ନୁହେଁ। ଠକର ଫୋନ୍ କାଟନ୍ତୁ, ତା’ପରେ ଗୋଟିଏ ସରକାରୀ ପଦକ୍ଷେପ।'] },
  ta: { learn: ['AI பயன்படுத்துங்கள்', 'AI சரளமாக எழுதும். அதனால் அது உண்மை என்று ஆகாது. இது என்ன, எப்படிக் கேட்பது, எப்போது சரிபார்ப்பது.'], safety: ['இணையத்தில் பாதுகாப்பு', 'போனில் பணம் இருக்கிறது, புகைப்படம் இருக்கிறது, நீங்கள்தான் நீங்கள் என்று காட்டும் கோடுகளும் இருக்கின்றன.'], guides: ['வாழ்க்கையில் பயன்படுத்துங்கள்', 'அதே பாடம், வேறு நாள். வீடு, வேலை, படிப்பு அல்லது உங்கள் தொழில் — நடக்கும் வாழ்க்கையைத் தேர்ந்தெடுங்கள்.'], help: ['இப்போது உதவி', 'தவறு முடிவல்ல. மோசடிக்காரர் போனில் இருக்கும்போதே வைத்துவிடுங்கள். பிறகு வங்கி எண்ல பேசுங்கள்.'] },
  te: { learn: ['AIతో పని చేయండి', 'AI నునుపుగా రాస్తుంది. అంటే నిజమని కాదు. ఇది ఏమిటి, ఎలా అడగాలి, ఎప్పుడు సరిచూడాలి.'], safety: ['ఆన్‌లైన్‌లో సురక్షితంగా ఉండండి', 'ఫోన్‌లో డబ్బు ఉంది, ఫోటోలున్నాయి, మీరు మీరే అని చెప్పే కోడ్‌లున్నాయి.'], guides: ['జీవితంలో వాడండి', 'అదే పాఠం, వేరే రోజు. ఇల్లు, పని, చదువు లేదా మీ వృత్తి — నడుస్తున్న జీవితాన్ని ఎంచుకోండి.'], help: ['ఇప్పుడే సహాయం', 'పొరపాటు అంతం కాదు. మోసగాడి కాల్ కట్ చేయండి. తర్వాత బ్యాంకు నంబర్‌కు మాట్లాడండి.'] },
  kn: { learn: ['AI ಬಳಸಿ', 'AI ಚೆನ್ನಾಗಿ ಬರೆಯುತ್ತದೆ. ಅದು ನಿಜವೆಂದು ಅರ್ಥವಲ್ಲ. ಇದು ಏನು, ಹೇಗೆ ಕೇಳುವುದು, ಯಾವಾಗ ಪರಿಶೀಲಿಸುವುದು.'], safety: ['ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿರಿ', 'ಫೋನ್‌ನಲ್ಲಿ ಹಣವಿದೆ, ಫೋಟೋಗಳಿವೆ, ನೀವು ನೀವೇ ಎಂದು ತೋರಿಸುವ ಕೋಡ್‌ಗಳಿವೆ.'], guides: ['ಜೀವನದಲ್ಲಿ ಬಳಸಿ', 'ಅದೇ ಪಾಠ, ಬೇರೆ ದಿನ. ಮನೆ, ಕೆಲಸ, ಓದು ಅಥವಾ ನಿಮ್ಮ ಕಸುಬು — ನಡೆಯುತ್ತಿರುವ ಜೀವನವನ್ನು ಆರಿಸಿ.'], help: ['ಈಗ ಸಹಾಯ', 'ತಪ್ಪು ಅಂತ್ಯವಲ್ಲ. ವಂಚಕನ ಕರೆ ಕಡಿಯಿರಿ. ನಂತರ ಬ್ಯಾಂಕಿನ ನಂಬರ್‌ಗೆ ಮಾತನಾಡಿ.'] },
  bn: { learn: ['AI দিয়ে কাজ করুন', 'AI সাবলীল লেখে। জানা আলাদা কথা। এটা কী, কীভাবে জিজ্ঞেস করবেন, কখন যাচাই করবেন।'], safety: ['অনলাইনে নিরাপদ থাকুন', 'ফোনে টাকা, ছবি, আর সেই কোড যা প্রমাণ করে আপনি আপনি।'], guides: ['জীবনে লাগান', 'সেই কথা, অন্য দিন। ঘর, কাজ, পড়াশোনা বা আপনার কাজ — যে জীবন চলছে, সেটা বেছে নিন।'], help: ['এখনই সাহায্য', 'ভুল শেষ কথা নয়। প্রতারকের ফোন কেটে দিন। তারপর একটি সরকারি পদক্ষেপ।'] }
};

export function getSection(section: string, locale: Locale) {
  const base = english[section];
  if (!base) return undefined;
  const translated = sectionNames[locale][section];
  return translated ? { ...base, title: translated[0], intro: translated[1] } : base;
}
