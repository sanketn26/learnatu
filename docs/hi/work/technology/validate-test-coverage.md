# AI-generated test coverage को validate करें

AI-generated tests अक्सर implementation को ही दोहराते हैं, simple happy paths का ज़्यादा इस्तेमाल करते हैं, या यह assert करते हैं कि code चल रहा है — यह नहीं कि behaviour सही है।

## Tests को चुनौती दें

1. हर महत्वपूर्ण requirement को किसी assertion तक trace करें।
2. Boundaries, failures, permissions, और state changes जाँचें।
3. जान-बूझकर एक defect डालें और confirm करें कि कोई test fail होता है।
4. ऐसे assertions ढूँढें जो सिर्फ mocked values को दोहराते हैं।
5. Brittle selectors, timing की assumptions, और ज़रूरत से ज़्यादा mocking की समीक्षा करें।
6. Plan में exploratory testing और human observation को बनाए रखें।

सिर्फ ज़्यादा tests नहीं, यह भी पूछें कि क्या मिसिंग है। Coverage numbers और passing status यह साबित नहीं करते कि महत्वपूर्ण risks को actually test किया गया।
