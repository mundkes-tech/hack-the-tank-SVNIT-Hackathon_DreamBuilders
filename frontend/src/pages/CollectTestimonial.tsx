import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  generateHighlights,
  generateQuestions,
  getCampaign,
  generateReel,
  saveEditedHighlights,
  uploadCampaignLogo,
  uploadCampaignMusic,
} from '../services/api';
import type { Highlight } from '../services/api';
import Avatar from '../components/Avatar';
import './CollectTestimonial.css';

export default function CollectTestimonial() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

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
  const [isCompleted, setIsCompleted] = useState(false);

  // Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Recording & Silence Detection State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [editableHighlights, setEditableHighlights] = useState<Highlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsError, setHighlightsError] = useState('');
  const [isSavingHighlights, setIsSavingHighlights] = useState(false);
  const [highlightsSaveMessage, setHighlightsSaveMessage] = useState('');

  // Reel Generation State (PHASE 3D)
  const [isGeneratingReel, setIsGeneratingReel] = useState(false);
  const [reelPath, setReelPath] = useState('');
  const [reelError, setReelError] = useState('');

  // Phase A Branding State
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoMessage, setLogoMessage] = useState('');
  const [logoError, setLogoError] = useState('');

  // Phase B Music State
  const [selectedMusicFile, setSelectedMusicFile] = useState<File | null>(null);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [musicMessage, setMusicMessage] = useState('');
  const [musicError, setMusicError] = useState('');
  const [addBackgroundMusic, setAddBackgroundMusic] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.2);
  const [duckingStrength, setDuckingStrength] = useState(0.35);
  const [callConsentAccepted, setCallConsentAccepted] = useState(false);
  
  // Reel Customization State (PHASE 3E)
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait' | 'square'>('landscape');
  const [addSubtitles, setAddSubtitles] = useState(true);
  
  // Permission Error State
  const [permissionError, setPermissionError] = useState('');
  const [permissionRetryCount, setPermissionRetryCount] = useState(0);
  
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

  useEffect(() => {
    if (campaign?.prompt) {
      document.title = `Collect Testimonial • ${campaign.prompt.slice(0, 40)} • DreamBuilders`;
      return;
    }
    document.title = 'Collect Testimonial • DreamBuilders';
  }, [campaign]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Handle "Start Testimonial" click
  const handleStartTestimonial = async () => {
    if (!campaignId) return;

    setLoading(true);
    setError('');
    setIsCompleted(false);
    setIsUploading(false);
    setUploadError('');
    setHighlights([]);
    setEditableHighlights([]);
    setHighlightsLoading(false);
    setHighlightsError('');
    setHighlightsSaveMessage('');
    setVideoBlob(null);

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
    if (!callConsentAccepted) return;
    setIsCompleted(false);
    setIsInterviewStarted(true);
  };

  /**
   * Get language code for Web Speech API
   * Maps our language selection to BCP-47 language tag
   */
  const getLanguageCode = (): string => {
    return selectedLanguage === 'hindi' ? 'hi-IN' : 'en-US';
  };

  const pickBestVoice = (voices: SpeechSynthesisVoice[], lang: string) => {
    const normalizedLang = lang.toLowerCase();
    const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(normalizedLang));
    if (matching.length === 0) return undefined;

    const preferred = matching.find((voice) =>
      /google|microsoft|neural|natural|premium/i.test(voice.name)
    );

    return preferred || matching[0];
  };

  const formatTimestamp = (seconds: number): string => {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    utterance.rate = 0.92;
    utterance.pitch = 0.98;
    utterance.volume = 1.0;

    const selectedVoice = pickBestVoice(availableVoices, utterance.lang);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

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
      setIsUploading(true);
      setUploadError('');
      setHighlightsError('');
      
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

      setIsUploading(false);
      setHighlightsLoading(true);

      try {
        const highlightsResult = await generateHighlights(campaignId);
        const generatedHighlights = highlightsResult.highlights || [];
        setHighlights(generatedHighlights);
        setEditableHighlights(generatedHighlights);
      } catch (highlightErr) {
        const message = highlightErr instanceof Error
          ? highlightErr.message
          : 'Failed to generate highlights';
        setHighlightsError(message);
      } finally {
        setHighlightsLoading(false);
      }

      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[UPLOAD] Video upload failed:', errorMsg);
      setUploadError(`Failed to save video: ${errorMsg}`);
      setIsUploading(false);
    }
  };

  /**
   * PHASE 3D: Generate final testimonial reel from highlights
   * Uses MoviePy backend to concatenate highlight clips
   */
  const handleGenerateReel = async () => {
    if (!campaignId) return;
    
    try {
      console.log('[REEL] Starting reel generation with options:', { aspectRatio, addSubtitles });
      setIsGeneratingReel(true);
      setReelError('');

      if (editableHighlights.length > 0) {
        await saveEditedHighlights(campaignId, editableHighlights);
      }
      
      const response = await generateReel(campaignId, {
        aspect_ratio: aspectRatio,
        add_subtitles: addSubtitles,
        add_background_music: addBackgroundMusic,
        bgm_volume: bgmVolume,
        ducking_strength: duckingStrength
      });
      
      console.log('[REEL] Reel generated successfully:', response);
      setReelPath(response.reel_path);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate reel';
      console.error('[REEL] Reel generation failed:', errorMsg);
      setReelError(errorMsg);
    } finally {
      setIsGeneratingReel(false);
    }
  };

  const handleHighlightTimeChange = (index: number, field: 'start' | 'end', value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return;

    setHighlightsSaveMessage('');
    setEditableHighlights((prev) => prev.map((highlight, idx) => {
      if (idx !== index) return highlight;
      return {
        ...highlight,
        [field]: Math.max(0, parsedValue)
      };
    }));
  };

  const moveHighlight = (index: number, direction: 'up' | 'down') => {
    setHighlightsSaveMessage('');
    setEditableHighlights((prev) => {
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const clone = [...prev];
      [clone[index], clone[target]] = [clone[target], clone[index]];
      return clone;
    });
  };

  const removeHighlight = (index: number) => {
    setHighlightsSaveMessage('');
    setEditableHighlights((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addHighlight = () => {
    setHighlightsSaveMessage('');
    const lastEnd = editableHighlights.length > 0
      ? editableHighlights[editableHighlights.length - 1].end
      : 0;

    setEditableHighlights((prev) => ([
      ...prev,
      {
        text: 'Manual clip',
        start: lastEnd,
        end: lastEnd + 4,
        reason: 'Added manually'
      }
    ]));
  };

  const handleSaveEditedHighlights = async () => {
    if (!campaignId || editableHighlights.length === 0) {
      setHighlightsError('Add at least one clip before saving edits.');
      return;
    }

    const invalidClip = editableHighlights.find((clip) => clip.end <= clip.start);
    if (invalidClip) {
      setHighlightsError('Each clip must have end time greater than start time.');
      return;
    }

    try {
      setIsSavingHighlights(true);
      setHighlightsError('');
      const response = await saveEditedHighlights(campaignId, editableHighlights);
      setEditableHighlights(response.highlights || []);
      setHighlightsSaveMessage('✅ Clip edits saved. Reel will use this order and timing.');
    } catch (err) {
      setHighlightsError(err instanceof Error ? err.message : 'Failed to save edited highlights');
    } finally {
      setIsSavingHighlights(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!campaignId || !selectedLogoFile) return;

    try {
      setIsUploadingLogo(true);
      setLogoError('');
      setLogoMessage('');
      const result = await uploadCampaignLogo(campaignId, selectedLogoFile);
      setLogoMessage(`✅ ${result.message}`);
      setSelectedLogoFile(null);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleMusicUpload = async () => {
    if (!campaignId || !selectedMusicFile) return;

    try {
      setIsUploadingMusic(true);
      setMusicError('');
      setMusicMessage('');
      const result = await uploadCampaignMusic(campaignId, selectedMusicFile);
      setMusicMessage(`✅ ${result.message}`);
      setSelectedMusicFile(null);
      setAddBackgroundMusic(true);
    } catch (err) {
      setMusicError(err instanceof Error ? err.message : 'Failed to upload background music');
    } finally {
      setIsUploadingMusic(false);
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
      
      // Handle different permission errors
      let errorMsg = 'Camera/microphone access denied';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          errorMsg = 'Permission denied. Please check browser settings and click "Allow" for camera & microphone.';
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No camera/microphone found. Please check your device.';
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'Camera/microphone is in use by another application. Please close other apps.';
        }
      }
      
      setPermissionError(errorMsg);
      setPermissionRetryCount(prev => prev + 1);
      setIsRecording(false);
    }
  };

  /**
   * Retry camera/microphone permission after user fixes browser settings
   */
  const retryPermission = async () => {
    console.log('[PERMISSION] Retrying camera/microphone access...');
    setPermissionError('');
    await startRecording();
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
        setIsCompleted(true);
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

  if (isCompleted) {
    return (
      <div className="container">
        <div className="card results-card">
          <h1>Thanks for sharing your testimonial!</h1>
          <p className="subtitle">Your review has been captured. We’re now extracting the best moments.</p>

          <div className="result-status">
            {isUploading && (
              <div className="status-pill">Uploading video...</div>
            )}
            {!isUploading && !uploadError && (
              <div className="status-pill status-success">Video saved</div>
            )}
            {uploadError && (
              <div className="error-message">{uploadError}</div>
            )}
          </div>

          <div className="highlights-section">
            <h2>AI Highlights</h2>
            {highlightsLoading && (
              <p className="muted">Generating highlights...</p>
            )}
            {highlightsError && (
              <div className="error-message">{highlightsError}</div>
            )}
            {!highlightsLoading && !highlightsError && highlights.length === 0 && (
              <p className="muted">No highlights available yet.</p>
            )}
            {highlights.map((highlight, index) => (
              <div className="highlight-item" key={`${highlight.start}-${highlight.end}-${index}`}>
                <div className="highlight-meta">
                  Clip {index + 1} · {formatTimestamp(highlight.start)} - {formatTimestamp(highlight.end)}
                </div>
                <div className="highlight-text">"{highlight.text}"</div>
                <div className="highlight-reason">{highlight.reason}</div>
              </div>
            ))}
          </div>

          {!highlightsLoading && !highlightsError && editableHighlights.length > 0 && (
            <div className="highlights-section">
              <h2>Manual Clip Editor</h2>
              <p className="muted">Adjust start/end, reorder clips, remove clips, or add a new one.</p>

              {editableHighlights.map((clip, index) => (
                <div className="highlight-item" key={`editable-${index}-${clip.start}-${clip.end}`}>
                  <div className="highlight-meta">Editable Clip {index + 1}</div>
                  <div className="clip-editor-row">
                    <label>
                      Start (sec)
                      <input
                        className="clip-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={Number.isFinite(clip.start) ? clip.start : 0}
                        onChange={(e) => handleHighlightTimeChange(index, 'start', e.target.value)}
                      />
                    </label>
                    <label>
                      End (sec)
                      <input
                        className="clip-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={Number.isFinite(clip.end) ? clip.end : 0}
                        onChange={(e) => handleHighlightTimeChange(index, 'end', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="clip-editor-actions">
                    <button className="btn-secondary" onClick={() => moveHighlight(index, 'up')} disabled={index === 0}>↑ Move Up</button>
                    <button className="btn-secondary" onClick={() => moveHighlight(index, 'down')} disabled={index === editableHighlights.length - 1}>↓ Move Down</button>
                    <button className="btn-secondary" onClick={() => removeHighlight(index)}>🗑 Remove</button>
                  </div>
                </div>
              ))}

              <div className="clip-editor-actions" style={{ marginTop: '10px' }}>
                <button className="btn-secondary" onClick={addHighlight}>+ Add Clip</button>
                <button className="btn-primary" onClick={handleSaveEditedHighlights} disabled={isSavingHighlights}>
                  {isSavingHighlights ? 'Saving...' : '💾 Save Clip Edits'}
                </button>
              </div>
              {highlightsSaveMessage && <p className="muted">{highlightsSaveMessage}</p>}
            </div>
          )}

          <div className="highlights-section">
            <h2>Branding</h2>
            <p className="muted">Upload a PNG/JPG/WEBP logo. It will be used in the generated reel.</p>
            <div className="asset-upload-row">
              <input
                className="asset-file-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => setSelectedLogoFile(e.target.files?.[0] || null)}
              />
              <button
                className="btn-primary asset-upload-btn"
                onClick={handleLogoUpload}
                disabled={!selectedLogoFile || isUploadingLogo}
              >
                {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
            </div>
            {logoMessage && <p className="muted">{logoMessage}</p>}
            {logoError && <div className="error-message">{logoError}</div>}
          </div>

          <div className="highlights-section">
            <h2>Background Music</h2>
            <p className="muted">Upload MP3/WAV/M4A and enable speech-priority ducking mix.</p>
            <div className="asset-upload-row">
              <input
                className="asset-file-input"
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a"
                onChange={(e) => setSelectedMusicFile(e.target.files?.[0] || null)}
              />
              <button
                className="btn-primary asset-upload-btn"
                onClick={handleMusicUpload}
                disabled={!selectedMusicFile || isUploadingMusic}
              >
                {isUploadingMusic ? 'Uploading...' : 'Upload Music'}
              </button>
            </div>

            <div className="music-toggle-row">
              <label className="music-toggle-label">
                <input
                  type="checkbox"
                  checked={addBackgroundMusic}
                  onChange={(e) => setAddBackgroundMusic(e.target.checked)}
                />
                <span>Enable background music in generated reel</span>
              </label>
            </div>

            <div className="music-sliders-row">
              <label>
                Music Volume ({bgmVolume.toFixed(2)})
                <input
                  className="clip-input"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(Number(e.target.value))}
                />
              </label>
              <label>
                Ducking Strength ({duckingStrength.toFixed(2)})
                <input
                  className="clip-input"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={duckingStrength}
                  onChange={(e) => setDuckingStrength(Number(e.target.value))}
                />
              </label>
            </div>

            {musicMessage && <p className="muted">{musicMessage}</p>}
            {musicError && <div className="error-message">{musicError}</div>}
          </div>

          {/* PHASE 3D: Reel preview section */}
          {reelPath && (
            <div className="reel-preview-section">
              <h2>Your Final Reel</h2>
              <video width="100%" controls style={{ borderRadius: '8px', marginBottom: '20px' }}>
                <source src={`http://127.0.0.1:8001/record/reel/${campaignId}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <a 
                href={`http://127.0.0.1:8001/record/reel/${campaignId}`} 
                download 
                className="btn-primary reel-download-link"
              >
                📥 Download Reel
              </a>
            </div>
          )}

          {/* Error handling for reel generation */}
          {reelError && (
            <div className="error-message">{reelError}</div>
          )}

          <div className="result-actions"
              >
            {/* PHASE 3E: Reel customization options */}
            {editableHighlights.length > 0 && (
              <div className="reel-options-card">
                <div className="reel-field">
                  <label className="reel-field-label">
                    Aspect Ratio:
                  </label>
                  <select 
                    className="reel-select"
                    value={aspectRatio} 
                    onChange={(e) => setAspectRatio(e.target.value as 'landscape' | 'portrait' | 'square')}
                    disabled={isGeneratingReel}
                  >
                    <option value="landscape">Landscape (16:9) - YouTube</option>
                    <option value="portrait">Portrait (9:16) - TikTok/Reels</option>
                    <option value="square">Square (1:1) - Instagram</option>
                  </select>
                </div>
                
                <div className="reel-field">
                  <label className="reel-toggle-label">
                    <input 
                      type="checkbox" 
                      checked={addSubtitles} 
                      onChange={(e) => setAddSubtitles(e.target.checked)}
                      disabled={isGeneratingReel}
                    />
                    <span>Add auto-generated subtitles</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* PHASE 3D: Reel generation button */}
            {editableHighlights.length > 0 && (
              <button
                className="btn-highlight result-generate"
                onClick={handleGenerateReel}
                disabled={isGeneratingReel}
              >
                {isGeneratingReel
                  ? 'Generating Reel...'
                  : (reelPath ? 'Regenerate Final Reel' : 'Generate Final Reel')}
              </button>
            )}
            
            <button
              className="btn-secondary result-back"
              onClick={() => navigate('/')}
            >
              Back to Home
            </button>
            <button
              className="btn-primary result-record"
              onClick={() => {
                setIsCompleted(false);
                setIsPrepared(false);
                setQuestions([]);
                setCurrentQuestionIndex(0);
                setHighlights([]);
                setEditableHighlights([]);
                setUploadError('');
                setHighlightsError('');
                setHighlightsSaveMessage('');
                setIsUploading(false);
                setHighlightsLoading(false);
                setVideoBlob(null);
                setReelPath('');
                setReelError('');
                setIsGeneratingReel(false);
                setSelectedLogoFile(null);
                setLogoMessage('');
                setLogoError('');
                setSelectedMusicFile(null);
                setMusicMessage('');
                setMusicError('');
                setAddBackgroundMusic(false);
                setBgmVolume(0.2);
                setDuckingStrength(0.35);
                setCallConsentAccepted(false);
              }}
            >
              Record Another
            </button>
          </div>
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

          <div className="onboarding-strip" aria-label="Trust indicators">
            <span>🔐 Secure capture flow</span>
            <span>🧠 Guided feedback call</span>
            <span>🎯 Highlight-first output</span>
          </div>

          <div className="setup-section">
            <h2>Let's Get Started</h2>
            <p className="setup-description">
              We'll connect you to a guided feedback/review call flow. Choose your preferred language and start when ready.
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
              {loading ? 'Preparing Call...' : 'Start Feedback Call'}
            </button>
          </div>

          <div className="experience-grid" aria-label="What respondents can expect">
            <div className="experience-card">
              <h4>What happens next</h4>
              <ul>
                <li>The system asks 3-5 short guided prompts.</li>
                <li>You respond naturally in your own words.</li>
                <li>Best moments are transformed into share-ready clips.</li>
              </ul>
            </div>
            <div className="experience-card">
              <h4>Tips for best testimonial quality</h4>
              <ul>
                <li>Share one specific before/after result.</li>
                <li>Mention what changed and why it mattered.</li>
                <li>Use clear examples (time saved, quality, trust).</li>
              </ul>
            </div>
            <div className="experience-card secure">
              <h4>Privacy & trust</h4>
              <ul>
                <li>Your recording stays tied to this campaign only.</li>
                <li>Content is processed for transcription and highlight extraction.</li>
                <li>Final clips can be reviewed before publishing.</li>
              </ul>
            </div>
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
          <h2>Preparing your feedback call prompts...</h2>
          <p>Just a moment while we connect your review call flow.</p>
        </div>
      </div>
    );
  }

  // Prepared screen: Show "Your AI Host is Ready"
  if (isPrepared && !isInterviewStarted) {
    return (
      <div className="container">
        <div className="card ready-card">
          <div className="ready-kicker">Customer Feedback Call</div>
          <div className="ready-icon">🎤</div>
          <h1>Your Feedback Call is Ready</h1>
          <p className="ready-subtitle">
            You are about to join a guided feedback/review call for <strong>{campaign.prompt}</strong>. Please answer thoughtfully like a real customer conversation.
          </p>

          <div className="prepare-info">
            <p className="info-text">Call Language: <strong>{selectedLanguage === 'english' ? 'English' : 'हिन्दी'}</strong></p>
            <p className="info-text">Call Purpose: <strong>Service feedback and product experience review</strong></p>
            <p className="info-text">Review Audience: <strong>Customer Experience Team</strong></p>
          </div>

          <div className="response-guidance">
            <h3>For strongest answers</h3>
            <ul>
              <li>Mention a specific before/after change.</li>
              <li>Share one concrete example (time, quality, confidence, results).</li>
              <li>Speak naturally as if advising another customer.</li>
            </ul>
          </div>

          <div className="trust-note">
            <span>🔒 Secure recording</span>
            <span>🧠 Guided call format</span>
            <span>✅ Human-review friendly output</span>
          </div>

          <label className="call-consent-row">
            <input
              type="checkbox"
              checked={callConsentAccepted}
              onChange={(e) => setCallConsentAccepted(e.target.checked)}
            />
            <span>
              I understand this feedback call will be reviewed for service quality and I will provide genuine responses.
            </span>
          </label>

          <button
            onClick={handleBeginInterview}
            className="btn-primary btn-large"
            disabled={!callConsentAccepted}
          >
            Join Feedback Call
          </button>

          <button
            onClick={() => {
              setIsPrepared(false);
              setQuestions([]);
              setError('');
              setIsCompleted(false);
              setHighlights([]);
              setUploadError('');
              setHighlightsError('');
              setIsUploading(false);
              setHighlightsLoading(false);
              setCallConsentAccepted(false);
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
              Feedback call in progress
            </p>

            <div className="call-status-row">
              <span className="call-status-chip">🔐 Secure connection</span>
              <span className="call-status-chip">🧾 Review call mode</span>
              <span className="call-status-chip">🎙 {isSpeaking ? 'Host speaking' : 'Listening to customer'}</span>
            </div>
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span className="recording-text">LIVE CALL</span>
              </div>
            )}
          </div>

          {/* PERMISSION ERROR MESSAGE */}
          {permissionError && (
            <div style={{
              backgroundColor: '#FEE2E2',
              border: '2px solid #DC2626',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ color: '#991B1B', fontWeight: 'bold', marginBottom: '8px' }}>
                🔒 Camera/Microphone Access Required
              </div>
              <div style={{ color: '#7C2D12', marginBottom: '12px', fontSize: '14px' }}>
                {permissionError}
              </div>
              <div style={{ color: '#7C2D12', marginBottom: '8px', fontSize: '12px' }}>
                Retry attempts: {permissionRetryCount}
              </div>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#7C2D12' }}>
                <strong>How to fix:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Refresh the page (<code style={{ backgroundColor: '#FECACA', padding: '2px 6px', borderRadius: '3px' }}>Ctrl + R</code>)</li>
                  <li>Click &quot;Allow&quot; when your browser asks for permissions</li>
                  <li>Check browser settings: Settings → Privacy → Camera & Microphone → Allow this site</li>
                  <li>Close any other apps using your camera (Zoom, Teams, etc.)</li>
                </ul>
              </div>
              <button
                onClick={retryPermission}
                disabled={isRecording}
                style={{
                  backgroundColor: '#DC2626',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginRight: '10px'
                }}
              >
                🔄 Retry Permission
              </button>
              <button
                onClick={() => {
                  setIsInterviewStarted(false);
                  setPermissionError('');
                  setPermissionRetryCount(0);
                }}
                style={{
                  backgroundColor: '#6B7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ← Back to Setup
              </button>
            </div>
          )}

          <div className="call-prompt-panel" role="status" aria-live="polite">
            <div className="call-prompt-label">Host Question</div>
            <p>{currentQuestion}</p>
          </div>

          <div className="call-media-grid">
            <div className="call-host-card">
              <div className="media-card-title">Host Guidance</div>
              <Avatar isSpeaking={isSpeaking} />
            </div>

            <div className="call-customer-card">
              <div className="media-card-title">Your Camera Preview</div>
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
              {(!isRecording || !mediaStream) && (
                <div className="camera-waiting">Camera will appear once recording starts.</div>
              )}
            </div>
          </div>

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
                  setIsCompleted(true);
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
              Your response is being recorded for this guided feedback call. A 2-second pause automatically moves to the next prompt.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}
