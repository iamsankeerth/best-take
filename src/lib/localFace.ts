import type { Photo, DetectedFace } from '@/types';
import type { FaceDetector as FaceDetectorType } from '@mediapipe/tasks-vision';

let detectorPromise: Promise<FaceDetectorType> | null = null;

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.15/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

async function getFaceDetector() {
    if (!detectorPromise) {
        detectorPromise = (async () => {
            const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
            const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
            return FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: MODEL_PATH
                },
                runningMode: 'IMAGE',
                minDetectionConfidence: 0.5
            });
        })();
    }
    return detectorPromise;
}

export async function detectFacesLocally(photos: Photo[]): Promise<DetectedFace[]> {
    const detector = await getFaceDetector();
    const faces: DetectedFace[] = [];
    const maxEdge = 1280;

    for (const photo of photos) {
        const bitmap = await createImageBitmap(photo.file);
        const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
        const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
        const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(targetWidth, targetHeight)
            : document.createElement('canvas');

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            bitmap.close?.();
            throw new Error('Canvas context not available for local face detection.');
        }
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        let result;
        try {
            result = detector.detect(imageData);
        } catch (err) {
            console.error('Local face detection failed', err);
            bitmap.close?.();
            const detail = err instanceof Error ? err.message : 'Unknown error';
            throw new Error(`Local face detection failed: ${detail}`);
        }

        bitmap.close?.();

        const detections = result?.detections || [];
        for (const detection of detections) {
            const box = detection.boundingBox;
            if (!box) continue;

            const x = box.originX / targetWidth;
            const y = box.originY / targetHeight;
            const w = box.width / targetWidth;
            const h = box.height / targetHeight;

            const score = detection.categories?.[0]?.score ?? 0.8;

            faces.push({
                id: crypto.randomUUID(),
                photoId: photo.id,
                boundingBox: {
                    x: Math.max(0, Math.min(1, x)),
                    y: Math.max(0, Math.min(1, y)),
                    width: Math.max(0.01, Math.min(1, w)),
                    height: Math.max(0.01, Math.min(1, h))
                },
                thumbnailUrl: photo.url,
                confidence: score
            });
        }
    }

    return faces;
}
