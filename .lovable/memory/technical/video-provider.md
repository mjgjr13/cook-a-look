---
name: video-provider
description: Jitsi Meet is the sole video provider; deterministic shared rooms per booking
type: feature
---
All consultations route to Jitsi Meet via `create-video-room` edge function. Room URL is deterministic: `https://meet.jit.si/cookalook-<bookingId>` so client and advisor land in the SAME room without sharing links. No API keys, no OAuth. Embedded directly in an iframe inside VideoCall component (Jitsi allows embedding, unlike Google Meet). Disputes rely on chat history and screenshots (no native recordings).
