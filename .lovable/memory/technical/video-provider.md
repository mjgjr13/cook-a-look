---
name: video-provider
description: Google Meet is the sole video provider; Daily.co disabled
type: feature
---
All consultations route directly to Google Meet via `create-video-room` edge function. No Daily.co, no in-app iframe. The function returns `provider: "google_meet"` and `roomUrl: https://meet.google.com/new`. VideoCall component shows an "Open Google Meet" button. Both parties must share the actual generated Meet URL via the in-booking chat so they land in the same room. No native recordings — disputes rely on chat history and screenshots.
