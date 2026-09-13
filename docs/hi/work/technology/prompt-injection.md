# Prompt injection को समझें

कोई AI-enabled application webpages, documents, emails, retrieved records, images, या tool output के अंदर छुपे instructions को process कर सकता है। ये instructions application के तय किए गए rules से टकरा सकते हैं।

## Defensively design करें

- Retrieved और user-controlled content को untrusted data मानें
- Permissions को सीमित रखें और actions को reversible रखें
- Instructions को content से साफ़-साफ़ अलग रखें
- महत्वपूर्ण (consequential) actions के लिए confirmation ज़रूरी रखें
- Tool के inputs और outputs को model के बाहर validate करें
- Secrets को अनावश्यक रूप से model context में जाने से रोकें
- Rules override करने, data extract करने, या connected tools का दुरुपयोग करने की कोशिशों को test करें

"ignore previous instructions" जैसा प्रॉम्प्ट सिर्फ एक स्पष्ट उदाहरण है। असली समस्या यह है कि untrusted content को privileged actions पर असर डालने दिया जाए।

सिर्फ एक system prompt को security boundary मानकर न चलें।
