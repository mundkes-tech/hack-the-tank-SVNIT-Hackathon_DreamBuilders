import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  useEffect(() => {
    document.title = 'DreamBuilders • AI Testimonial Reel Studio';
  }, []);

  return (
    <main className="container" aria-label="DreamBuilders home">
      <section className="hero">
        <p className="hero-kicker">AI Testimonial Growth Engine</p>
        <h1 className="hero-title">Collect. Analyze. Publish. All in one workflow.</h1>
        <p className="hero-subtitle">
          Turn raw customer testimonials into polished, social-ready reels with AI question generation,
          Whisper transcription, highlight extraction, and automated editing.
        </p>

        <div className="cta-section">
          <Link to="/create" className="btn-primary btn-large" aria-label="Create a new campaign">
            Create Campaign
          </Link>
          <p className="cta-subtitle">From capture to reels in minutes ⚡</p>
        </div>
      </section>

      <section className="features-grid" aria-label="Key platform features">
        <div className="feature-card">
          <div className="feature-icon">💡</div>
          <h3>AI Question Generation</h3>
          <p>Context-aware interview prompts generated from your campaign objective.</p>
          <span className="status-badge status-active">Live</span>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎥</div>
          <h3>Video Collection</h3>
          <p>Share one link and collect customer video responses in a guided flow.</p>
          <span className="status-badge status-active">Live</span>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📝</div>
          <h3>Auto Transcription</h3>
          <p>Whisper-powered transcription with segment timing for precise editing.</p>
          <span className="status-badge status-active">Live</span>
        </div>

        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3>Highlight Extraction</h3>
          <p>AI identifies the most convincing testimonial moments automatically.</p>
          <span className="status-badge status-active">Live</span>
        </div>

        <div className="feature-card active">
          <div className="feature-icon">🎬</div>
          <h3>Reel Generator</h3>
          <p>Auto-produce reels with subtitle, aspect ratio, logo, and music controls.</p>
          <span className="status-badge status-active">Live</span>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔗</div>
          <h3>Campaign Links</h3>
          <p>Generate and share campaign links with a simple creator dashboard.</p>
          <span className="status-badge status-active">Live</span>
        </div>
      </section>

      <section className="how-it-works" aria-label="How DreamBuilders works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h4>Create Campaign</h4>
            <p>Define your testimonial objective and tone.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">2</div>
            <h4>Share Link</h4>
            <p>Send one link and collect responses asynchronously.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">3</div>
            <h4>AI Processing</h4>
            <p>Transcribe, detect highlights, and prepare editable clips.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">4</div>
            <h4>Get Reels</h4>
            <p>Export branded reels optimized for every social format.</p>
          </div>
        </div>
      </section>

      <section className="phase-info-box" aria-label="Current implementation status">
        <h3>🚀 Multi-Phase System Live</h3>
        <p>
          Campaign creation, interview capture, transcription, highlights, and reel customization are active.
          You can now generate social-ready testimonial content end-to-end.
        </p>
      </section>
    </main>
  );
}
