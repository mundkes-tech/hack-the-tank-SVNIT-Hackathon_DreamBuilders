import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCampaign } from '../services/api';
import './CollectTestimonial.css';

export default function CollectTestimonial() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [campaign, setCampaign] = useState<{
    campaign_id: string;
    prompt: string;
    created_at: string;
  } | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setError('No campaign ID provided');
      setLoading(false);
      return;
    }

    const fetchCampaign = async () => {
      try {
        const data = await getCampaign(campaignId);
        setCampaign(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="container">
        <div className="card loading-card">
          <div className="spinner"></div>
          <p>Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card error-card">
          <div className="error-icon">⚠️</div>
          <h1>Campaign Not Found</h1>
          <p>{error}</p>
          <p className="help-text">
            Please check the link and try again, or contact the business owner.
          </p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="container">
      <div className="card testimonial-card">
        <div className="header">
          <h1>Share Your Testimonial</h1>
          <p className="subtitle">Your feedback matters!</p>
        </div>

        <div className="campaign-info">
          <div className="info-badge">
            <span className="badge-label">Campaign:</span>
            <span className="badge-value">{campaign.prompt}</span>
          </div>
        </div>

        <div className="coming-soon">
          <div className="coming-soon-icon">🎥</div>
          <h2>Video Recording Coming Soon</h2>
          <p>
            In the next phase, you'll be able to record your video testimonial right here.
          </p>
          
          <div className="phase-info">
            <h3>What's Next (Phase 2+):</h3>
            <ul>
              <li>✅ Campaign system (Current)</li>
              <li>🔄 AI-generated questions</li>
              <li>📹 Video recording interface</li>
              <li>🎯 Automatic transcription</li>
              <li>✨ AI highlight extraction</li>
              <li>🎬 Instagram reel generation</li>
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
