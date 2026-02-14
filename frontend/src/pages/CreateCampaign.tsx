import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign } from '../services/api';
import './CreateCampaign.css';

export default function CreateCampaign() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campaign, setCampaign] = useState<{
    campaign_id: string;
    shareable_link: string;
  } | null>(null);
  
  const navigate = useNavigate();

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
        <h1>Create Testimonial Campaign</h1>
        <p className="subtitle">
          Generate AI-powered testimonial questions and get a shareable link
        </p>

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

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Campaign...' : 'Create Campaign'}
          </button>
        </form>

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
