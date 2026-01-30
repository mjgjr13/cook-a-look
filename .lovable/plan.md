
# Fix: Enable Cropping of Existing Portfolio Photos (CORS Issue)

## Problem Summary

When you try to crop an **existing portfolio photo**, clicking "Save Photo" fails silently. The console shows:

```
SecurityError: The operation is insecure.
```

This is a **Cross-Origin Resource Sharing (CORS)** security error.

## Root Cause

When editing an existing portfolio image, the crop modal loads the image from Supabase storage (a different domain). The browser's security model prevents JavaScript from exporting canvas content when a cross-origin image has been drawn onto it - this is called a "tainted canvas".

The current `createImage` function doesn't tell the browser to load the image in a CORS-friendly way.

## Solution

Update the `ImageCropModal.tsx` file to:

1. **Set `crossOrigin = "anonymous"`** on the Image element before loading external URLs
2. **Add a cache-busting query parameter** to force the browser to re-fetch the image with CORS headers (browsers may cache a non-CORS version)

## Files to Modify

| File | Change |
|------|--------|
| `src/components/profile/ImageCropModal.tsx` | Update `createImage` function to handle CORS for external URLs |

## Technical Details

### Current Code (broken for external URLs)
```typescript
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
```

### Updated Code (CORS-safe)
```typescript
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    
    // Enable CORS for external URLs (like Supabase storage)
    // This prevents "tainted canvas" security errors when exporting
    if (url.startsWith("http")) {
      image.crossOrigin = "anonymous";
      // Add cache-buster to force browser to re-fetch with CORS headers
      const separator = url.includes("?") ? "&" : "?";
      image.src = `${url}${separator}t=${Date.now()}`;
    } else {
      image.src = url;
    }
  });
```

## Why This Works

- `crossOrigin = "anonymous"` tells the browser to request the image with CORS headers
- The Supabase storage bucket is already configured for public access, so the CORS request will succeed
- Adding a timestamp query parameter prevents the browser from using a cached non-CORS version of the image

## Expected Outcome

After this fix:
- Uploading new portfolio photos and cropping them will continue to work (data URLs)
- Editing/re-cropping existing portfolio photos will now work correctly
- The "Save Photo" button will successfully save the cropped image
