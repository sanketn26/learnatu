export type Course = {
  slug: string;
  icon: string;
  title: string;
  promise: string;
  outcome: string;
  lessons: { path: string; title: string; skill: string }[];
};

export const courses: Course[] = [
  {
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
  }
];

export function getCourse(slug: string) {
  return courses.find((course) => course.slug === slug);
}

export function findLesson(pathname: string) {
  const route = pathname.replace(/^\/(hi|or|ta|te|kn|bn)/, '/');
  for (const course of courses) {
    const index = course.lessons.findIndex((lesson) => lesson.path === route);
    if (index >= 0) return { course, index, lesson: course.lessons[index] };
  }
}
