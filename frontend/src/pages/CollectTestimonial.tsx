import { useEffect, useState } from 'react';
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
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [silenceStartTime, setSilenceStartTime] = useState<number | null>(null);
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);
  // Store recorded video for Phase 3 (whisper transcription)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

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
   * Speak the current question using Web Speech API
   * Always cancels previous speech before starting new one
   * After speech ends, start silence detection
   */
  const speakCurrentQuestion = () => {
    if (questions.length === 0 || currentQuestionIndex >= questions.length) {
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(currentQuestion);
    utterance.lang = getLanguageCode();
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Track speaking state
    utterance.onstart = () => {
      setIsSpeaking(true);
      // Stop silence detection while AI is speaking
      stopSilenceDetection();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      // Start silence detection after AI finishes speaking
      startSilenceDetection();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      // Even on error, start silence detection
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
   * Process recorded video blob when available
   * In Phase 3, this blob will be sent to Whisper for transcription
   */
  useEffect(() => {
    if (videoBlob) {
      // Log for debugging
      console.log('Video recording saved:', {
        size: videoBlob.size,
        type: videoBlob.type,
        timestamp: new Date().toISOString(),
      });
      // TODO: Phase 3 - Send videoBlob to backend for whisper transcription
    }
  }, [videoBlob]);

  /**
   * Start video + audio recording using MediaRecorder API
   */
  const startRecording = async () => {
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setMediaStream(stream);

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob); // Store for Phase 3 (whisper transcription)
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);

      // Create Web Audio API context for silence detection
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      setAudioContext(audioCtx);

      // Create analyser node
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 2048;

      // Connect microphone to analyser
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyserNode);

      setAnalyser(analyserNode);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Camera/microphone access denied. Cannot record.');
    }
  };

  /**
   * Stop video + audio recording
   */
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }

    // Stop silence detection
    stopSilenceDetection();
  };

  /**
   * Start monitoring microphone for silence
   * Only call after AI stops speaking (utterance.onend)
   * Silence threshold: average amplitude < 12
   * Silence duration: 2000ms
   */
  const startSilenceDetection = () => {
    if (!analyser) return;

    setSilenceStartTime(null);

    const SILENCE_THRESHOLD = 12;
    const SILENCE_DURATION = 2000; // 2 seconds

    const detectSilence = () => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      // Calculate average frequency
      const average =
        dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;

      if (average < SILENCE_THRESHOLD) {
        // User is silent
        if (silenceStartTime === null) {
          setSilenceStartTime(Date.now());
        } else if (Date.now() - silenceStartTime >= SILENCE_DURATION) {
          // 2 seconds of silence detected, move to next question
          stopSilenceDetection();
          moveToNextQuestion();
          return;
        }
      } else {
        // User is speaking, reset silence counter
        setSilenceStartTime(null);
      }

      // Continue monitoring
      const frameId = requestAnimationFrame(detectSilence);
      setAnimationFrameId(frameId);
    };

    const frameId = requestAnimationFrame(detectSilence);
    setAnimationFrameId(frameId);
  };

  /**
   * Stop silence detection and cancel animation frame
   */
  const stopSilenceDetection = () => {
    setSilenceStartTime(null);

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      setAnimationFrameId(null);
    }
  };

  /**
   * Move to next question or finish if on last question
   */
  const moveToNextQuestion = () => {
    const totalQuestions = questions.length;

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // On last question, stop recording and finish
      stopRecording();
      setIsInterviewStarted(false);
      setIsPrepared(false);
      setQuestions([]);
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

          {/* Navigation and control buttons */}
          <div className="interview-controls">
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(currentQuestionIndex - 1);
                }
              }}
              disabled={currentQuestionIndex === 0}
              className="btn-secondary"
            >
              ← Previous Question
            </button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                  stopSilenceDetection();
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                }}
                className="btn-primary"
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                  stopRecording();
                  setIsInterviewStarted(false);
                  setIsPrepared(false);
                  setQuestions([]);
                }}
                className="btn-success"
              >
                Finish Interview
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
