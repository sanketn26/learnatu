const routes = {
  about: 'about', privacy: 'privacy', disclaimer: 'disclaimer',
  'start-here': 'learn/getting-started', principles: 'safety/core-rules',
  'basics/what-to-share': 'safety/privacy/what-to-share',
  'basics/passwords': 'safety/accounts/passwords',
  'basics/otp-and-upi': 'safety/money/otp-and-upi',
  'basics/apps-on-phone': 'safety/devices/apps-on-phone',
  'basics/whatsapp': 'safety/communication/whatsapp',
  'basics/fake-links': 'safety/scams/fake-links-and-apps',
  'life/if-something-goes-wrong': 'help/after-a-mistake',
  'situations/parents': 'guides/home-and-family',
  'situations/parents/homework': 'learn/learning/homework-help',
  'situations/parents/deepfakes-and-content': 'safety/scams/deepfakes',
  'situations/parents/child-privacy': 'safety/privacy/children',
  'situations/employees': 'guides/employees',
  'situations/employees/what-to-paste': 'safety/privacy/workplace-ai',
  'situations/seniors': 'guides/older-adults',
  'situations/seniors/fake-calls': 'safety/scams/fake-calls-and-messages',
  'situations/seniors/medical-advice': 'learn/health/medical-information',
  'situations/business': 'guides/small-business',
  'situations/business/customer-data': 'safety/privacy/customer-data',
  'situations/business/contracts-and-marketing': 'learn/work/contracts-and-marketing',
  'situations/students': 'guides/students',
  'situations/students/homework-and-citations': 'learn/learning/checking-facts-and-citations'
};

export function contentRoute(id) {
  const withoutLocale = id.replace(/^(en|hi)\//, '');
  return routes[withoutLocale] ?? withoutLocale;
}

export function routeForSourcePath(sourcePath) {
  const normalized = sourcePath.replace(/^.*\/docs\/(en|hi)\//, '').replace(/\.md$/, '').replace(/\/index$/, '');
  return routes[normalized] ?? normalized;
}
