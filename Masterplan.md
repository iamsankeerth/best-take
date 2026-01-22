# BestTake - Masterplan

## 1. App Overview
**App Name:** BestTake
**Tagline:** Create the perfect group photo. Every time.
**Core Value:** Solves the problem of "one person blinked" or "someone wasn't looking" in group photos by using AI to detect faces, cluster individuals, and allow users to swap expressions from a burst of photos.

## 2. Technical Stack
- **Frontend:** Next.js 15+ (App Router), React, TailwindCSS, Lucide Icons.
- **State Management:** Zustand.
- **AI/ML:** Google Gemini 2.5 Flash (Multimodal).
    - Used for: Face Detection, Bounding Box Coordinates (`box_2d`), Quality Scoring.
- **Image Processing:** Client-side Canvas API (Resizing, Cropping, Blob conversion).
- **Storage:** LocalStorage (for API keys), Client-side memory (for photo blobs).

## 3. Core Features (MVP)
### 1. Smart Photo Upload
- Drag & Drop interface for multiple images (Burst mode).
- Client-side HEIC to JPEG conversion.
- Automatic image resizing for API optimization.

### 2. AI Face Detection Engine
- **Mathematical Precision:** Uses Gemini 2.5 with a strict "Nose-Bridge Anchor" prompt.
- **Aspect-Aware Geometry:** Highlights and thumbnails calculate crops based on real image aspect ratios.
- **Face Clustering:** Groups the same person across multiple photos using `personId` logic.

### 3. Face Selector UI
- **Dynamic Zoom:** Clicking a person auto-zooms the main canvas to their face.
- **Precision Highlights:** Circular overlays that track face positions.
- **Expression Strip:** Thumbnail carousel showing all available takes for the selected person.

### 4. Privacy First
- No images are stored on external servers (besides the transient analysis by Gemini).
- API Keys are stored locally on the user's device.

## 4. Roadmap
- [x] Initial Project Setup (Next.js)
- [x] Gemini API Integration (Face Detection)
- [x] UI Implementation (Photo Upload, Face Highlighting)
- [x] **Refinement:** Pixel-perfect face alignment and aspect-ratio correction.
- [ ] **Feature:** "Merge & Download" - Stitching the chosen faces into a final composite image.
- [ ] **Feature:** Mobile-first responsive optimizations.
- [ ] **Feature:** Social Sharing integration.

## 5. Directory Structure
```
src/
├── app/              # Next.js App Router
├── components/       # React Components (FaceSelector, PhotoUpload)
├── lib/              # Utilities (gemini.ts, imageUtils.ts)
├── store/            # Zustand State Store
└── types/            # TypeScript Interfaces
```
