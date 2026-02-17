import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign } from '../services/api';
import './CreateCampaign.css';

const PROMPT_SAMPLES = [
  {
    title: 'SaaS Product Outcome',
    prompt: 'Collect testimonials from SaaS users focused on time savings, onboarding ease, ROI after 30 days, and confidence in switching from previous tools.',
    focus: 'ROI + usability'
  },
  {
    title: 'Healthcare Service Trust',
    prompt: 'Collect patient testimonials about staff professionalism, treatment clarity, comfort during visits, and improvements in overall health confidence.',
    focus: 'Trust + care quality'
  },
  {
    title: 'Restaurant Experience',
    prompt: 'Collect customer testimonials highlighting food quality, delivery speed, freshness, and whether they would recommend us to family and friends.',
    focus: 'Taste + consistency'
  }
];

export default function CreateCampaign() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campaign, setCampaign] = useState<{
    campaign_id: string;
    shareable_link: string;
  } | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Create Campaign • DreamBuilders';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a testimonial prompt');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await createCampaign(prompt);
      setCampaign({
        campaign_id: result.campaign_id,
        shareable_link: result.shareable_link,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (campaign?.shareable_link) {
      navigator.clipboard.writeText(campaign.shareable_link);
      alert('Link copied to clipboard!');
    }
  };

  const createAnother = () => {
    setCampaign(null);
    setPrompt('');
    setError('');
  };

  const applySamplePrompt = (samplePrompt: string) => {
    setPrompt(samplePrompt);
    setError('');
  };

  if (campaign) {
    return (
      <div className="container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>Campaign Created!</h1>
          <p className="subtitle">Your testimonial collection campaign is ready</p>
          
          <div className="campaign-details">
            <div className="detail-row">
              <label>Campaign ID:</label>
              <code>{campaign.campaign_id}</code>
            </div>
            
            <div className="detail-row">
              <label>Shareable Link:</label>
              <div className="link-container">
                <input 
                  type="text" 
                  value={campaign.shareable_link} 
                  readOnly 
                  className="link-input"
                />
                <button onClick={copyToClipboard} className="copy-btn">
                  📋 Copy
                </button>
              </div>
            </div>
          </div>

          <div className="instructions">
            <h3>Next Steps:</h3>
            <ol>
              <li>Share the link above with your customers</li>
              <li>They'll record video testimonials</li>
              <li>AI will process and generate highlights automatically</li>
            </ol>
          </div>

          <div className="actions">
            <button onClick={createAnother} className="btn-secondary">
              Create Another Campaign
            </button>
            <button onClick={() => navigate('/')} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="trust-strip" aria-label="Trust indicators">
          <span>🔒 Privacy-first workflow</span>
          <span>⚡ Fast AI processing</span>
          <span>🎬 Social-ready output</span>
        </div>

        <h1>Create Testimonial Campaign</h1>
        <p className="subtitle">
          Define your campaign once and generate a shareable testimonial collection flow in seconds.
        </p>

        <div className="insight-grid" aria-label="Campaign guidance summary">
          <div className="insight-card">
            <h4>What to include</h4>
            <p>Target audience, desired emotions, and outcomes you want customers to mention.</p>
          </div>
          <div className="insight-card">
            <h4>Best prompt style</h4>
            <p>Use clear problem→solution language to get stronger, story-driven testimonials.</p>
          </div>
          <div className="insight-card">
            <h4>Recommended length</h4>
            <p>1-2 concise sentences usually produce high-quality interview questions.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="prompt">Testimonial Prompt</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Collect testimonials for my pizza restaurant focusing on food quality and delivery speed"
              rows={5}
              disabled={loading}
              required
            />
            <small>Describe what kind of testimonials you want to collect</small>
          </div>

          <div className="sample-prompts" aria-label="Sample testimonial prompt templates">
            <div className="sample-title-row">
              <h3>Sample Prompt Templates</h3>
              <span>Click any template to auto-fill</span>
            </div>
            <div className="sample-list">
              {PROMPT_SAMPLES.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  className="sample-item"
                  onClick={() => applySamplePrompt(sample.prompt)}
                >
                  <div className="sample-item-top">
                    <strong>{sample.title}</strong>
                    <span>{sample.focus}</span>
                  </div>
                  <p>{sample.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Campaign...' : 'Create Campaign'}
          </button>
        </form>

        <div className="security-panel" aria-label="Security and quality notes">
          <h3>Security & Quality Standards</h3>
          <ul>
            <li>Interview links are campaign-specific and generated uniquely.</li>
            <li>AI processing is guided by your campaign prompt context.</li>
            <li>You can review clips before final reel generation for quality control.</li>
          </ul>
        </div>

        <div className="info-box">
          <h3>How it works:</h3>
          <ul>
            <li>Enter your testimonial requirements</li>
            <li>Get a unique shareable link</li>
            <li>Send the link to your customers</li>
            <li>AI processes responses automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
