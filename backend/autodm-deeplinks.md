# AutoDM Deeplink Redirects - Approved Plan

### Summary
Implement a signed deeplink redirect system so AutoDM links first land on your domain, then 302-redirect to the user’s target URL.  
This is SEO-safe when implemented as a utility endpoint with `noindex` headers and no indexable content page.

Chosen defaults:
- Redirect style: `302` (temporary)
- Link protection: signed token URL
- Behavior: permissive target handling; attempt redirect even for unknown external domains

### Implementation Changes
1. **Add redirect endpoint + controller behavior**
- Add a public route like `GET /r/{token}`.
- Token payload contains target URL + expiry + flow/message metadata, signed with app key.
- Controller decodes token, normalizes target, issues `302` to target, and adds `X-Robots-Tag: noindex, nofollow, noarchive`.

2. **Generate deeplink URLs during AutoDM message send**
- Replace raw external URL with signed redirect URL: `https://app.scanmysocial.com/r/{token}` or root domain if desired.
- Keep visible button label unchanged.

3. **URL extraction + replacement rules**
- Use markdown URL parsing pattern: keep internal links as-is, wrap external ones in signed tokens.
- Keep images and media links untouched.

4. **Minimal host policy**
- Ensure `/r/*` is accessible on all configured domains without domain guard restriction issues.
- Redirect target can be any external absolute URL.

5. **SEO/marketing posture**
- No exposing to sitemaps or crawlers.

### Public Interfaces / Contracts
- `GET /r/{token}` endpoint.

### Test Plan
- Unit test token creation/tamper resistance.
- Feature test the endpoint headers and 302 logic.
- Verify AutoDM URL replacing works.
