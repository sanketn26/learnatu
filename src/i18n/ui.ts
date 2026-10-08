import type { Locale } from './locales';

/** Interface text for the learning platform. Add a key to `en` first, then to `hi`. Other languages show English. */
const en = {
  // Navigation and account
  courses: 'Courses',
  myLearning: 'My learning',
  library: 'Library',
  signIn: 'Sign in',
  signOut: 'Sign out',
  search: 'Search',
  searchPlaceholder: 'Search courses and lessons',
  resultOne: 'result for',
  resultMany: 'results for',
  noResults: 'Nothing found. Try a shorter or different word.',
  kindCourse: 'Course',
  kindLesson: 'Lesson',
  kindPage: 'Guide',
  aboutLink: 'About',
  privacy: 'Privacy',
  disclaimer: 'Disclaimer',

  // Display settings
  display: 'Display',
  theme: 'Theme',
  system: 'System',
  original: 'Original',
  white: 'White',
  dark: 'Dark',
  textSize: 'Text size',

  // Home and catalog
  subjects: 'Browse by subject',
  allSubjects: 'All subjects',
  startWith: 'Courses to begin with',
  allCourses: 'See all courses',
  courseOne: 'course',
  courseMany: 'courses',

  // Course page
  free: 'Free',
  start: 'Start course',
  continue: 'Continue',
  enrollFree: 'Enrol for free',
  buy: 'Buy course',
  lessons: 'lessons',
  minutes: 'min',
  preview: 'Free preview',
  syllabus: 'What you will learn',
  outcomeLabel: 'By the end you will be able to say',
  lessonsHeading: 'Lessons',
  about: 'About this course',
  includeCheck: 'A quick check in every lesson',
  includeProgress: 'Progress saved when you sign in',
  includePhone: 'Works on any phone',
  before: 'Before you start:',
  saveProgress: 'Sign in to save your progress.',
  enrolToSave: 'Enrol for free to save your progress.',

  // Lesson page
  markComplete: 'Mark lesson complete',
  completed: '✓ Completed',
  next: 'Next',
  finish: 'Finish course',
  previous: 'Previous',
  translationNotice: 'This lesson is not translated yet — showing the English version.'
};

const hi: typeof en = {
  // Navigation and account
  courses: 'कोर्स',
  myLearning: 'मेरी पढ़ाई',
  library: 'लाइब्रेरी',
  signIn: 'साइन इन',
  signOut: 'साइन आउट',
  search: 'खोजें',
  searchPlaceholder: 'कोर्स और पाठ खोजें',
  resultOne: 'परिणाम:',
  resultMany: 'परिणाम:',
  noResults: 'कुछ नहीं मिला। छोटा या दूसरा शब्द आज़माएँ।',
  kindCourse: 'कोर्स',
  kindLesson: 'पाठ',
  kindPage: 'गाइड',
  aboutLink: 'परिचय',
  privacy: 'गोपनीयता',
  disclaimer: 'अस्वीकरण',

  // Display settings
  display: 'दिखावट',
  theme: 'थीम',
  system: 'सिस्टम',
  original: 'मूल',
  white: 'सफ़ेद',
  dark: 'डार्क',
  textSize: 'अक्षर का आकार',

  // Home and catalog
  subjects: 'विषय के अनुसार',
  allSubjects: 'सभी विषय',
  startWith: 'शुरू करने के लिए कोर्स',
  allCourses: 'सभी कोर्स देखें',
  courseOne: 'कोर्स',
  courseMany: 'कोर्स',

  // Course page
  free: 'मुफ़्त',
  start: 'कोर्स शुरू करें',
  continue: 'जारी रखें',
  enrollFree: 'मुफ़्त में जुड़ें',
  buy: 'कोर्स खरीदें',
  lessons: 'पाठ',
  minutes: 'मिनट',
  preview: 'मुफ़्त झलक',
  syllabus: 'आप क्या सीखेंगे',
  outcomeLabel: 'कोर्स के अंत में आप कह पाएँगे',
  lessonsHeading: 'पाठ',
  about: 'इस कोर्स के बारे में',
  includeCheck: 'हर पाठ में एक छोटी जाँच',
  includeProgress: 'साइन इन करने पर प्रगति सहेजी जाती है',
  includePhone: 'हर फ़ोन पर चलता है',
  before: 'शुरू करने से पहले:',
  saveProgress: 'अपनी प्रगति सहेजने के लिए साइन इन करें।',
  enrolToSave: 'अपनी प्रगति सहेजने के लिए मुफ़्त में जुड़ें।',

  // Lesson page
  markComplete: 'पाठ पूरा हुआ',
  completed: '✓ पूरा हुआ',
  next: 'अगला',
  finish: 'कोर्स पूरा करें',
  previous: 'पिछला',
  translationNotice: 'यह पाठ अभी अनूदित नहीं है — अंग्रेज़ी संस्करण दिख रहा है।'
};

export const ui = (lang: Locale) => (lang === 'hi' ? hi : en);
