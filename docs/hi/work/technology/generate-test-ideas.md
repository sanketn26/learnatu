# AI से बेहतर test ideas निकालें

Suite ग्रीन है। हर टेस्ट नाम प्रॉडक्ट टूर जैसा पढ़ता है: user साइन इन कर सकता है, cart में डाल सकता है, पेमेंट कर सकता है। किसी ने नहीं पूछा cart खाली हो तो क्या, session पेमेंट के बीच में expire हो तो क्या, या सपोर्ट वाला रोल किसी और का ऑर्डर खोल ले तो क्या। यह happy-path suite है। Coverage नहीं — काम वाले मतलब में नहीं: “ज़रूरी जोखिम सच में चले भी।”

AI टेस्टर की सोच बढ़ा सकता है जब उसे व्यवहार और सीमाओं का सुरक्षित, सामान्य वर्णन मिले — production dump नहीं, असली customer id नहीं। *तरह* के जोखिम माँगें, वही सफ़र की लंबी सूची नहीं जिसमें बटन का नाम बदल दिया हो।

लंबी लिस्ट उपयोगी coverage नहीं। Generate करने के बाद [टेस्ट validate करें](validate-test-coverage.md)। चलाने के लिए जो चाहिए, [synthetic data](synthetic-test-data.md) गढ़ें।

## Volume नहीं, categories माँगें

मॉडल को काल्पनिक feature का वर्णन दें: यूज़र कौन है, सफलता कैसी दिखती है, कौन-कौन से रोल हैं, क्या कभी नहीं होना चाहिए। फिर आइडिया जोखिम के हिसाब से ग्रुप करके माँगें, “और केस” के हिसाब से नहीं।

- Happy paths और असल यूज़र journeys
- Boundary values और invalid inputs
- State transitions और बीच में टूटे flows
- Permissions और रोल के फ़र्क
- Retry, timeout, concurrency, और partial failure
- Accessibility, localization, और mobile स्थितियाँ
- Abuse और security केस

Requirement चुप हो — “webhook दो बार आए तो क्या होना चाहिए?” — काम का output एक सवाल है, गढ़ा हुआ expected result नहीं। गढ़े oracle ऐसे टेस्ट बन जाते हैं जो गलत व्यवहार को ताला लगा देते हैं।

## सुरक्षित प्रॉम्प्ट

> Create test ideas for this fictional feature description. Group them by behaviour, boundary, failure, accessibility, security, and mobile conditions. State assumptions and missing requirements. Do not invent expected results when the requirement is unclear.

हर केस असल प्रॉडक्ट से मिलाएँ। जो एक-दूसरे की नकल हैं, काट दें। जो production में fail हों तो चोट लगे, रखें। जो मॉडल चूक गया क्योंकि वह यूज़र, डिवाइस, या पिछले महीने के incident के साथ नहीं बैठा — वे जोड़ें।

## एक लिस्ट जो पूरी लगती थी

सना ने “checkout के 50 test cases” माँगे। पचास तरीके मिले ख़रीद पूरी करने के। किसी में partial refund नहीं था, double-submit नहीं, error state पर screen reader नहीं। जब categories माँगीं, लिस्ट छोटी हुई और तेज़: दस journeys, आठ boundaries, मुट्ठी भर permission और failure केस जो उन्होंने सच में चलाए। टिकट छोटा हुआ। Risk surface नहीं।
