# Accessibility और mobile स्थितियाँ सच में टेस्ट करें

Generated फ़ॉर्म चौड़ी लैपटॉप स्क्रीन पर ठीक लगता है। एक टेस्टर जो स्क्रीन नहीं देख सकता, screen reader से टैब करता है — वह सॉफ़्टवेयर जो इंटरफ़ेस ज़ोर से पढ़ता है, या braille में दिखाता है। पिक्सल में “Name” वाला फ़ील्ड accessibility tree में नामहीन है। Error सिर्फ़ लाल टेक्स्ट में आता है। Submit “button” बोलकर आता है। वे रुक जाते हैं। Feature एक परफेक्ट automated स्कोर के साथ शिप हो चुकी थी।

AI चेक सुझा सकता है, लेकिन मतलब वाली टेस्टिंग के लिए असली इंटरफ़ेस, **assistive technology**, डिवाइस, और लोग चाहिए। Assistive technology वह सॉफ़्टवेयर और हार्डवेयर है जिससे लोग प्रॉडक्ट चलाते हैं जब डिफ़ॉल्ट इंटरफ़ेस फिट नहीं बैठता: screen readers, magnification, switch controls, voice control, captions।

Automated accessibility स्कोर को certification न समझें। वे टूल कुछ missing labels और contrast failures पकड़ते हैं। यह प्रमाण नहीं कि कोई इंसान काम पूरा कर सकता है। **WCAG** (Web Content Accessibility Guidelines) वेब accessibility का आम मानक है। “WCAG से मैप होता है” वाला स्कोर फिर भी मशीन का पेज पढ़ना है, इंसान का इस्तेमाल नहीं।

## ये स्थितियाँ शामिल करें

AI से वे श्रेणियाँ याद करवाएँ जो छूट सकती हैं। फिर उन्हें बिल्ड पर चलाएँ, बिल्ड के वर्णन पर नहीं।

- Keyboard-only और switch navigation
- Screen-reader के names, क्रम, status, और error feedback
- Text zoom, reflow, contrast, और reduced motion
- Touch targets और एक हाथ से इस्तेमाल
- धीमे नेटवर्क, offline transitions, और बीच में टूटे uploads
- छोटी स्क्रीन, orientation बदलना, और virtual keyboards
- Local scripts, लंबे अनुवाद, और मिली-जुली भाषा का कंटेंट
- पुराने या कम-memory वाले डिवाइस

Generated “accessibility टेस्ट” जो assert करे कि automated checker ने शून्य violations लौटाए, एक काम का गेट है। काम की शुरुआत है, सर्टिफ़िकेट नहीं। Automated चेक से कुछ failures पकड़ें, फिर manual टेस्टिंग करें, और जहाँ हो सके रिसर्च में दिव्यांग यूज़र्स शामिल करें।

## यह प्रॉम्प्ट आज़माएँ

> इस काल्पनिक UI वर्णन से accessibility और mobile टेस्ट आइडिया लिखो। Keyboard, screen reader, zoom और contrast, touch, network, छोटी स्क्रीन, और भाषा के हिसाब से ग्रुप करो। जो बिना असली डिवाइस या assistive technology के नहीं आँका जा सकता, उसे flag करो। Pass/fail मत गढ़ो।

मीरा की टीम ने Copilot से बना onboarding फ़ॉर्म 98 accessibility स्कोर के साथ शिप किया। TalkBack इस्तेमाल करने वाले सहकर्मी OTP फ़ील्ड तक पहुँचे और सुना “edit box।” दिखाई देने वाला लेबल input से जुड़ा ही नहीं था। Landscape में virtual keyboard ने Verify बटन ढक लिया। इनमें से कुछ स्कोर में नहीं था। उन्होंने label association ठीक किया, बटन की जगह बदली, और रिलीज़ चेकलिस्ट में keyboard-only पास और TalkBack पास जोड़ दिए। Scanner अभी भी चलता है। अब अकेला रिव्यूअर नहीं।

जिसे फीचर चाहिए वह उसे पूरा न कर सके, तो फीचर पूरा नहीं — मॉडल ने markup कितने भरोसे से बताया, इससे फ़र्क नहीं पड़ता।
