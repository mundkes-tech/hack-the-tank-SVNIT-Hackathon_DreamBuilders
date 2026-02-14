# PHASE 2A - Quick Testing Guide

## Backend API Testing

### 1. Create a Campaign
```powershell
$campaign = Invoke-RestMethod -Uri "http://127.0.0.1:8001/campaign/create" `
  -Method POST -ContentType "application/json" `
  -Body '{"prompt": "Collect testimonials for my pizza restaurant"}'
$campaignId = $campaign.campaign_id
Write-Host "Campaign ID: $campaignId"
```

### 2. Generate English Questions
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8001/campaign/$campaignId/generate-questions" `
  -Method POST -ContentType "application/json" `
  -Body '{"language": "english"}' | ConvertTo-Json
```

### 3. Generate Hindi Questions
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8001/campaign/$campaignId/generate-questions" `
  -Method POST -ContentType "application/json" `
  -Body '{"language": "hindi"}' | ConvertTo-Json
```

### 4. Test Invalid Campaign Error
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8001/campaign/invalid-id/generate-questions" `
  -Method POST -ContentType "application/json" `
  -Body '{"language": "english"}' -ErrorAction Continue
```

## Frontend Testing

### 1. Open Home Page
- Navigate to http://localhost:5173/
- See hero section and feature cards
- Click "Create Campaign"

### 2. Create Campaign
- Enter: "Collect testimonials for my pizza restaurant"
- Click "Create Campaign"
- Copy the shareable link

### 3. Open Collection Page
- Paste shareable link in new tab
- See campaign details
- See "Let's Get Started" section

### 4. Test Question Generation
- Select "English" or "हिन्दी"
- Click "Start Testimonial"
- Wait for questions to load
- See 4 numbered questions displayed
- Click "Regenerate Questions" to get new questions

### 5. Switch Languages
- Click "Regenerate Questions"
- Select different language
- Click "Start Testimonial"
- Verify questions are in selected language

## Expected Results

✅ **English Questions (Sample)**
```
1. What problem did you face before using our product or service?
2. How has using our product improved your experience?
3. Can you share a specific measurable result or improvement you've seen?
4. Would you recommend us to others, and why?
```

✅ **Hindi Questions (Sample)**
```
1. आप हमारी उत्पाद या सेवा का उपयोग करने से पहले क्या समस्या का सामना करते थे?
2. हमारी उत्पाद के उपयोग से आपका अनुभव कैसे सुधरा है?
3. क्या आप कोई विशिष्ट मापने योग्य परिणाम या सुधार साझा कर सकते हैं?
4. क्या आप दूसरों को हमारी सिफारिश करेंगे, और क्यों?
```

## Services Status

| Service | URL | Status |
|---------|-----|--------|
| Backend | http://127.0.0.1:8001 | ✅ Running |
| Frontend | http://localhost:5173 | ✅ Running |
| Gemini API | (Cloud) | ⚠️ Using fallback |

## Notes

- Gemini API returns fallback templates (this is expected behavior for robustness)
- Both English and Hindi fully supported
- Proper error handling for invalid campaigns
- Frontend shows loading states appropriately
