/**
 * The subjects courses are filed under. A course picks one with `category:` in its course.md.
 * To add a subject: add it here, add its colour (--cat-<slug>) in src/styles/themes.css and its picture in
 * src/components/CategoryIcon.astro. Subjects with no courses are not shown.
 */
type Text = { name: string; blurb: string };
export type Category = { slug: string; en: Text; hi: Text };

export const categories: Category[] = [
  { slug: 'ai', en: { name: 'AI', blurb: 'Use AI for real tasks, and check its answers before you trust them.' }, hi: { name: 'AI', blurb: 'असली कामों में AI का इस्तेमाल करें, और भरोसा करने से पहले उसके जवाब जाँचें।' } },
  { slug: 'digital-life', en: { name: 'Digital life', blurb: 'Phones, passwords, UPI and WhatsApp, explained in plain words.' }, hi: { name: 'डिजिटल ज़िंदगी', blurb: 'फ़ोन, पासवर्ड, UPI और WhatsApp, आसान शब्दों में।' } },
  { slug: 'money', en: { name: 'Money', blurb: 'Budgets, loans, insurance, and how to spot financial fraud.' }, hi: { name: 'पैसा', blurb: 'बजट, लोन, बीमा, और वित्तीय धोखाधड़ी की पहचान।' } },
  { slug: 'security', en: { name: 'Security engineering', blurb: 'Defend systems: threat models, detection and response.' }, hi: { name: 'सुरक्षा इंजीनियरिंग', blurb: 'सिस्टम की रक्षा: थ्रेट मॉडल, डिटेक्शन और रिस्पॉन्स।' } },
  { slug: 'careers', en: { name: 'Tech careers', blurb: 'Interview preparation: data structures, system design, practice.' }, hi: { name: 'टेक करियर', blurb: 'इंटरव्यू की तैयारी: डेटा स्ट्रक्चर, सिस्टम डिज़ाइन, अभ्यास।' } },
  { slug: 'authoring', en: { name: 'Creating courses', blurb: 'Write, check, preview and publish your own courses.' }, hi: { name: 'कोर्स बनाना', blurb: 'अपने कोर्स लिखें, जाँचें, पूर्वावलोकन करें और प्रकाशित करें।' } },
  { slug: 'physics', en: { name: 'Physics', blurb: 'Applied and theoretical, from motion and energy to Lagrangians.' }, hi: { name: 'भौतिकी', blurb: 'अनुप्रयुक्त और सैद्धांतिक: गति और ऊर्जा से लेकर लैग्रेंजियन तक।' } }
];

/** Slugs in display order; the course.md `category` field must be one of these. */
export const categorySlugs = categories.map((c) => c.slug) as [string, ...string[]];

/** Name and one-line description in the reader's language (English when there is no translation). */
export function categoryText(slug: string, lang: string): Text {
  const category = categories.find((c) => c.slug === slug) ?? categories[0];
  return lang === 'hi' ? category.hi : category.en;
}
