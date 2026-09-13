# पास होते टेस्ट coverage नहीं होते

डैशबोर्ड कहता है 94%। CI ग्रीन है। मॉडल ने दोपहर में अस्सी टेस्ट लिख दिए। दो हफ़्ते बाद एक refund capture से दौड़ता है और ग्राहक को दो बार क्रेडिट हो जाता है। हर टेस्ट अभी भी पास है, क्योंकि हर टेस्ट implementation के पीछे happy path पर चला, और प्रॉडक्ट से कभी नहीं पूछा कि यूज़र का उस पर क्या हक है।

AI-generated टेस्ट अक्सर implementation की नकल करते हैं, साधारण happy path पर ज़्यादा टिकते हैं, या यह assert करते हैं कि कोड चला — यह नहीं कि व्यवहार सही है।

**Assertion** वह लाइन है जो प्रॉडक्ट गलत हो तो fail हो — “ऑर्डर `cancelled` है,” “refund capture के बराबर है,” “दूसरा रोल यह row नहीं देख सकता।” असली assertion के बिना टेस्ट एक smoke check है, कहानी के साथ।

**Coverage नंबर** (लाइन या branch का प्रतिशत जो suite ने चलाया) सिर्फ़ यह बताता है कि कोड दौड़ा। यह साबित नहीं कर सकता कि ज़रूरी जोखिम चले भी। पूछें क्या गायब है, सिर्फ़ और टेस्ट नहीं।

## टेस्ट को चुनौती दें

1. हर ज़रूरी requirement को किसी assertion तक ट्रेस करें। नियम सिर्फ़ comment या टिकट में हो तो टेस्ट नहीं हुआ।
2. Boundaries, failures, permissions, और state changes देखें — वही श्रेणियाँ जो आपने [मॉडल से generate करवाईं](generate-test-ideas.md)।
3. जान-बूझकर एक डिफेक्ट डालें और देखें टेस्ट fail होता है। Comparison पलटें, auth check छोड़ें, गलत status लौटाएँ। Suite ग्रीन रहे तो वह आपकी रक्षा नहीं कर सकता।
4. ऐसी assertions ढूँढें जो mocked values दोहराती हैं। `mockUser` सेट करने के बाद `expect(result).toEqual(mockUser)` एक घेरा है, जाँच नहीं।
5. Brittle selectors, timing की धारणाएँ, और ज़रूरत से ज़्यादा mocking रिव्यू करें। तीन सेकंड सोने वाला टेस्ट, या हर dependency बदल देने वाला, लेखक की मशीन पर पास होगा और CI में झूठ बोलेगा।
6. प्लान में exploratory testing और इंसान की नज़र रखें। Automation नहीं देखती कि screen reader ने error मिस किया, या फ़ोन ने कमज़ोर नेटवर्क पर upload गिरा दिया।

फिर [वे स्थितियाँ चलाएँ जिनमें यूज़र सच में रहते हैं](accessibility-mobile-testing.md)। Line coverage Submit ढकते virtual keyboard का ज़िक्र नहीं करेगी।

## एक suite जो fail नहीं हो सकती थी

दीपक ने discount engine के टेस्ट उसी function से generate किए। हर केस उन्हीं तीन coupons पर चला जिन्हें कोड पहले से branch करता था। उन्होंने सोर्स में “नए यूज़र पर max 10%” नियम 100% कर दिया। Suite ग्रीन रही: टेस्ट ने वही helper import किया जो implementation इस्तेमाल करती थी, और helper की तुलना खुद से की। एक हाथ से लिखा केस — नया यूज़र, stacked coupon, अपेक्षित cap — fail हो जाता। Coverage नंबर को फ़र्क नहीं पड़ा।

ग्रीन का मतलब जो टेस्ट हैं वे fail नहीं हुए। मतलब यह नहीं कि जो टेस्ट चाहिए वे हैं।
