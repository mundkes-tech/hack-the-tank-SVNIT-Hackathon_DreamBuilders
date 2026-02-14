import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="container">
      <div className="hero">
        <h1 className="hero-title">
          AI-Native Autonomous Testimonial Collection System
        </h1>
        <p className="hero-subtitle">
          Collect, transcribe, and transform video testimonials into Instagram-ready content — completely autonomously
        </p>
        
        <div className="cta-section">
          <Link to="/create" className="btn-primary btn-large">
            Create Campaign
          </Link>
          <p className="cta-subtitle">No calls, no editing, just AI magic ✨</p>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">💡</div>
          <h3>AI Question Generation</h3>
          <p>Intelligent questions tailored to your business needs</p>
          <span className="status-badge status-planned">Phase 2</span>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎥</div>
          <h3>Video Collection</h3>
          <p>Customers record testimonials via shareable link</p>
          <span className="status-badge status-planned">Phase 2</span>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📝</div>
          <h3>Auto Transcription</h3>
          <p>Whisper AI transcribes videos automatically</p>
          <span className="status-badge status-planned">Phase 3</span>
        </div>

        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3>Highlight Extraction</h3>
          <p>AI finds the most impactful testimonial moments</p>
          <span className="status-badge status-planned">Phase 4</span>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎬</div>
          <h3>Instagram Reels</h3>
          <p>Auto-generates ready-to-post vertical videos</p>
          <span className="status-badge status-planned">Phase 5</span>
        </div>

        <div className="feature-card active">
          <div className="feature-icon">🔗</div>
          <h3>Campaign Links</h3>
          <p>Generate unique shareable collection links</p>
          <span className="status-badge status-active">Active ✓</span>
        </div>
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h4>Create Campaign</h4>
            <p>Enter your testimonial requirements</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">2</div>
            <h4>Share Link</h4>
            <p>Send to your customers</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">3</div>
            <h4>AI Processing</h4>
            <p>Automatic transcription & highlights</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">4</div>
            <h4>Get Reels</h4>
            <p>Instagram-ready content delivered</p>
          </div>
        </div>
      </div>

      <div className="phase-info-box">
        <h3>🚀 Phase 1 Implementation Complete</h3>
        <p>
          Campaign creation and link sharing system is now live!
          The AI processing features will be added in subsequent phases.
        </p>
      </div>
    </div>
  );
}
