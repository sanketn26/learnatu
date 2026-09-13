# Coding करते समय AI का सुरक्षित इस्तेमाल

AI अनजान code को समझा सकता है, alternatives सुझा सकता है, और repetitive हिस्से draft कर सकता है। लेकिन यह आपके पूरे system को नहीं समझता और न ही secure, correct, maintainable code की गारंटी देता है।

## प्रॉम्प्ट करने से पहले

- अपने organisation के approved-tool और data-handling rules का पालन करें
- Credentials, tokens, internal URLs, customer data, और proprietary business logic हटा दें
- Problem को reproduce करने वाला एक छोटा fictional example देना बेहतर रहता है
- Language, version, constraints, error handling, और security expectations साफ़ बताएँ

## Code मिलने के बाद

हर line पढ़ें। Tests और static checks चलाएँ। Dependencies और APIs को official documentation से confirm करें। Authentication, authorization, input validation, error handling, logging, privacy, performance, और failure behaviour की समीक्षा करें।

Production secrets कभी किसी प्रॉम्प्ट में पेस्ट न करें। अगर कोई secret exposed हो गया है, तो उसे rotate करें — सिर्फ conversation delete कर देना काफ़ी नहीं है।
