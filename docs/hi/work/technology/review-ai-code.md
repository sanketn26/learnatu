# AI-generated code की समीक्षा करें

Generated code को ऐसे treat करें जैसे यह किसी ऐसे व्यक्ति का untrusted contribution हो जो आपके system से परिचित नहीं है।

## Layers में review करें

1. **Intent:** क्या यह पूछी गई problem को solve करता है?
2. **Correctness:** Boundaries, failures, retries, और concurrent use में क्या होता है?
3. **Security:** क्या input किसी trust boundary को पार कर सकता है या data reveal कर सकता है?
4. **Operations:** क्या logs सुरक्षित हैं? क्या timeouts, cleanup, और observability पर्याप्त हैं?
5. **Maintainability:** क्या सबसे simple और समझने लायक design इस्तेमाल हो रहा है?
6. **Verification:** क्या implementation को जान-बूझकर तोड़ने पर tests fail होते हैं?

AI से risks पहचानने के लिए कहें, लेकिन उसकी self-review को independent review की जगह न लेने दें। वही model अपने original answer की assumptions को दोहरा सकता है।

Change को accept करने वाला developer ही उसके लिए ज़िम्मेदार रहता है।
