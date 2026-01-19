import { GoogleGenerativeAI } from '@google/generative-ai';
import { blobToBase64 } from '@/lib/imageUtils';

const MODEL_VERSION = 'gemini-3-pro-preview'; // Using Gemini 3 Pro for best vision capabilities

export function createGeminiClient(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: MODEL_VERSION });
}

export interface DetectedFace {
    id: string;
    photoIndex: number;
    boundingBox: {
        x: number; // 0-1000 normalized usually by Gemini, but we asked for percentages/normalized. 
        // We will ask for 0-1000 in prompt to be explicit.
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
    expression?: string;
}

export interface FaceDetectionResult {
    faces: DetectedFace[];
    // grouping logic can be done client side or asked from Gemini.
    // For MVP, asking Gemini to group is powerful.
    groups?: {
        personId: string;
        faceIds: string[];
    }[];
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
    Analyze these ${images.length} group photos.
    1. Detect all faces. For each face, provide a boundingBox with ymin, xmin, ymax, xmax coordinates (normalized 0-1000).
    2. Group faces belonging to the same person across the photos. Assign a unique "personId" to each group.
    3. For each face, assess the expression quality (smiling, eyes open, looking at camera) and assign a "score" (0-1).
    
    Return ONLY valid JSON in this format:
    {
      "faces": [
        {
          "id": "face_0_1", // unique id, e.g., photoIndex_faceIndex
          "photoIndex": 0,  // 0-based index of the photo array
          "boundingBox": { "ymin": 0, "xmin": 0, "ymax": 0, "xmax": 0 },
          "personId": "person_A",
          "score": 0.95,
          "expression": "smiling, eyes open"
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
