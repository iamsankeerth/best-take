export interface Photo {
    id: string;
    file: File;
    url: string;
    uploadedAt: Date;
    width: number;
    height: number;
}

export interface BoundingBox {
    x: number; // Normalized 0-1
    y: number;
    width: number;
    height: number;
}

export interface DetectedFace {
    id: string;
    photoId: string;
    boundingBox: BoundingBox;
    thumbnailUrl: string;
    confidence: number;
    embedding?: number[];
}

export interface FaceGroup {
    personId: string;
    faces: DetectedFace[];
    bestFaceId: string;
}

export interface FaceSelection {
    basePhotoId: string;
    selectedFaces: Record<string, string>; // personId -> faceId
    timestamp: Date;
}

export type ProcessingStage =
    | 'idle'
    | 'uploading'
    | 'analyzing'
    | 'comparing'
    | 'generating'
    | 'complete'
    | 'error';
