# Direct links: secure-connection error

## What I checked just now

From outside the preview, all three addresses are healthy:

- `https://cookalook.com` -> 302 to `https://www.cookalook.com`, then 200
- `https://www.cookalook.com` -> 200, homepage renders, no browser errors
- `https://cookalook.lovable.app` -> 200
- Deep link `https://www.cookalook.com/advisors` -> 200, renders directly

DNS: both `cookalook.com` and `www.cookalook.com` resolve to Lovable's address `185.158.133.1`.

Certificates (Google Trust Services, valid):

```text
cookalook.com        issued Aug 6 15:19 UTC today, valid to Nov 4
www.cookalook.com    issued Jun 9, valid to Sep 7
```

The root-domain certificate was issued only about an hour before the report. "Can't establish a secure connection" is exactly the error a browser or network shows while a newly issued certificate and the DNS record behind it are still propagating, or while a stale cached DNS entry still points at the old host.

Nothing in the app code causes this, so there is no code change to make.

## What to do

1. Retry the links now on a device that has not visited them recently (for example mobile data instead of Wi-Fi). Certificate and DNS propagation can take up to a few hours and in rare cases up to 72 hours.
2. If a device still fails, flush its DNS cache and restart the browser, then retry. Old cached records are the usual cause of a domain failing on one machine while working elsewhere.
3. If the failure persists past 24 hours on a fresh network, open Project Settings, Domains and confirm both `cookalook.com` and `www.cookalook.com` show status Active, with `www.cookalook.com` set as Primary. If either shows Offline, Failed, or Verifying, use the Retry action there so the certificate is reissued.
4. Report back the exact device, network, and error text of any link that is still failing after the above, and I will investigate that specific path.

## Technical notes

- Serving IP, redirect chain, TLS handshake, certificate chain, and client-side rendering were all verified successfully from outside the preview environment; the published bundle loads and executes with no console errors.
- No DNS records need changing: both hostnames already point at `185.158.133.1`, which is the correct Lovable target.
