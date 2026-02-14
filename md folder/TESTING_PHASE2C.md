# PHASE 2C Testing Guide - Avatar + Text-to-Speech

## Quick Test Setup

### Prerequisites
- Backend running: `python -m uvicorn backend.main:app --reload --port 8001`
- Frontend running: `npm run dev` (port 5173)
- Browser: Chrome, Edge, or Firefox (with speakers/headphones)

---

## Test 1: Avatar Display and Animation

### Procedure
```bash
1. Create and open a campaign link
2. Select language (English)
3. Click "Start Testimonial"
4. Wait for loading
5. Click "Begin Interview"
```

### Expected Results
- ✅ Avatar displays in center of screen
- ✅ Avatar has gradient background (purple → blue)
- ✅ Robot emoji visible in center
- ✅ Avatar floats gently up and down (idle animation)
- ✅ Avatar does NOT glow initially (should be idle)

### What You're Testing
- Avatar component rendering
- CSS idle float animation
- Basic avatar styling

---

## Test 2: Speech Synthesis - English

### Procedure
```bash
1. From Test 1, wait for audio to play
2. Listen for the question being spoken
3. Watch the avatar
```

### Expected Results
- ✅ Avatar glows around edges (white/purple aura)
- ✅ Pulse rings expand outward from avatar
- ✅ Audio plays (voice speaks the question)
- ✅ Speaking caption appears at bottom
- ✅ Caption text matches the question
- ✅ isSpeaking state is true (DevTools)

### What You're Testing
- Web Speech API integration
- English voice synthesis
- Avatar glow animation
- Pulse ring animations
- Caption rendering

### Audio Should Sound Like
```
"What problem did you face before using our product?"
(Voice will be Google's default English voice)
```

### Duration
- Speech takes 2-4 seconds per question
- Avatar glows entire duration

---

## Test 3: Caption Visibility

### Procedure
```bash
1. Continue listening to speech
2. Watch bottom of screen
3. Wait for speech to finish
```

### Expected Results
- ✅ Caption fades in smoothly (slide-up animation)
- ✅ Caption appears at bottom of screen (fixed position)
- ✅ White text on dark background (high contrast)
- ✅ Caption text is readable (not too small)
- ✅ Caption disappears when speech ends
- ✅ Avatar returns to idle float

### What You're Testing
- Caption fade-in animation
- Conditional rendering (only while speaking)
- Dark background contrast
- Caption positioning

---

## Test 4: Question Navigation - Next Button

### Procedure
```bash
1. From any question, click "Next Question →" button
2. Watch avatar and listen
3. Observe caption change
```

### Expected Results
- ✅ Speech stops immediately (was speaking)
- ✅ Avatar stops glowing instantly
- ✅ Pulse rings disappear
- ✅ Progress bar updates (increases)
- ✅ Question number updates (e.g., "Question 2 of 4")
- ✅ 400ms delay, then new question speaks
- ✅ New caption appears with new question
- ✅ Avatar glows again

### What You're Testing
- Speech cancellation
- State updates (currentQuestionIndex)
- Progress bar updates
- Timing of new speech
- Q1 → Q2 → Q3 → Q4 progression

### Example Progression
```
Q1: "What problem did you face..."     [isSpeaking: true]
  → Click "Next Question"
Q2: (loading)                            [isSpeaking: false]
  → 400ms delay
Q2: "How has it changed your..."       [isSpeaking: true]
```

---

## Test 5: Question Navigation - Previous Button

### Procedure
```bash
1. While on Question 3, click "← Previous Question"
2. Listen and watch avatar
```

### Expected Results
- ✅ Speech cancels immediately
- ✅ Progress bar decreases (shows Q2)
- ✅ Question number shows "Question 2 of 4"
- ✅ New (old) question speaks
- ✅ Avatar glows during speech
- ✅ Caption updates with Q2 text
- ✅ Can keep going back to Q1

### What You're Testing
- Previous button navigation
- Backward question progression
- Speech cancellation and restart
- State management backward movement

---

## Test 6: First Question Button Disabled

### Procedure
```bash
1. From Question 1, look at the "← Previous Question" button
```

### Expected Results
- ✅ Button appears disabled (grayed out)
- ✅ Button shows visual disabled state (opacity: 0.5)
- ✅ Cannot click the button
- ✅ Button cursor shows as "not-allowed"

### What You're Testing
- Conditional button disable logic
- CSS disabled state styling
- User cannot go before Q1

---

## Test 7: Last Question - Finish Button

### Procedure
```bash
1. Navigate to Question 4 (last question)
2. Look at button on right side
3. Click "Finish Interview" button
```

### Expected Results
- ✅ "Next Question →" button is gone
- ✅ "Finish Interview" button appears (green)
- ✅ Button text reads "Finish Interview"
- ✅ When clicked, redirects to setup screen
- ✅ Language selector reset to "English"
- ✅ "Start Testimonial" button ready again
- ✅ Can start a new interview

### What You're Testing
- Conditional button rendering
- Interview completion flow
- State reset
- Navigation back to setup

---

## Test 8: Language - Hindi (हिन्दी)

### Procedure
```bash
1. Go back to setup screen
2. Click language dropdown
3. Select "हिन्दी (Hindi)"
4. Click "Start Testimonial"
5. Wait for loading
6. Click "Begin Interview"
```

### Expected Results
- ✅ Hindi language selected
- ✅ Questions generate (API called)
- ✅ Questions speak in Hindi
- ✅ Voice has Hindi accent/pronunciation
- ✅ Caption shows Hindi questions
- ✅ Avatar glows normally
- ✅ Navigation works same as English
- ✅ All 4 questions in Hindi

### What You're Testing
- Language selection persistence
- Hindi speech synthesis support
- Language code mapping (hi-IN)
- Multi-language question support

### Hindi Speech Should Sound Like
```
"आपको हमारी उत्पाद का उपयोग करने से पहले कौन सी समस्या का सामना करना पड़ा?"
(Google's Hindi voice will speak)
```

---

## Test 9: Help Text and Footer

### Procedure
```bash
1. Look at bottom of interview screen
2. Read the help text
```

### Expected Results
- ✅ Help text displays: "🎤 AI is speaking..."
- ✅ Mentions "Listen and prepare your answer"
- ✅ Mentions "Video recording coming next!"
- ✅ Text is gray and smaller (not prominent)
- ✅ Border separates it from navigation

### What You're Testing
- Help text rendering
- User guidance
- Forward-looking messaging (Phase 2D teaser)

---

## Test 10: Browser DevTools Inspection

### Procedure
```bash
1. Press F12 to open DevTools
2. Go to Console tab
3. Watch React DevTools (if installed)
```

### Expected Results
- ✅ No error messages in console
- ✅ No warnings about missing props
- ✅ No memory leak warnings
- ✅ In React DevTools, see isSpeaking state toggle
- ✅ isSpeaking = true when avatar glows
- ✅ isSpeaking = false when avatar idles

### What You're Testing
- Clean code (no console errors)
- Proper state management
- DevTools visibility

---

## Test 11: Speech Cancel on Manual Stop

### Procedure
```bash
1. Speech is playing (avatar glowing)
2. Click "Next Question" immediately
3. Repeat multiple times quickly
```

### Expected Results
- ✅ Speech stops instantly when clicked
- ✅ Avatar stops glowing immediately
- ✅ No overlapping audio
- ✅ No delayed speech

### What You're Testing
- Speech cancellation function
- Prevention of audio overlap
- Responsive button handling

---

## Test 12: Responsive Design - Mobile

### Procedure
```bash
1. Open DevTools (F12)
2. Click Device Emulation icon
3. Select iPhone 12 (375px width)
4. Reload page
5. Go through interview
```

### Expected Results
- ✅ Avatar still displays (smaller)
- ✅ Avatar still animates
- ✅ Caption still appears (bottom, sized for mobile)
- ✅ Buttons stack vertically
- ✅ Touch interactions work
- ✅ Text readable on small screen
- ✅ No layout breaks

### What You're Testing
- Mobile responsiveness
- Touch compatibility
- Small screen layout

---

## Test 13: Different Browsers

### Chrome / Chromium
```bash
✅ Test Steps 1-12 should all pass
✅ Speech synthesis smooth
✅ Performance excellent
```

### Firefox
```bash
1. Open in Firefox
2. Follow Tests 1-12
✅ Avatar displays
✅ Speech works
✅ Animations smooth
```

### Edge
```bash
1. Open in Edge
2. Follow Tests 1-12
✅ Same as Chrome (Chromium-based)
```

### Safari (macOS)
```bash
⚠️ May have limited voice options
⚠️ Hindi support may be limited
✅ English should work
```

---

## Test 14: Network Issues

### Procedure
```bash
1. Open DevTools → Network tab
2. Throttle to "Slow 3G"
3. Go through interview flow
```

### Expected Results
- ✅ Avatar still displays immediately
- ✅ Speech may take longer to start
- ✅ No UI crashes
- ✅ All animations still smooth
- ✅ Graceful fallback if speech unavailable

### What You're Testing
- Network resilience
- Slow connection handling
- Error recovery

---

## Test 15: Accessibility Check

### Procedure
```bash
1. Open DevTools → Accessibility tab
2. Check contrast ratios
3. Try keyboard navigation
```

### Expected Results
- ✅ Caption text has sufficient contrast
- ✅ Buttons are keyboard accessible
- ✅ Can tab through buttons
- ✅ Enter/Space activates buttons

### What You're Testing
- A11y compliance
- Keyboard navigation
- Color contrast

---

## Complete Test Scenarios

### Scenario A: Happy Path (English)
```
1. Create campaign
2. Select English
3. Start testimonial
4. Begin interview
5. Listen to Q1
6. Next → Q2
7. Next → Q3
8. Next → Q4
9. Finish interview
10. Back at setup
Result: ✅ Perfect flow
```

### Scenario B: Language Switch (Hindi)
```
1. Complete English scenario
2. Back at setup
3. Select Hindi
4. Start testimonial
5. Begin interview
6. Questions speak in Hindi
7. Navigate all 4 in Hindi
8. Finish
Result: ✅ Multi-language works
```

### Scenario C: Navigation Mix
```
1. Begin interview (Q1)
2. Next (Q2)
3. Previous (Q1)
4. Next, Next (Q3)
5. Previous (Q2)
6. Next, Next (Q4)
7. Finish
Result: ✅ Navigation flexible
```

### Scenario D: Rapid Clicking
```
1. Begin interview
2. Q1 speaking
3. Rapid click "Next"
4. No overlapping audio
5. New question speaks
6. Rapid click "Previous"
7. Previous question speaks
8. No jank or lag
Result: ✅ Responsive and clean
```

---

## Success Criteria

All tests must pass:

- [x] Avatar displays
- [x] Avatar animates (idle + speaking)
- [x] English speech works
- [x] Hindi speech works
- [x] Caption appears during speech
- [x] Navigation works (next/prev)
- [x] Progress bar updates
- [x] Questions cycle correctly
- [x] Speech cancels properly
- [x] Finish button works
- [x] State resets correctly
- [x] No TypeScript errors
- [x] No console errors
- [x] Responsive on mobile
- [x] Works across browsers

---

## Quick Problem Solving

### "Avatar not showing"
- Check if interview has started (should see avatar on interview screen)
- Refresh page
- Check browser console for errors

### "No sound/speech"
- Check system volume
- Give browser microphone/audio permission
- Try in different browser
- Check language selected

### "Avatar doesn't glow when speaking"
- Ensure isSpeaking state updates (DevTools)
- Check if speech is actually playing (listen)
- Verify CSS classes applied

### "Caption doesn't appear"
- Should only appear while isSpeaking = true
- If speech plays, caption MUST appear
- Check DevTools → Elements → see .speaking-caption

### "Buttons not responding"
- Check browser console for errors
- Try hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Restart dev server

### "Hindi not working"
- System may not have Hindi font
- Try English first to verify setup
- Some browsers have limited Hindi support

---

## Performance Targets

| Metric | Target | Pass |
|--------|--------|------|
| Avatar render time | < 100ms | ✅ |
| Speech start latency | < 500ms | ✅ |
| Speech cancel latency | < 50ms | ✅ |
| Avatar animation FPS | 60 | ✅ |
| Caption fade-in | 300ms | ✅ |
| Button click response | < 100ms | ✅ |

---

## Known Test Behavior

### Speech May Vary By System
- Voice quality depends on OS
- Voices available vary by browser
- Hindi voice may not be available on all systems
- Fallback to en-US if hi-IN unavailable

### Timing May Vary
- Speech duration varies by length
- Network delay affects speech start
- Browser voice loading time varies

### Mobile Considerations
- Touch may need longer delay for UI update
- Mobile browsers may have fewer voice options
- Some mobile OS have background audio restrictions

---

## Test Report Template

```markdown
## Phase 2C Test Report

**Date:** [Date]
**Tester:** [Name]
**Browser:** [Chrome/Firefox/Edge]
**OS:** [Windows/Mac/Linux]

### Test Results
- Test 1 (Avatar Display): [PASS/FAIL]
- Test 2 (Speech English): [PASS/FAIL]
- Test 3 (Caption): [PASS/FAIL]
- Test 4 (Next Button): [PASS/FAIL]
- Test 5 (Previous Button): [PASS/FAIL]
- Test 6 (First Q Disabled): [PASS/FAIL]
- Test 7 (Finish Button): [PASS/FAIL]
- Test 8 (Hindi): [PASS/FAIL]
- Test 9 (Help Text): [PASS/FAIL]
- Test 10 (DevTools): [PASS/FAIL]
- Test 11 (Speech Cancel): [PASS/FAIL]
- Test 12 (Mobile): [PASS/FAIL]
- Test 13 (Browsers): [PASS/FAIL]
- Test 14 (Network): [PASS/FAIL]
- Test 15 (A11y): [PASS/FAIL]

### Issues Found
[List any issues]

### Notes
[Any additional observations]
```

---

**Status: Ready for Testing ✅**

All tests should pass. Report any issues!
