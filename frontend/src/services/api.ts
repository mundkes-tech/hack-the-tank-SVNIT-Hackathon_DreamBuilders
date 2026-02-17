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

export interface ReelGenerationResponse {
  message: string;
  reel_path: string;
}

export interface ReelCustomizationOptions {
  aspect_ratio: 'landscape' | 'portrait' | 'square';
  add_subtitles: boolean;
  add_background_music?: boolean;
  bgm_volume?: number;
  ducking_strength?: number;
}

export interface LogoUploadResponse {
  message: string;
  logo_url: string;
}

export interface MusicUploadResponse {
  message: string;
  music_url: string;
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
 * PHASE A: Fetch edited highlights (falls back to AI highlights on backend)
 */
export async function getEditedHighlights(
  campaignId: string
): Promise<HighlightExtractionResponse> {
  const response = await fetch(`${API_BASE_URL}/record/edited-highlights/${campaignId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('No highlights available');
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to fetch edited highlights: ${response.statusText}`);
  }

  return response.json();
}

/**
 * PHASE A: Save manually edited highlights
 */
export async function saveEditedHighlights(
  campaignId: string,
  highlights: Highlight[]
): Promise<HighlightExtractionResponse> {
  const response = await fetch(`${API_BASE_URL}/record/edited-highlights/${campaignId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ highlights }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to save edited highlights: ${response.statusText}`);
  }

  return response.json();
}

/**
 * PHASE A: Upload campaign logo for reel watermark
 */
export async function uploadCampaignLogo(
  campaignId: string,
  file: File
): Promise<LogoUploadResponse> {
  const formData = new FormData();
  formData.append('logo', file);

  const response = await fetch(`${API_BASE_URL}/record/logo/${campaignId}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to upload logo: ${response.statusText}`);
  }

  return response.json();
}

/**
 * PHASE B: Upload campaign background music for reel mixing
 */
export async function uploadCampaignMusic(
  campaignId: string,
  file: File
): Promise<MusicUploadResponse> {
  const formData = new FormData();
  formData.append('music', file);

  const response = await fetch(`${API_BASE_URL}/record/music/${campaignId}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to upload background music: ${response.statusText}`);
  }

  return response.json();
}

/**
 * PHASE 3D: Generate final testimonial reel from extracted highlights
 * PHASE 3E: Enhanced with customization options (subtitles, aspect ratio)
 * Uses MoviePy backend to concatenate highlight clips into final video
 */
export async function generateReel(
  campaignId: string,
  options?: ReelCustomizationOptions
): Promise<ReelGenerationResponse> {
  const response = await fetch(`${API_BASE_URL}/record/generate-reel/${campaignId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options || {
      aspect_ratio: 'landscape',
      add_subtitles: true
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Campaign not found');
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to generate reel: ${response.statusText}`);
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
