# Synthetic test data का इस्तेमाल करें

Tests generate करने, defects investigate करने, या screenshots बनाने के लिए production data को किसी public AI tool में copy नहीं करना चाहिए।

## ज़्यादा सुरक्षित test data

- Names, addresses, identifiers, और transactions खुद बनाएँ (invent करें)
- सिर्फ वही structural property रखें जो test के लिए ज़रूरी है
- जान-बूझकर boundary और invalid values शामिल करें
- ऐसे combinations से बचें जिनसे किसी असली व्यक्ति की पहचान हो सके
- Synthetic records को साफ़-साफ़ mark करें
- Secrets और production tokens को fixtures और logs से दूर रखें

"Anonymized" data भी तब किसी की पहचान उजागर कर सकता है जब rare attributes आपस में मिल जाएँ। जहाँ तक संभव हो, purpose-built synthetic data इस्तेमाल करें और organisation की policy का पालन करें।

अगर production information किसी unapproved tool में पेस्ट हो गई है, तो चुपचाप chat delete करने के बजाय संबंधित security या privacy process के ज़रिए इसकी रिपोर्ट करें।
