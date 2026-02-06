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

    for (const photo of photos) {
        const bitmap = await createImageBitmap(photo.file);
        const result = detector.detect(bitmap);
        bitmap.close?.();

        const detections = result?.detections || [];
        for (const detection of detections) {
            const box = detection.boundingBox;
            if (!box) continue;

            const x = box.originX / photo.width;
            const y = box.originY / photo.height;
            const w = box.width / photo.width;
            const h = box.height / photo.height;

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
