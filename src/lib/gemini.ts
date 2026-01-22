import { GoogleGenerativeAI } from '@google/generative-ai';
import { blobToBase64 } from '@/lib/imageUtils';

// Using Gemini 2.5 Flash - standard multimodal model for API key access in 2026
const MODEL_VERSION = 'gemini-2.5-flash';

export function createGeminiClient(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: MODEL_VERSION });
}

export interface GeminiDetectedFace {
  personId: string;
  photoIndex: number;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  score: number;
  label?: string;
}

export interface FaceDetectionResult {
  faces: GeminiDetectedFace[];
}

export async function detectFacesInPhotos(
  apiKey: string,
  images: File[] // We use File objects which are Blobs
): Promise<FaceDetectionResult> {
  const model = createGeminiClient(apiKey);

  const imageParts = await Promise.all(
    images.map(async (file) => ({
      inlineData: {
        data: await blobToBase64(file),
        mimeType: 'image/jpeg'
      }
    }))
  );

  const prompt = `
    Find all human faces in these ${images.length} photos with MATHEMATICAL PRECISION.
    
    DETECTION RULES:
    1. ORIGIN: The ABSOLUTE CENTER of your bounding box must be the bridge of the nose.
    2. GEOMETRY: Provide a PERFECT SQUARE box. 
    3. COVERAGE: Box must include eyes, nose, and mouth. DO NOT include hair, ears, or neck.
    4. COORDINATES: [ymin, xmin, ymax, xmax] in 0-1000 scale.
    5. DATA ONLY: Return ONLY the JSON. No conversational text.

    JSON FORMAT:
    {
      "faces": [
        {
          "personId": "person_1",
          "photoIndex": 0,
          "box_2d": [ymin, xmin, ymax, xmax],
          "score": 0.98,
          "label": "smiling"
        }
      ]
    }
  `;

  // We use the model to generate content
  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();

  // Basic cleanup for JSON in Markdown block
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

  return JSON.parse(jsonStr);
}
