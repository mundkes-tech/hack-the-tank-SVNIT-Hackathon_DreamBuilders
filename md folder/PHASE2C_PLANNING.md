# PHASE 2C - Video Recording & Upload

## Overview

PHASE 2C will implement the video recording interface shown as a placeholder in PHASE 2B.

### Requirements

When user clicks "Begin Interview", they should be able to:
1. Grant camera/microphone permissions
2. See live video preview from webcam
3. See start/stop recording buttons
4. Record their answer to each question
5. Preview the recording before saving
6. Option to retake if needed
7. Progress through all 4 questions

### User Flow

```
Interview Screen (with Video)
├── Webcam Permission Request
│   ├── User grants permission
│   └── Live camera feed shows
├── Record Answer
│   ├── Show "Start Recording" button
│   ├── User clicks (RED "Recording..." indicator)
│   ├── User speaks answer
│   ├── User clicks "Stop Recording"
│   └── Preview shows (user can hear/see)
├── Review Options
│   ├── "Save" → Move to next question
│   ├── "Retake" → Record again
│   └── "Skip" → Leave empty, move to next
└── Repeat for all 4 questions
```

### Technical Stack

#### Frontend (React)
- **MediaRecorder API** - Browser video recording
- **getUserMedia()** - Access camera/microphone
- **Blob** - Store recorded video data
- **Canvas** - Optional: add overlays/text

#### Files to Create/Modify
```
frontend/src/
├── pages/
│   └── CollectTestimonial.tsx
│       └── Add video recording component section
├── components/
│   └── VideoRecorder.tsx (NEW)
│       ├── Camera permission handling
│       ├── Live preview
│       ├── Recording controls
│       └── Preview playback
├── hooks/
│   └── useMediaRecorder.ts (NEW)
│       ├── Initialize MediaRecorder
│       ├── Handle start/stop
│       ├── Store blob data
│       └── Error handling
└── pages/
    └── CollectTestimonial.css
        └── Add video recording styles
```

### Component Architecture

```typescript
// New State Variables
const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
const [isRecording, setIsRecording] = useState(false);
const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');

// New Functions
const requestCameraPermission = async () => { }
const startRecording = () => { }
const stopRecording = () => { }
const retakeRecording = () => { }
const skipQuestion = () => { }

// Data Storage
answers: Array<{
  questionIndex: number;
  questionText: string;
  videoBlob: Blob | null;
  timestamp: Date;
}>
```

### Implementation Steps

#### Step 1: Create VideoRecorder Component
- Check camera/mic permission status
- Request permission if needed
- Show live video feed from webcam
- Display error if camera not available

#### Step 2: Implement Recording Controls
- "Start Recording" button
- Change to "Stop Recording" when active
- Show active recording indicator
- Clear button to cancel

#### Step 3: Add Preview Functionality
- Show recorded video in preview player
- Allow user to review
- "Save", "Retake", "Skip" buttons

#### Step 4: Handle Blob Storage
- Store recorded video blobs in state
- One blob per question
- Prepare for upload in Phase 3

#### Step 5: Update Interview State
- Track which questions have videos
- Show completion indicators
- Allow skipping questions

#### Step 6: Add Styling
- Video container styling
- Recording indicator animation
- Preview player styling
- Button states

### Code Example Structure

```typescript
<div className="interview-card">
  {/* Question Display (existing) */}
  <div className="question-section">
    <span className="question-badge">{currentQuestionIndex + 1}</span>
    <h2>{questions[currentQuestionIndex]}</h2>
  </div>

  {/* NEW: Video Recording Section */}
  <div className="video-recording-section">
    {!mediaStream && (
      <button onClick={requestCameraPermission}>
        🎥 Start Camera
      </button>
    )}
    
    {mediaStream && !isRecording && (
      <video
        ref={videoRef}
        autoPlay
        muted
        className="video-preview"
      />
    )}

    {mediaStream && !isRecording && (
      <button onClick={startRecording} className="btn-record">
        ⏺️ Start Recording
      </button>
    )}

    {isRecording && (
      <>
        <div className="recording-indicator">🔴 RECORDING...</div>
        <button onClick={stopRecording} className="btn-stop">
          ⏹️ Stop
        </button>
      </>
    )}

    {recordedBlob && (
      <div className="preview-section">
        <video src={videoPreviewUrl} controls />
        <button onClick={() => moveToNextQuestion()}>✓ Save</button>
        <button onClick={retakeRecording}>↺ Retake</button>
        <button onClick={skipQuestion}>→ Skip</button>
      </div>
    )}
  </div>

  {/* Navigation (existing) */}
  <div className="navigation-buttons">
    {currentQuestionIndex > 0 && (
      <button onClick={handlePreviousQuestion}>← Previous</button>
    )}
    {answers[currentQuestionIndex]?.videoBlob && (
      <span className="saved-indicator">✓ Video Saved</span>
    )}
    {currentQuestionIndex === questions.length - 1 ? (
      <button onClick={submitAnswers}>Finish Interview</button>
    ) : (
      <button onClick={handleNextQuestion}>Next →</button>
    )}
  </div>
</div>
```

### CSS Classes to Add

```css
/* Video Container */
.video-recording-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

/* Video Preview */
.video-preview {
  width: 100%;
  max-width: 400px;
  height: 300px;
  border-radius: 8px;
  background: #000;
}

/* Recording Indicator */
.recording-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 18px;
  font-weight: bold;
  color: #ef4444;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Preview Section */
.preview-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-section video {
  width: 100%;
  max-width: 400px;
  height: 300px;
  border-radius: 8px;
  margin: 0 auto;
}

/* Recording Buttons */
.btn-record {
  background: #ef4444;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.btn-record:hover {
  background: #dc2626;
}

.btn-stop {
  background: #f97316;
  color: white;
}

/* Saved Indicator */
.saved-indicator {
  color: #10b981;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

### Permissions & Error Handling

```typescript
// Camera Permission States
enum PermissionState {
  NOT_REQUESTED,  // Show request button
  GRANTED,        // Show camera feed
  DENIED,         // Show error message
  BLOCKED         // Camera blocked at OS level
}

// Error Messages
const ERRORS = {
  CAMERA_NOT_FOUND: "Camera not detected. Please check permissions.",
  MIC_NOT_FOUND: "Microphone not detected. Please check permissions.",
  PERMISSION_DENIED: "Camera/mic permission denied. Unable to record.",
  UNKNOWN_ERROR: "An error occurred. Please refresh and try again."
};
```

### Data Storage Format

```typescript
interface RecordedAnswer {
  questionIndex: number;
  questionText: string;
  videoBlob: Blob | null;  // null if skipped
  duration: number;         // seconds
  timestamp: Date;
  language: string;
}

// One per question, 4 total
const answers: RecordedAnswer[] = [
  {
    questionIndex: 0,
    questionText: "What problem did you face...",
    videoBlob: Blob,
    duration: 45.2,
    timestamp: Date,
    language: "english"
  },
  // ... 3 more
];
```

### Quality Considerations

#### Video Codec
- Use MediaRecorder default (usually VP8 or VP9)
- Audio codec: Opus
- Container: WebM (best browser support)

#### Quality Settings
- Frame rate: 30 FPS (default)
- Resolution: Camera native (usually 1080p or 720p)
- Bitrate: Auto (browser decides)

#### File Size
- Expected per question: 2-10 MB (varies by duration)
- 4 questions: 8-40 MB total
- Will be uploaded to backend in Phase 3

### Graceful Degradation

If camera not available:
```typescript
if (!mediaStream) {
  return (
    <div className="video-unavailable">
      <p>Camera not available</p>
      <button onClick={skipQuestion}>Continue Without Video</button>
    </div>
  );
}
```

### Browser Support

| Browser | Video Recording | Support |
|---------|-----------------|---------|
| Chrome  | ✅ Full         | Yes     |
| Firefox | ✅ Full         | Yes     |
| Safari  | ⚠️ Limited      | Partial |
| Edge    | ✅ Full         | Yes     |

### Fallback Strategy

If MediaRecorder not supported:
```typescript
if (!('MediaRecorder' in window)) {
  return <SkipVideoFallback />;
}
```

### Next Steps After Phase 2C

**Phase 3 (Transcription):**
- Upload video blobs to backend
- Extract audio from video
- Call Whisper API for transcription
- Store transcribed text in database

**Phase 4 (Highlights):**
- Send transcript + original prompt to Gemini
- Extract key highlights
- Rate highlights by importance
- Create summary

**Phase 5 (Instagram Reel):**
- Use highlights + video
- Generate short clips
- Add text overlays
- Process with FFmpeg
- Create shareable reel

---

## Development Checklist

- [ ] Create `components/VideoRecorder.tsx` component
- [ ] Create `hooks/useMediaRecorder.ts` custom hook
- [ ] Add camera permission handling
- [ ] Implement live video preview
- [ ] Add recording start/stop controls
- [ ] Create preview playback interface
- [ ] Add retry/skip options
- [ ] Store video blobs in state
- [ ] Add recording indicator animation
- [ ] Update CollectTestimonial.tsx to use VideoRecorder
- [ ] Add CSS styling for video section
- [ ] Handle permission denied errors
- [ ] Test on multiple browsers
- [ ] Test on mobile/tablet
- [ ] Verify video quality
- [ ] Test with various camera resolutions
- [ ] Document camera permission flow

---

**Status: Ready for Implementation**  
**Complexity: Medium (new APIs, state management)**  
**Est. Time: 3-4 hours**  
**Can Start After: PHASE 2B Complete ✅**
