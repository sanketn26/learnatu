# Packages, APIs, और licenses जाँचें

AI अक्सर ऐसे package names, methods, configuration options, और citations सुझा देता है जो असल में मौजूद ही नहीं हैं या आपके version से मेल नहीं खाते।

## Install करने से पहले verify करें

- Package को उसके official registry और project repository के ज़रिए ढूँढें
- Spelling, ownership, maintenance activity, release history, और supported versions जाँचें
- सही API के लिए primary documentation पढ़ें
- Transitive dependencies और install scripts की समीक्षा करें
- Confirm करें कि license आपके project के अनुकूल है
- जहाँ उपयुक्त हो, किसी मौजूदा भरोसेमंद dependency या platform feature को प्राथमिकता दें

सिर्फ इसलिए installation command न चलाएँ क्योंकि वह generated code में दिख गया। एक hallucinated package name किसी malicious package जैसा भी हो सकता है।

Generated code कभी-कभी ऐसे patterns या text को भी दोहरा सकता है जिनका origin साफ़ नहीं है। Distribution से पहले अपने organisation की review और licensing policy का पालन करें।
