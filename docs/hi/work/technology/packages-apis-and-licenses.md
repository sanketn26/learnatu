# Install से पहले packages, APIs, और licenses जाँचें

Generated snippet एक missing module पर fail होता है। नीचे एक लाइन: `npm install fancy-retry-kit`। नाम registry के बाकी helpers जैसा लगता है। फिक्स बस एक पेस्ट दूर लगता है।

रुकें। AI अक्सर ऐसे package नाम, methods, configuration options, और citations सुझाता है जो होते ही नहीं, या आपके version से मेल नहीं खाते। **Hallucinated package** वह नाम है जो मॉडल ने गढ़ा क्योंकि असली जैसा लगता था। वह गढ़ा नाम किसी malicious package का पहले से हो सकता है। Snippet से install करना उसे मशीन पर लाने का तरीका है।

सिर्फ़ इसलिए installation command न चलाएँ कि generated कोड में दिख गई।

## Install से पहले verify करें

Package उसके official registry और project repository से ढूँढें। नाम खुद टाइप करें। मॉडल ने command के साथ जो लिंक दिया, उस पर भरोसा न करें।

- Spelling, ownership, maintenance activity, release history, और supported versions देखें
- जिस API को कॉल करने जा रहे हैं, उसकी primary documentation पढ़ें — उसी version की जो आप चला रहे हैं
- **Transitive dependencies** देखें (वे packages जो आपका package आपके लिए इंस्टॉल करता है) और वे install scripts जो `npm install` या `pip install` पर चलते हैं
- **License compatibility** confirm करें: वह license आपको कोड इस्तेमाल, बदलने, और बाँटने देती है *आपके* प्रॉडक्ट में, जैसा organisation माँगता है
- काम पहले से करता हो तो मौजूदा भरोसे की dependency या platform feature को तरजीह दें

एक नया helper जो “बस retries करता है” मुफ़्त नहीं है। Supply-chain फ़ैसला है, security रिव्यू है, आने वाला upgrade है। Generated कोड वह रिव्यू आपके लिए नहीं करेगा।

## Lockfile में आने के बाद

Generated कोड ऐसे पैटर्न या टेक्स्ट भी दोहरा सकता है जिनका origin साफ़ नहीं — एक function जो tutorial से थोड़ा ज़्यादा क़रीबी है, एक comment ब्लॉक जो कहीं और के license header जैसा पढ़ता है। बाँटने से पहले organisation की रिव्यू और licensing नीति मानें।

मॉडल ने ऐसा method cite किया हो जो आपके version में है ही नहीं, तो “docs पुराने हैं” वाला रहस्य न बनाएँ जब तक official docs न खोल ली हों। API कभी अस्तित्व में ही न रहा हो।

नेहा के generated client ने `createWidgetV2` कॉल किया, उस SDK पर जिसका ऐसा method था ही नहीं। साथ वाला package नाम लोकप्रिय लाइब्रेरी से एक अक्षर चूक था। Registry एंट्री दो दिन पुरानी थी, repository नहीं, install पर network माँगती थी। उन्होंने command डिलीट किया, असली docs खोले, और वह function इस्तेमाल किया जो तीन साल से वहाँ था।

अतिरिक्त मिनट यही काम है। Install वैकल्पिक है।
