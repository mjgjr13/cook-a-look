---
name: Security Hardening June 2026
description: Review/location/storage lockdown and HIBP password protection
type: constraint
---
- Reviews must be read via `get_advisor_reviews(advisor_id, limit)` RPC — never `from('advisor_reviews').select(...)` joining profiles. The RPC returns reviewer_first_name + reviewer_avatar_url only; client_id is never exposed.
- Meeting locations are auth-gated. Fetching `advisor_meeting_locations` only works for signed-in users; the booking calendar must wait until `user` is set before loading.
- Public storage buckets (avatars/lookbook/portfolios) have no SELECT policy by design — display via `getPublicUrl` still works, but `.list()` will return empty for anonymous clients. Do not re-add a public SELECT policy.
- HIBP (Leaked Password Protection) is enabled on auth. Signup/reset will reject breached passwords.
- SECURITY DEFINER functions have execute revoked from anon/authenticated except for the explicit public-read RPCs listed in security memory.
