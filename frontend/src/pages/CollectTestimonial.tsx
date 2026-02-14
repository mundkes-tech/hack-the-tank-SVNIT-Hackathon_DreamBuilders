import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getCampaign, generateQuestions } from '../services/api';
import Avatar from '../components/Avatar';
import './CollectTestimonial.css';

export default function CollectTestimonial() {
  const { campaignId } = useParams<{ campaignId: string }>();

  // Campaign Data
  const [campaign, setCampaign] = useState<{
    campaign_id: string;
    prompt: string;
    created_at: string;
  } | null>(null);

  // Loading campaign
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState('');

  // Interview Setup State
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [isPrepared, setIsPrepared] = useState(false);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Recording & Silence Detection State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  
  // Refs for immediate access (not subject to state closure issues)
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Refs for silence detection
  const silenceDetectionRef = useRef({
    animationFrameId: null as number | null,
    silenceStartTime: null as number | null,
    isActive: false,
  });

  // Fetch campaign on mount
  useEffect(() => {
    if (!campaignId) {
      setInitialError('No campaign ID provided');
      setInitialLoading(false);
      return;
    }

    const fetchCampaign = async () => {
      try {
        const data = await getCampaign(campaignId);
        setCampaign(data);
      } catch (err) {
        setInitialError(
          err instanceof Error ? err.message : 'Failed to load campaign'
        );
      } finally {
        setInitialLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  // Handle "Start Testimonial" click
  const handleStartTestimonial = async () => {
    if (!campaignId) return;

    setLoading(true);
    setError('');

    try {
      const result = await generateQuestions(campaignId, selectedLanguage);
      setQuestions(result.questions);
      setIsPrepared(true);
      setCurrentQuestionIndex(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate questions'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle "Begin Interview" click
  const handleBeginInterview = () => {
    setIsInterviewStarted(true);
  };

  /**
   * Get language code for Web Speech API
   * Maps our language selection to BCP-47 language tag
   */
  const getLanguageCode = (): string => {
    return selectedLanguage === 'hindi' ? 'hi-IN' : 'en-US';
  };

  /**
   * B. SILENCE DETECTION FLOW:
   * Speak the current question using Web Speech API
   * - Cancel any ongoing speech first
   * - Track speaking state to prevent silence detection during TTS
   * - Start silence detection ONLY after TTS finishes (utterance.onend)
   */
  const speakCurrentQuestion = () => {
    if (questions.length === 0 || currentQuestionIndex >= questions.length) {
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    console.log(`[TTS] Speaking question ${currentQuestionIndex + 1}: "${currentQuestion.substring(0, 50)}..."`);
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    stopSilenceDetection(); // Stop silence detection while we speak

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(currentQuestion);
    utterance.lang = getLanguageCode();
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Track speaking state
    utterance.onstart = () => {
      console.log('[TTS] Speech playing');
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('[TTS] Speech ended, starting silence detection');
      setIsSpeaking(false);
      // Start silence detection AFTER AI finishes speaking
      startSilenceDetection();
    };

    utterance.onerror = (event) => {
      console.error('[TTS] Speech synthesis error:', event.error);
      setIsSpeaking(false);
      // Even on error, start silence detection to keep interview flowing
      startSilenceDetection();
    };

    // Speak the question
    window.speechSynthesis.speak(utterance);
  };

  /**
   * Trigger speech when interview starts
   * Speak the first question automatically
   */
  useEffect(() => {
    if (isInterviewStarted && questions.length > 0 && !isSpeaking) {
      // Small delay to ensure smooth audio playback
      const timer = setTimeout(() => {
        speakCurrentQuestion();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isInterviewStarted, questions]);

  /**
   * Trigger speech when question index changes
   * Automatically speak new question
   */
  useEffect(() => {
    if (isInterviewStarted && questions.length > 0) {
      // Cancel previous speech before speaking next question
      window.speechSynthesis.cancel();
      
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        speakCurrentQuestion();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentQuestionIndex]);

  /**
   * Start recording when interview begins
   * Initialize camera, microphone, and Web Audio API for silence detection
   */
  useEffect(() => {
    if (isInterviewStarted && !isRecording) {
      startRecording();
    }

    // Cleanup: stop recording when interview ends or component unmounts
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isInterviewStarted]);

  /**
   * PHASE 3A: Upload video blob to backend for permanent storage
   * PHASE 3B: Receive Whisper transcription in response
   * - Sends videoBlob to POST /record/upload/{campaign_id}
   * - Multipart/form-data with file field: "video"
   * - Backend transcribes audio and returns transcript
   * - Handles success and error responses
   */
  const uploadVideo = async (blob: Blob, campaignId: string) => {
    try {
      console.log('[UPLOAD] Starting video upload...');
      
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('video', blob, 'response.webm');
      
      // Send POST request to backend
      const response = await fetch(`http://127.0.0.1:8001/record/upload/${campaignId}`, {
        method: 'POST',
        body: formData,
        // DO NOT set Content-Type header - browser will set it with boundary
      });
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[UPLOAD] Video uploaded and transcribed successfully:', result);
      
      // PHASE 3B: Display transcript to user
      alert(
        `✅ Testimonial recorded and transcribed!\n\n` +
        `Segments: ${result.segment_count}\n\n` +
        `Transcript:\n${result.transcript.substring(0, 200)}${result.transcript.length > 200 ? '...' : ''}`
      );
      
      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[UPLOAD] Video upload failed:', errorMsg);
      alert(`❌ Failed to save video: ${errorMsg}`);
    }
  };

  /**
   * Process recorded video blob when available
   * PHASE 3A: Upload to backend for permanent storage
   * PHASE 3B: Backend transcribes and returns text
   */
  useEffect(() => {
    if (videoBlob && campaignId) {
      // Log and upload
      console.log('[UPLOAD] Video blob ready:', {
        size: videoBlob.size,
        type: videoBlob.type,
        timestamp: new Date().toISOString(),
      });
      
      // Upload to backend (includes transcription)
      uploadVideo(videoBlob, campaignId);
    }
  }, [videoBlob, campaignId]);

  /**
   * Start video + audio recording using MediaRecorder API
   * A. MEDIA PERMISSION:
   * - Requests camera and microphone with { video: true, audio: true }
   * - Verifies audio track exists
   * - Sets up Web Audio API for frequency analysis
   */
  const startRecording = async () => {
    try {
      console.log('[RECORDING] Starting recording...');
      
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Verify audio track exists
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error('[RECORDING] ERROR: No audio tracks found in stream');
        throw new Error('Microphone stream has no audio track');
      }
      console.log(`[RECORDING] Audio track found. Sample rate: ${audioTracks[0].getSettings().sampleRate}Hz`);

      setMediaStream(stream);

      // Create MediaRecorder for video + audio
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      const chunks: Blob[] = [];
      let totalDataSize = 0;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          totalDataSize += event.data.size;
          console.log(`[RECORDING] Data chunk received: ${event.data.size} bytes | Total: ${totalDataSize} bytes`);
        }
      };

      recorder.onstop = () => {
        console.log('[RECORDING] MediaRecorder stopped, creating blob...');
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        console.log(`[RECORDING] Video blob created: ${blob.size} bytes`);
      };

      recorder.onerror = (event) => {
        console.error('[RECORDING] MediaRecorder error:', event.error);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      console.log('[RECORDING] MediaRecorder started');

      // C. AUDIO ANALYSER SETUP:
      // - Create Web Audio API context
      // - Set up analyser with fftSize 2048
      // - Connect microphone stream to analyser
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      console.log(`[RECORDING] AudioContext created. Sample rate: ${audioCtx.sampleRate}Hz`);
      
      setAudioContext(audioCtx);

      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 2048;
      console.log('[RECORDING] Analyser node created with fftSize 2048');

      // Connect microphone to analyser
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyserNode);
      console.log('[RECORDING] Microphone stream connected to analyser');

      // Store in ref for immediate access (avoids closure issues with state)
      analyserRef.current = analyserNode;
    } catch (err) {
      console.error('[RECORDING] Failed to start recording:', err);
      alert('Camera/microphone access denied. Please allow access to continue.');
      // Allow interview to continue without recording
      setIsRecording(false);
    }
  };

  /**
   * Stop video + audio recording
   * - Stops MediaRecorder
   * - Closes all media streams
   * - Closes AudioContext
   * - Stops silence detection
   */
  const stopRecording = () => {
    console.log('[RECORDING] Stopping recording...');
    
    // Stop silence detection first
    stopSilenceDetection();

    // Stop MediaRecorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      console.log('[RECORDING] MediaRecorder stopped');
    }

    // Stop all tracks in media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`[RECORDING] Track stopped: ${track.kind}`);
      });
      setMediaStream(null);
    }

    // Close audio context
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      console.log('[RECORDING] AudioContext closed');
    }
    setAudioContext(null);
    analyserRef.current = null;
    setIsRecording(false);

    console.log('[RECORDING] Recording stopped completely');
  };

  /**
   * D. SILENCE LOGIC:
   * - Start monitoring microphone for silence ONLY after TTS finishes
   * - SILENCE_THRESHOLD = 12 (frequency average)
   * - SILENCE_DURATION = 2000ms
   * - Reset silence counter when user speaks
   * - Auto-advance to next question or finish
   */
  const startSilenceDetection = () => {
    // Don't start if analyser not ready or already listening
    // Use analyserRef.current for immediate access (not state)
    if (!analyserRef.current || silenceDetectionRef.current.isActive) {
      console.log('[SILENCE] Cannot start - analyser:', !!analyserRef.current, 'already active:', silenceDetectionRef.current.isActive);
      return;
    }

    console.log('[SILENCE] Starting silence detection...');
    silenceDetectionRef.current.isActive = true;
    silenceDetectionRef.current.silenceStartTime = null;

    const SILENCE_THRESHOLD = 18; // Frequency bin magnitude threshold (detects actual speech)
    const SILENCE_DURATION = 2000; // 2 seconds
    let consecutiveFrames = 0;
    const requiredFrames = Math.ceil(SILENCE_DURATION / 16.67); // ~120 frames at 60fps

    const detectSilence = () => {
      // Read frequency data from analyser using ref (not state)
      if (!analyserRef.current) {
        console.log('[SILENCE] Analyser lost, stopping detection');
        stopSilenceDetection();
        return;
      }

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average frequency magnitude
      const average =
        dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;

      // Debug logging (every 30 frames = ~500ms)
      if (consecutiveFrames % 30 === 0) {
        console.log(`[SILENCE] Avg freq: ${average.toFixed(2)}, threshold: ${SILENCE_THRESHOLD}, frames: ${consecutiveFrames}/${requiredFrames}`);
      }

      if (average < SILENCE_THRESHOLD) {
        // User is silent - increment frame counter
        consecutiveFrames++;

        if (consecutiveFrames >= requiredFrames) {
          // 2 seconds of silence detected!
          console.log('[SILENCE] 2 seconds of silence detected! Moving to next question.');
          stopSilenceDetection();
          moveToNextQuestion();
          return;
        }
      } else {
        // User is speaking - reset counter
        if (consecutiveFrames > 0) {
          console.log(`[SILENCE] Speech detected, resetting counter (was ${consecutiveFrames})`);
        }
        consecutiveFrames = 0;
      }

      // Continue monitoring
      if (silenceDetectionRef.current.isActive) {
        const frameId = requestAnimationFrame(detectSilence);
        silenceDetectionRef.current.animationFrameId = frameId;
      }
    };

    // Start the detection loop
    const frameId = requestAnimationFrame(detectSilence);
    silenceDetectionRef.current.animationFrameId = frameId;
    console.log('[SILENCE] Detection loop started');
  };

  /**
   * Stop silence detection and cleanup
   * - Cancels animationFrame loop
   * - Cleans up refs
   * - Prevents memory leaks
   */
  const stopSilenceDetection = () => {
    if (!silenceDetectionRef.current.isActive) {
      return;
    }

    console.log('[SILENCE] Stopping silence detection...');
    silenceDetectionRef.current.isActive = false;
    silenceDetectionRef.current.silenceStartTime = null;

    if (silenceDetectionRef.current.animationFrameId !== null) {
      cancelAnimationFrame(silenceDetectionRef.current.animationFrameId);
      silenceDetectionRef.current.animationFrameId = null;
      console.log('[SILENCE] Animation frame cancelled');
    }

    console.log('[SILENCE] Detection stopped');
  };

  /**
   * E. QUESTION PROGRESSION:
   * - Move to next question if not last
   * - Stop recording if last question + finish
   * - Ensure no duplicate calls
   */
  const moveToNextQuestion = () => {
    const totalQuestions = questions.length;
    const nextIndex = currentQuestionIndex + 1;

    console.log(`[PROGRESSION] Current: Q${currentQuestionIndex + 1}/${totalQuestions}, Next: Q${nextIndex + 1}/${totalQuestions}`);

    if (nextIndex < totalQuestions) {
      // Not last question - advance
      console.log(`[PROGRESSION] Advancing to question ${nextIndex + 1}`);
      setCurrentQuestionIndex(nextIndex);
    } else {
      // Last question completed
      console.log('[PROGRESSION] All questions completed. Stopping recording and finishing interview.');
      stopRecording();
      console.log('[PROGRESSION] Recording stopped');
      
      // Wait a moment for recording to finalize
      setTimeout(() => {
        console.log('[PROGRESSION] Interview complete');
        setIsInterviewStarted(false);
        setIsPrepared(false);
        setQuestions([]);
      }, 500);
    }
  };

  // Show loading while fetching campaign
  if (initialLoading) {
    return (
      <div className="container">
        <div className="card loading-card">
          <div className="spinner"></div>
          <p>Loading campaign...</p>
        </div>
      </div>
    );
  }

  // Show error if campaign fetch failed
  if (initialError || !campaign) {
    return (
      <div className="container">
        <div className="card error-card">
          <div className="error-icon">⚠️</div>
          <h1>Campaign Not Found</h1>
          <p>{initialError}</p>
          <p className="help-text">
            Please check the link and try again, or contact the business owner.
          </p>
        </div>
      </div>
    );
  }

  // Initial screen: Show campaign details + language selector
  if (!isPrepared && !loading) {
    return (
      <div className="container">
        <div className="card testimonial-card">
          <div className="header">
            <h1>Share Your Testimonial</h1>
            <p className="subtitle">Your feedback matters!</p>
          </div>

          <div className="campaign-info">
            <div className="info-badge">
              <span className="badge-label">About:</span>
              <span className="badge-value">{campaign.prompt}</span>
            </div>
          </div>

          <div className="setup-section">
            <h2>Let's Get Started</h2>
            <p className="setup-description">
              We'll use AI to guide you through 4 simple questions. Choose your preferred language and begin.
            </p>

            <div className="language-selector">
              <label htmlFor="language">Pick a language:</label>
              <select
                id="language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={loading}
              >
                <option value="english">English</option>
                <option value="hindi">हिन्दी (Hindi)</option>
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              onClick={handleStartTestimonial}
              disabled={loading}
              className="btn-primary btn-large"
            >
              {loading ? 'Loading Questions...' : 'Start Testimonial'}
            </button>
          </div>

          <div className="campaign-details">
            <p className="detail-text">
              <strong>Campaign ID:</strong> {campaign.campaign_id}
            </p>
            <p className="detail-text">
              <strong>Created:</strong> {new Date(campaign.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading screen: AI preparing questions
  if (loading) {
    return (
      <div className="container">
        <div className="card loading-card">
          <div className="spinner-large"></div>
          <h2>AI is preparing your personalized questions...</h2>
          <p>Just a moment while we set up your interview.</p>
        </div>
      </div>
    );
  }

  // Prepared screen: Show "Your AI Host is Ready"
  if (isPrepared && !isInterviewStarted) {
    return (
      <div className="container">
        <div className="card ready-card">
          <div className="ready-icon">🤖</div>
          <h1>Your AI Host is Ready</h1>
          <p className="ready-subtitle">
            Click begin to start your testimonial interview.
          </p>

          <div className="prepare-info">
            <p className="info-text">Language: <strong>{selectedLanguage === 'english' ? 'English' : 'हिन्दी'}</strong></p>
            <p className="info-text">Questions: <strong>{questions.length}</strong></p>
          </div>

          <button
            onClick={handleBeginInterview}
            className="btn-primary btn-large"
          >
            Begin Interview
          </button>

          <button
            onClick={() => {
              setIsPrepared(false);
              setQuestions([]);
              setError('');
            }}
            className="btn-secondary"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Interview started: Show avatar + caption
  if (isInterviewStarted && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const questionNumber = currentQuestionIndex + 1;
    const totalQuestions = questions.length;

    return (
      <div className="container">
        <div className="card interview-card interview-avatar-mode">
          <div className="interview-header">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((questionNumber) / totalQuestions) * 100}%`,
                }}
              ></div>
            </div>
            <p className="progress-text">
              Question {questionNumber} of {totalQuestions}
            </p>
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span className="recording-text">RECORDING</span>
              </div>
            )}
          </div>

          {/* Avatar section - center focus */}
          <Avatar isSpeaking={isSpeaking} />

          {/* Video preview - camera feed while recording */}
          {isRecording && mediaStream && (
            <video
              autoPlay
              muted
              className="video-preview"
              ref={(video) => {
                if (video && !video.srcObject) {
                  video.srcObject = mediaStream;
                }
              }}
            ></video>
          )}

          {/* Subtle caption at bottom while speaking */}
          {isSpeaking && (
            <div className="speaking-caption">
              <p>{currentQuestion}</p>
            </div>
          )}

          {/* Navigation and control buttons - MINIMAL */}
          <div className="interview-controls">
            {/* Previous button (hidden on first question) */}
            {currentQuestionIndex > 0 && (
              <button
                onClick={() => {
                  console.log('[UI] Going to previous question');
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                  stopSilenceDetection();
                  setCurrentQuestionIndex(currentQuestionIndex - 1);
                }}
                className="btn-secondary"
              >
                ← Previous
              </button>
            )}

            {/* Emergency stop button (only on last question) */}
            {currentQuestionIndex === totalQuestions - 1 && (
              <button
                onClick={() => {
                  console.log('[UI] Emergency finish clicked');
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                  stopRecording();
                  setIsInterviewStarted(false);
                  setIsPrepared(false);
                  setQuestions([]);
                }}
                className="btn-danger"
              >
                🛑 Finish Now
              </button>
            )}
          </div>

          {/* Help text */}
          <div className="interview-footer">
            <p className="help-text">
              � Your response is being recorded. Silence for 2 seconds will automatically advance to the next question.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}
