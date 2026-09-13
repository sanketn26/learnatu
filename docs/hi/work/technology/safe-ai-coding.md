# Coding करते समय AI का सुरक्षित इस्तेमाल

Config error पर अटक गए। `.env` फ़ाइल खुली है। ChatGPT खुला है। पूरी फ़ाइल पेस्ट करना redact करने से तेज़ लगता है: “यह मेरा environment है — client कनेक्ट क्यों नहीं हो रहा?”

वही पेस्ट incident है। **Secret** वह चीज़ है जो सिस्टम खोलती है — API key, database password, session **token**। कोडिंग का सवाल लपेट देने से सुरक्षित नहीं हो जाती। Public AI टूल किसी और का कंप्यूटर है। बॉक्स को ऐसे समझें जैसे टिकट जिसे इंटरनेट पढ़ सकता है।

**Prompt** वह संदेश है जो आप भेजते हैं: सवाल, snippet, stack trace। AI अनजाना कोड समझा सकता है, विकल्प सुझा सकता है, दोहराए जाने वाले टुकड़े ड्राफ्ट कर सकता है। आपका पूरा सिस्टम नहीं समझता। Secure, correct, maintainable कोड की गारंटी नहीं देता। एक तेज़ junior सोचें जिसने आपका architecture नहीं देखा, threat model नहीं देखा, पिछले हफ़्ते का incident नहीं देखा।

## Prompt से पहले

Organisation के approved-tool और data-handling नियम मानें। कंपनी का Copilot tenant और पर्सनल चैट टैब एक चीज़ नहीं।

फिर पेस्ट साफ़ करें।

- Credentials, tokens, internal URLs, और customer data
- **Proprietary** बिज़नेस लॉजिक — pricing नियम, fraud check, और वे workflow जो आपके हैं, सार्वजनिक उदाहरण नहीं

एक छोटा काल्पनिक उदाहरण बेहतर है जो समस्या फिर भी reproduce करे। बग का आकार आमतौर पर बच जाता है। असली user id, PAN, और hostname को साथ यात्रा करने की ज़रूरत नहीं।

Language, version, constraints, error handling, और security की उम्मीदें लिखें। अगर आपने नहीं कहा “unknown fields reject करो” या “token लॉग मत करो,” मॉडल अक्सर वही happy-path snippet देगा जो उसने सबसे ज़्यादा देखा है।

## यह प्रॉम्प्ट आज़माएँ

> मेरे पास TypeScript 5 की एक service है जो webhook body पढ़ती है और एक row लिखती है। इस काल्पनिक payload और इस redacted error से एक parse-and-validate function सुझाओ। Constraints: कोई नई dependency नहीं, unknown fields reject, secrets कभी लॉग नहीं, invalid JSON पर fail closed। कोई requirement गायब लगे तो मुझसे पूछो। Error में जो API नहीं है, वह मत गढ़ो।

## कोड मिलने के बाद

हर लाइन पढ़ें। जो टेस्ट और static check पहले से भरोसे के हैं, चलाएँ। हर dependency और API official docs से confirm करें — [packages, APIs, और licenses](packages-apis-and-licenses.md) अलग रिव्यू है, “compile हो गया” का साइड इफ़ेक्ट नहीं। Authentication, authorization, input validation, error handling, logging, privacy, performance, और यह देखें कि दूसरा पक्ष धीमा हो या गिर जाए तो क्या होता है।

फिर [इसे untrusted कोड की तरह रिव्यू करें](review-ai-code.md)। Merge करने वाले फिर भी आप हैं।

!!! danger "कभी नहीं"
    - Production secrets कभी prompt में पेस्ट न करें।
    - Secret निकल गया हो तो rotate करें। Conversation डिलीट करना काफ़ी नहीं।

प्रिया ने staging `.env` “बस CORS debug करने” पेस्ट कर दी। Key production की कॉपी थी। उसी दोपहर rotate करना झंझट था। चैट गायब हो जाएगी, यह उम्मीद कोई control नहीं है।
