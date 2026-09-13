# Accessibility और mobile testing

AI checks सुझा सकता है, लेकिन असली मायने वाली testing के लिए real interfaces, assistive technology, devices, और लोगों की ज़रूरत होती है।

## इन conditions को शामिल करें

- Keyboard-only और switch navigation
- Screen-reader के names, order, status, और error feedback
- Text zoom, reflow, contrast, और reduced motion
- Touch targets और एक हाथ से इस्तेमाल
- धीमे networks, offline transitions, और बीच में रुक जाने वाले uploads
- छोटी screens, orientation बदलना, और virtual keyboards
- Local scripts, लंबे translations, और मिश्रित-भाषा content
- पुराने या कम-memory वाले devices

Automated accessibility score को certification मानकर न चलें। Automated checks से कुछ failures पकड़ें, फिर manual testing करें और जहाँ संभव हो, research में disabled users को भी शामिल करें।
