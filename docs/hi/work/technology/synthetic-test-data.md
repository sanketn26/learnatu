# Synthetic test data इस्तेमाल करें, production नहीं

डिफेक्ट सिर्फ़ “असली-लगते” पतों से reproduce होता है। Warehouse CSV वहीं पड़ी है। कुछ पंक्तियाँ public AI टूल में पेस्ट करके “इन्हें test fixtures बना दो” anonymize जैसा लगता है। है नहीं। आपने production के लोगों को उस सिस्टम में कॉपी कर दिया जो आपका test environment नहीं।

Production data को public AI टूल में कॉपी न करें — टेस्ट बनाने, डिफेक्ट देखने, या स्क्रीनशॉट बनाने के लिए भी नहीं।

**Synthetic data** गढ़ी हुई डेटा है, जिसमें टेस्ट को जो *आकार* चाहिए वह है — लंबाई, फ़ॉर्मैट, edge values — लोग नहीं। इसलिए है कि प्रॉडक्ट तोड़ सकें, किसी को एक्सपोज़ किए बिना।

## ज़्यादा सुरक्षित test data

- नाम, पते, identifiers, और transactions खुद गढ़ें
- सिर्फ़ वही structural गुण रखें जो टेस्ट माँगता है (12 अंकों का id, बीती तारीख, Unicode नाम)
- Boundary और invalid values जान-बूझकर डालें: खाली, बहुत लंबा, गलत टाइप, कल, 29 फ़रवरी
- ऐसे मेल से बचें जिनसे गलती से भी कोई असली इंसान पहचाना जाए
- Fixtures और स्क्रीनशॉट में synthetic records साफ़ चिह्नित करें
- Secrets और production tokens fixtures और लॉग से बाहर रखें

“Anonymized” डेटा भी किसी को पहचान सकता है जब दुर्लभ गुण मिल जाएँ। पिनकोड प्लस दुर्लभ निदान प्लस जॉब टाइटल अक्सर काफ़ी है। नाम ढक देना और बाकी छोड़ देना रणनीति नहीं। जहाँ हो सके purpose-built synthetic data इस्तेमाल करें, और organisation की नीति मानें।

वॉल्यूम चाहिए तो मॉडल से *काल्पनिक* पंक्तियाँ उस schema से बनवाएँ जो आपने लिखा, उस production export से नहीं जो पेस्ट किया।

## यह प्रॉम्प्ट आज़माएँ

> Generate 20 fictional customer records for a checkout test. Use obviously fake names and Indian-looking addresses that are not real. Include: one empty email, one email with a plus tag, one 40-character name, one address in a non-Latin script, one expired card format. Label every row SYNTHETIC. Do not use real people, real phone numbers, or any data I did not describe.

!!! danger "कभी नहीं"
    - टेस्ट बनाने, डिफेक्ट देखने, या स्क्रीनशॉट बनाने के लिए production data public AI टूल में कॉपी न करें।

Production जानकारी किसी unapproved टूल में पेस्ट हो गई हो तो चुपचाप चैट डिलीट करने की जगह संबंधित security या privacy प्रोसेस से रिपोर्ट करें। थ्रेड मिटाने से पेस्ट अनकहा नहीं होता, और चुप डिलीट से अगला इंसान वही दोहराता है।

रवि ने “बस बीस” ऑर्डर export किए, chatbot में realistic GST इनवॉइस के लिए। बीस में से दो Google करने लायक अनोखे थे। रिपोर्ट अजीब रही। फ़ील्ड लिस्ट से बीस इनवॉइस गढ़ना छोटा काम होता।
