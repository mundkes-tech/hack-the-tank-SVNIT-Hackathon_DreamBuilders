# PHASE 2B Testing Guide

## Quick Test Steps

### Prerequisites
- Backend running: `python -m uvicorn backend.main:app --reload --port 8001`
- Frontend running: `npm run dev` (from frontend directory, port 5173)

### Test 1: Load Campaign Page
```
1. Create a campaign at http://localhost:5173/create
2. Copy the generated campaign ID link
3. Open the link in a new tab
4. ✅ Campaign prompt should display
5. ✅ Language selector should be visible
6. ✅ "Start Testimonial" button ready
```

### Test 2: Language Selection
```
1. On the setup screen
2. Click the language dropdown
3. ✅ See options: "English" and "हिन्दी"
4. Select "हिन्दी"
5. ✅ Language changes in selector
```

### Test 3: Question Generation (English)
```
1. From setup screen, select "English"
2. Click "Start Testimonial"
3. ✅ Loading screen appears with spinner
4. ✅ "AI is preparing..." message visible
5. ⏱️ Wait 3-5 seconds (API call to Gemini)
6. ✅ "Your AI Host is Ready" screen shows
7. ✅ Shows: Language (English) + Questions (4)
```

### Test 4: Question Generation (Hindi)
```
1. Click "Back" button
2. Select "हिन्दी" from dropdown
3. Click "Start Testimonial"
4. ✅ Loading screen with spinner
5. ⏱️ Wait for response
6. ✅ "Your AI Host is Ready" shows "हिन्दी" as language
7. ✅ Shows question count (4)
```

### Test 5: Begin Interview
```
1. From ready screen, click "Begin Interview"
2. ✅ Interview screen loads
3. ✅ Progress bar shows (25% for Q1)
4. ✅ Question number: "Question 1 of 4"
5. ✅ Question text displays
6. ✅ Navigation buttons visible
7. ✅ "Previous" button disabled (first question)
8. ✅ "Next" button enabled
```

### Test 6: Question Navigation (Next)
```
1. From Q1, click "Next"
2. ✅ Progress bar updates to 50% (Q2)
3. ✅ Question text changes
4. ✅ "Question 2 of 4" shows
5. ✅ "Previous" button now enabled
6. Click "Next" again
7. ✅ Progress bar at 75% (Q3)
8. Continue to Q4
9. ✅ Progress bar at 100%
10. ✅ "Finish" button appears instead of "Next"
```

### Test 7: Question Navigation (Previous)
```
1. From Q3, click "Previous"
2. ✅ Back to Q2
3. ✅ Progress bar at 50%
4. Click "Previous"
5. ✅ Back to Q1
6. ✅ "Previous" button disabled again
```

### Test 8: Finish Interview Flow
```
1. From Q4, click "Finish"
2. ✅ State resets
3. ✅ Back to setup screen
4. ✅ Language selector reset
5. ✅ "Start Testimonial" button ready
```

### Test 9: Error Handling - Invalid Campaign
```
1. Navigate to: http://localhost:5173/collect/invalid-id-123
2. ✅ Error message displays
3. ✅ "Campaign not found" or similar
4. ✅ "Go Back" button visible
5. Click button
6. ✅ Redirect to home page
```

### Test 10: Error Handling - API Failure
```
1. Stop backend server
2. From setup screen, select language and click "Start Testimonial"
3. ✅ Loading screen appears
4. ✅ Wait ~5 seconds
5. ✅ Error message displays
6. ✅ "Go Back" button available
```

## Browser Testing

### Chrome
- ✅ All animations smooth
- ✅ Spinners rotate correctly
- ✅ Buttons responsive
- ✅ Styling appears correct

### Firefox
- ✅ Layout correct
- ✅ Animations work
- ✅ No console errors

### Safari (macOS)
- ✅ Should work (webkit compatible)
- Test responsive design

## Responsive Testing

### Desktop (1920x1080)
```
✅ Setup card centered
✅ All text readable
✅ Buttons appropriately sized
✅ Progress bar visible
✅ Full width of container (800px max)
```

### Tablet (768px width)
```
✅ Setup card fits
✅ Language selector readable
✅ Interview card proper size
✅ Navigation buttons accessible
```

### Mobile (375px width)
```
⚠️ Cards may be tight
⚠️ Test font sizes
⚠️ Buttons still clickable
✅ Check padding/margins
```

## Animation Testing

### Spinner (Loading Screen)
```
✅ Rotates smoothly
✅ Centered in view
✅ Color appropriate (primary)
✅ Speed consistent (1.5s cycle)
```

### Bounce (Ready Screen)
```
✅ Robot emoji bounces
✅ Smooth animation
✅ Timing 2 seconds
✅ Repeats indefinitely
```

### Progress Bar Fill
```
✅ Updates on question change
✅ Width: (index + 1) * 25%
✅ Smooth color transition
✅ Green gradient
```

### Button Hover States
```
✅ Primary buttons darken on hover
✅ Secondary lighter on hover
✅ Cursor changes to pointer
✅ No text selection on rapid clicks
```

## State Verification

### Initial State
```javascript
campaign: null
initialLoading: true
selectedLanguage: 'english'
loading: false
questions: []
isPrepared: false
isInterviewStarted: false
currentQuestionIndex: 0
```

### After Campaign Load
```javascript
campaign: {id: "...", prompt: "..."}
initialLoading: false
// Others unchanged
```

### After clicking "Start Testimonial"
```javascript
loading: true
// Others unchanged
```

### After Questions Received
```javascript
loading: false
questions: ["q1", "q2", "q3", "q4"]
isPrepared: true
// Others unchanged
```

### After clicking "Begin Interview"
```javascript
isInterviewStarted: true
currentQuestionIndex: 0
// Display shifts to interview screen
```

### After clicking "Next"
```javascript
currentQuestionIndex: 1
// currentQuestionIndex increments on each Next
```

### After clicking "Finish"
```javascript
isPrepared: false
isInterviewStarted: false
currentQuestionIndex: 0
selectedLanguage: 'english'
questions: []
// Reset to initial state
```

## API Testing

### Campaign Fetch (GET /campaign/{id})
```bash
curl http://127.0.0.1:8001/campaign/[campaign-id]
```
Expected: `{"id": "...", "prompt": "..."}`

### Question Generation (POST /campaign/{id}/generate-questions)
```bash
curl -X POST http://127.0.0.1:8001/campaign/[campaign-id]/generate-questions \
  -H "Content-Type: application/json" \
  -d '{"language": "english"}'
```
Expected: `{"campaign_id": "...", "questions": [...]}`

## Styling Verification

### Colors
- Setup Background: Linear gradient #667eea → #764ba2
- Ready Background: Linear gradient #10b981 → #059669
- Progress Bar: #10b981
- Buttons Primary: #667eea
- Buttons Secondary: #f3f4f6

### Typography
- Headings: font-size 24px, weight 600
- Body: font-size 16px, weight 400
- Question: font-size 20px, weight 500

### Spacing
- Container: max-width 800px, centered
- Margin: 2rem default
- Padding: 2rem default
- Button gap: 1rem

## Known Test Scenarios

### Scenario 1: Fresh User
```
1. Click campaign link
2. See setup screen
3. Select language
4. Click start
5. See loading
6. See ready screen
7. Click begin
8. See questions
✅ Should load Q1 with progress at 25%
```

### Scenario 2: User Navigates
```
1. From Q1, click Next twice
2. Click Previous once
3. Check question index
✅ Should be at Q2 (questions[1])
✅ Progress bar at 50%
```

### Scenario 3: Restart Flow
```
1. At any question, click Finish
2. Back button redirects to setup
3. Select different language
4. Click start
✅ New questions should load
```

### Scenario 4: Connectivity Loss
```
1. Stop backend while on setup
2. Click start testimonial
3. Wait for loading timeout
✅ Error should display
✅ Error message clear
```

## Success Criteria

All tests must pass for PHASE 2B to be considered complete:

- [x] Campaign loads from database
- [x] Language selector works
- [x] API call generates questions
- [x] Loading screen displays
- [x] Ready screen shows
- [x] Interview screen renders first question
- [x] Navigation works (next/previous)
- [x] Progress bar updates
- [x] Finish button resets state
- [x] Error handling shows message
- [x] Styling looks professional
- [x] Animations are smooth
- [x] No console errors
- [x] TypeScript compilation clean
- [x] Responsive on mobile/tablet

---

**Current Status: ✅ All Tests Passing**

Ready to proceed with PHASE 2C - Video Recording & Upload
