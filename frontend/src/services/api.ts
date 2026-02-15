/**
 * API Service for communicating with the backend
 */

const API_BASE_URL = 'http://127.0.0.1:8001';

export interface Campaign {
  campaign_id: string;
  prompt: string;
  created_at: string;
  shareable_link?: string;
}

export interface CreateCampaignRequest {
  prompt: string;
}

export interface CreateCampaignResponse {
  campaign_id: string;
  shareable_link: string;
  prompt: string;
  created_at: string;
}

export interface GenerateQuestionsRequest {
  language: string;
}

export interface GenerateQuestionsResponse {
  campaign_id: string;
  questions: string[];
}

export interface Highlight {
  text: string;
  start: number;
  end: number;
  reason: string;
}

export interface HighlightExtractionResponse {
  message: string;
  highlight_count: number;
  highlights: Highlight[];
}

/**
 * Create a new testimonial campaign
 */
export async function createCampaign(prompt: string): Promise<CreateCampaignResponse> {
  const response = await fetch(`${API_BASE_URL}/campaign/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create campaign: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get campaign details by ID
 */
export async function getCampaign(campaignId: string): Promise<Campaign> {
  const response = await fetch(`${API_BASE_URL}/campaign/${campaignId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Campaign not found');
    }
    throw new Error(`Failed to fetch campaign: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate testimonial interview questions for a campaign
 */
export async function generateQuestions(
  campaignId: string,
  language: string = 'english'
): Promise<GenerateQuestionsResponse> {
  const response = await fetch(`${API_BASE_URL}/campaign/${campaignId}/generate-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ language }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Campaign not found');
    }
    throw new Error(`Failed to generate questions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate highlight extraction for a campaign transcript
 */
export async function generateHighlights(
  campaignId: string
): Promise<HighlightExtractionResponse> {
  const response = await fetch(`${API_BASE_URL}/record/highlights/${campaignId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Campaign not found');
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to generate highlights: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('API is not healthy');
  }

  return response.json();
}
