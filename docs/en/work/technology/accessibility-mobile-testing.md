# Test accessibility and mobile conditions for real

The generated form looks fine on a wide laptop. A tester who cannot see the screen tabs through it with a screen reader — software that reads the interface aloud, or presents it in braille. The field labelled “Name” in pixels has no name in the accessibility tree. The error appears only as red text. Submit is announced as “button.” They stop. The feature shipped with a perfect automated score.

AI can suggest checks, but meaningful testing requires real interfaces, **assistive technology**, devices, and people. Assistive technology is the software and hardware people use to operate a product when the default interface does not fit: screen readers, screen magnification, switch controls, voice control, captions.

Do not treat an automated accessibility score as certification. Those tools catch some missing labels and contrast failures. They do not certify that a person can complete the task. **WCAG** (Web Content Accessibility Guidelines) is a widely used standard for web accessibility. A score that “maps to WCAG” is still a machine reading a page, not a person using it.

## Include these conditions

Use AI to remember categories you might skip. Then run them on the build, not on a description of the build.

- Keyboard-only and switch navigation
- Screen-reader names, order, status, and error feedback
- Text zoom, reflow, contrast, and reduced motion
- Touch targets and one-handed use
- Slow networks, offline transitions, and interrupted uploads
- Small screens, orientation changes, and virtual keyboards
- Local scripts, long translations, and mixed-language content
- Older or lower-memory devices

A generated “accessibility test” that asserts an automated checker returned zero violations is a useful gate. It is the start of the work, not the certificate. Use automated checks to find some failures, then perform manual testing and include disabled users in research where possible.

## Try this prompt

> From this fictional UI description, list accessibility and mobile test ideas. Group by keyboard, screen reader, zoom and contrast, touch, network, small screen, and language. Flag what you cannot judge without a real device or assistive technology. Do not invent a pass/fail result.

Meera’s team shipped a Copilot-built onboarding form with a 98 accessibility score. A colleague who uses TalkBack reached the OTP field and heard “edit box.” The visible label was never wired to the input. The virtual keyboard covered the Verify button in landscape. None of that was in the score. They fixed the label association, moved the button, and added a keyboard-only pass and a TalkBack pass to the release checklist. The scanner still runs. It is no longer the only reviewer.

If the person who needs the feature cannot complete it, the feature is not done — regardless of how confidently the model described the markup.
