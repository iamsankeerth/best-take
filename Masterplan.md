# BestTake - Masterplan (Qwen Image Edit)

## 1. Product Goal
**Goal:** Replicate the core experience of Google Pixel Best Take, but the final image is produced with AI editing (Qwen Image Edit). Users explicitly opt in to AI editing.

**Success Definition (must hit):**
- Output looks natural at normal viewing size (no obvious face seams or artifacts).
- Identity is preserved (faces still look like the same person).
- Full flow (upload -> analyze -> edit -> export) completes on a laptop, even if slow.

**Non-Goals (for now):**
- Cloud accounts or photo storage.
- Mobile optimization.
- Automated batch processing.

## 2. User Experience Parity
**Core flow:**
1. Upload 2-10 similar group photos (burst).
2. Detect faces and group each person across photos.
3. Tap a person to view expression options from other shots.
4. Choose the best face, then run AI edit to update only that face region.
5. Export the final edited image.

**Parity details:**
- Person highlights on main image.
- Face strip for each person with selectable expressions.
- Before/after toggle.
- Undo/redo.

## 3. Technical Stack
- **Frontend:** Next.js (App Router), React, TailwindCSS, Lucide Icons.
- **State:** Zustand.
- **AI Edit Core:** Qwen Image Edit (multi-image edit model).
- **Local AI Service:** Python API (FastAPI or similar) to run Qwen locally.
- **Supporting Models:** Face detection + landmarks + segmentation masks (MediaPipe or similar).
- **Image Processing:** Canvas API + OffscreenCanvas.
- **Storage:** Local only.

## 4. Hardware Constraints
- **Target device:** RTX 2050 laptop GPU (4 GB VRAM).
- **Inference mode:** Low-VRAM layer-by-layer offload. GPU is used, but most weights sit in CPU RAM.
- **Quality:** Prefer no quantization for maximum image quality. Quantization only if required.
- **Speed:** Slow is acceptable; quality is the priority.

## 5. Core Pipeline (Qwen Edit)
1. **Ingest and Normalize**
   - HEIC -> JPEG conversion.
   - Resize to a safe max edge (e.g., 1600-2400px).
   - Fix EXIF orientation.

2. **Face Detection + Landmarks**
   - Per-photo detection with landmarks (eyes, nose, mouth).
   - Track face boxes across photos.

3. **Person Grouping**
   - Cluster faces across photos (position + size + optional embeddings).
   - Manual reassignment UI for mistakes.

4. **Mask Generation**
   - Build a soft mask for the selected face region on the base photo.
   - Keep background and other faces protected.

5. **Qwen Image Edit**
   - Inputs: base image + reference face crop + mask.
   - Prompt: replace only the masked face with the selected expression.
   - Run edit and produce a new composite.

6. **Iterative Edits**
   - Apply edits per person sequentially to preserve control.
   - Keep history for undo/redo.

## 6. Privacy + Disclosure
- All processing is local on the user machine.
- No server-side storage.
- UI must clearly state: "This result is AI edited."

## 7. Risks (Must Mitigate)
- **Identity drift** -> use tight masks, strong identity prompt, and low edit strength.
- **Artifacts or blur** -> tune edit strength and mask feathering.
- **Slow inference** -> local caching, lower resolution preview, and final high-res render.

## 8. Roadmap (Milestones)
### Milestone 1: Local AI Service
- Setup Python API for Qwen Image Edit.
- Validate a single edit with base + reference + mask.
- Exit: one successful edit on a test photo.

### Milestone 2: Detection + Masking
- Face detection and landmark extraction per photo.
- Generate correct face masks.
- Exit: mask correctly covers face only.

### Milestone 3: UI Integration
- Connect UI selection to AI edit pipeline.
- Display before/after and allow undo/redo.
- Exit: user can swap a single face successfully.

### Milestone 4: Multi-Person Editing
- Apply edits sequentially for multiple people.
- Improve mask edge blending.
- Exit: full group photo can be edited.

### Milestone 5: Quality Tuning
- Adjust prompt, edit strength, and mask feather.
- Add face verification checks.
- Exit: 80% of test sets look natural.

## 9. Test Plan
- Build a dataset of 30-50 burst sets.
- Evaluate: identity preservation, artifact visibility, and overall realism.
- Track average inference time per edit.

## 10. Deliverables
- Local AI edit service (Python).
- Updated web app with Qwen edit flow.
- Documented performance constraints.

## 11. Project Structure
```
src/
+-- app/              # Next.js App Router
+-- components/       # React Components
+-- lib/              # Utilities (imageUtils, compositing, etc.)
+-- store/            # Zustand State Store
+-- types/            # TypeScript Interfaces
```
