import type { Locale } from './locales';

/** Chrome strings for the learning platform. Locales without an entry fall back to English. */
const en = {
  courses: 'Courses', myLearning: 'My learning', library: 'Library', signIn: 'Sign in', signOut: 'Sign out',
  free: 'Free', start: 'Start course', continue: 'Continue', enrollFree: 'Enrol for free', buy: 'Buy course',
  lessons: 'lessons', minutes: 'min', preview: 'Free preview', markComplete: 'Mark lesson complete', completed: '✓ Completed',
  next: 'Next', finish: 'Finish course', previous: 'Previous', outcomeLabel: 'By the end you will be able to say', lessonsHeading: 'Lessons', about: 'About this course', includeCheck: 'A quick check in every lesson', includeProgress: 'Progress saved when you sign in', includePhone: 'Works on any phone', before: 'Before you start:', courseOne: 'course', courseMany: 'courses', subjects: 'Browse by subject', allSubjects: 'All subjects', startWith: 'Courses to begin with', allCourses: 'See all courses', theme: 'Theme', system: 'System', original: 'Original', white: 'White', dark: 'Dark', syllabus: 'What you will learn', saveProgress: 'Sign in to save your progress.', enrolToSave: 'Enrol for free to save your progress.', translationNotice: 'This lesson is not translated yet — showing the English version.'
};
const hi: typeof en = {
  courses: 'कोर्स', myLearning: 'मेरी पढ़ाई', library: 'लाइब्रेरी', signIn: 'साइन इन', signOut: 'साइन आउट',
  free: 'मुफ़्त', start: 'कोर्स शुरू करें', continue: 'जारी रखें', enrollFree: 'मुफ़्त में जुड़ें', buy: 'कोर्स खरीदें',
  lessons: 'पाठ', minutes: 'मिनट', preview: 'मुफ़्त झलक', markComplete: 'पाठ पूरा हुआ', completed: '✓ पूरा हुआ',
  next: 'अगला', finish: 'कोर्स पूरा करें', previous: 'पिछला', outcomeLabel: 'कोर्स के अंत में आप कह पाएँगे', lessonsHeading: 'पाठ', about: 'इस कोर्स के बारे में', includeCheck: 'हर पाठ में एक छोटी जाँच', includeProgress: 'साइन इन करने पर प्रगति सहेजी जाती है', includePhone: 'हर फ़ोन पर चलता है', before: 'शुरू करने से पहले:', courseOne: 'कोर्स', courseMany: 'कोर्स', subjects: 'विषय के अनुसार', allSubjects: 'सभी विषय', startWith: 'शुरू करने के लिए कोर्स', allCourses: 'सभी कोर्स देखें', theme: 'थीम', system: 'सिस्टम', original: 'मूल', white: 'सफ़ेद', dark: 'डार्क', syllabus: 'आप क्या सीखेंगे', saveProgress: 'अपनी प्रगति सहेजने के लिए साइन इन करें।', enrolToSave: 'अपनी प्रगति सहेजने के लिए मुफ़्त में जुड़ें।', translationNotice: 'यह पाठ अभी अनूदित नहीं है — अंग्रेज़ी संस्करण दिख रहा है।'
};

export const ui = (lang: Locale) => (lang === 'hi' ? hi : en);
