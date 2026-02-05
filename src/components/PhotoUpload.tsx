'use client';

import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Upload, X, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageDimensions, resizeImage } from '@/lib/imageUtils';
import { detectFacesInPhotos } from '@/lib/gemini';
import { Photo, FaceGroup, DetectedFace } from '@/types';

export function PhotoUpload() {
    const {
        photos,
        addPhotos,
        removePhoto,
        apiKey,
        setProcessingStage,
        setFaceGroups,
        initializeSelection,
        setCompositeUrl,
        setError
    } = useAppStore();

    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const buildFaceGroupsByPosition = (faces: DetectedFace[], photosList: Photo[]) => {
        type Cluster = {
            personId: string;
            faces: DetectedFace[];
            centroid: { x: number; y: number; w: number; h: number };
        };

        const facesByPhoto = new Map<string, DetectedFace[]>();
        for (const face of faces) {
            if (!facesByPhoto.has(face.photoId)) facesByPhoto.set(face.photoId, []);
            facesByPhoto.get(face.photoId)!.push(face);
        }

        const clusters: Cluster[] = [];
        const distanceThreshold = 0.12;
        const sizeRatioMin = 0.6;
        const sizeRatioMax = 1.6;

        const updateCentroid = (cluster: Cluster) => {
            const count = cluster.faces.length;
            const sum = cluster.faces.reduce((acc, face) => {
                const cx = face.boundingBox.x + face.boundingBox.width / 2;
                const cy = face.boundingBox.y + face.boundingBox.height / 2;
                return {
                    x: acc.x + cx,
                    y: acc.y + cy,
                    w: acc.w + face.boundingBox.width,
                    h: acc.h + face.boundingBox.height
                };
            }, { x: 0, y: 0, w: 0, h: 0 });

            cluster.centroid = {
                x: sum.x / count,
                y: sum.y / count,
                w: sum.w / count,
                h: sum.h / count
            };
        };

        for (const photo of photosList) {
            const facesForPhoto = facesByPhoto.get(photo.id) || [];
            for (const face of facesForPhoto) {
                const centerX = face.boundingBox.x + face.boundingBox.width / 2;
                const centerY = face.boundingBox.y + face.boundingBox.height / 2;

                let bestIndex = -1;
                let bestDist = Infinity;

                clusters.forEach((cluster, idx) => {
                    if (cluster.faces.some((f) => f.photoId === face.photoId)) return;
                    const dist = Math.hypot(centerX - cluster.centroid.x, centerY - cluster.centroid.y);
                    const sizeRatio = face.boundingBox.width / cluster.centroid.w;
                    if (sizeRatio < sizeRatioMin || sizeRatio > sizeRatioMax) return;
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIndex = idx;
                    }
                });

                if (bestIndex !== -1 && bestDist < distanceThreshold) {
                    clusters[bestIndex].faces.push(face);
                    updateCentroid(clusters[bestIndex]);
                } else {
                    const newCluster: Cluster = {
                        personId: `person_${clusters.length + 1}`,
                        faces: [face],
                        centroid: {
                            x: centerX,
                            y: centerY,
                            w: face.boundingBox.width,
                            h: face.boundingBox.height
                        }
                    };
                    clusters.push(newCluster);
                }
            }
        }

        return clusters.map((cluster) => {
            const bestFace = cluster.faces.reduce((best, face) =>
                face.confidence > best.confidence ? face : best, cluster.faces[0]);

            return {
                personId: cluster.personId,
                faces: cluster.faces,
                bestFaceId: bestFace.id
            };
        });
    };

    const processFiles = async (files: File[]) => {
        setIsProcessing(true);
        const newPhotos: Photo[] = [];

        for (const file of files) {
            try {
                if (newPhotos.length + photos.length >= 10) break;

                let processedFile = file;

                if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
                    const heic2any = (await import('heic2any')).default;
                    const blob = await heic2any({ blob: file, toType: 'image/jpeg' });
                    const newBlob = Array.isArray(blob) ? blob[0] : blob;
                    processedFile = new File([newBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
                }

                const resized = await resizeImage(processedFile);
                const dims = await getImageDimensions(resized);
                const url = URL.createObjectURL(resized);

                newPhotos.push({
                    id: crypto.randomUUID(),
                    file: resized,
                    url,
                    uploadedAt: new Date(),
                    width: dims.width,
                    height: dims.height
                });

            } catch (err) {
                console.error('Failed to process file', file.name, err);
            }
        }

        addPhotos(newPhotos);
        setIsProcessing(false);
    };

    const handleFindBestTakes = async () => {
        if (!apiKey || photos.length < 2) return;

        try {
            setProcessingStage('analyzing');
            setError(null);
            setCompositeUrl(null);

            const result = await detectFacesInPhotos(
                apiKey,
                photos.map(p => p.file)
            );

            setProcessingStage('comparing');

            const groupedByPerson = new Map<string, DetectedFace[]>();
            const allFaces: DetectedFace[] = [];

            if (!result.faces || !Array.isArray(result.faces)) {
                throw new Error('Invalid response from AI: No faces detected.');
            }

            for (const item of result.faces) {
                const personId = item.personId || `person_${Math.random().toString(36).slice(2, 10)}`;
                if (!groupedByPerson.has(personId)) {
                    groupedByPerson.set(personId, []);
                }

                const photoIndex = typeof item.photoIndex === 'number' ? item.photoIndex : 0;
                const photo = photos[photoIndex];
                if (!photo) continue;

                if (!Array.isArray(item.box_2d) || item.box_2d.length < 4) {
                    console.warn('Invalid box_2d format for face', item);
                    continue;
                }

                const [ymin, xmin, ymax, xmax] = item.box_2d;

                const landmarks = item.landmarks ? {
                    leftEye: { x: item.landmarks.left_eye[0] / 1000, y: item.landmarks.left_eye[1] / 1000 },
                    rightEye: { x: item.landmarks.right_eye[0] / 1000, y: item.landmarks.right_eye[1] / 1000 },
                    nose: { x: item.landmarks.nose[0] / 1000, y: item.landmarks.nose[1] / 1000 },
                    mouth: { x: item.landmarks.mouth[0] / 1000, y: item.landmarks.mouth[1] / 1000 }
                } : undefined;

                const mappedFace: DetectedFace = {
                    id: crypto.randomUUID(),
                    photoId: photo.id,
                    boundingBox: {
                        x: xmin / 1000,
                        y: ymin / 1000,
                        width: (xmax - xmin) / 1000,
                        height: (ymax - ymin) / 1000
                    },
                    thumbnailUrl: photo.url,
                    confidence: item.score ?? 0.8,
                    landmarks
                };

                groupedByPerson.get(personId)!.push(mappedFace);
                allFaces.push(mappedFace);
            }

            let faceGroups: FaceGroup[] = [];
            groupedByPerson.forEach((faces, personId) => {
                const bestFace = faces.reduce((best, face) =>
                    face.confidence > best.confidence ? face : best, faces[0]);

                faceGroups.push({
                    personId,
                    faces,
                    bestFaceId: bestFace.id
                });
            });

            const multiPhotoGroupExists = faceGroups.some((group) => {
                const photoSet = new Set(group.faces.map((f) => f.photoId));
                return photoSet.size > 1;
            });

            if (!multiPhotoGroupExists || faceGroups.length === allFaces.length) {
                faceGroups = buildFaceGroupsByPosition(allFaces, photos);
            }

            setFaceGroups(faceGroups);

            if (photos.length > 0) {
                const baseId = photos[0].id;
                initializeSelection(baseId, faceGroups);
            }

            setProcessingStage('complete');

        } catch (err: unknown) {
            console.error('Face detection failed', err);
            const message = err instanceof Error ? err.message : 'Failed to detect faces. Please try again.';
            setError(message);
            setProcessingStage('error');
        }
    };

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            processFiles(Array.from(e.dataTransfer.files));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photos]);

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            processFiles(Array.from(e.target.files));
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">

            <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={cn(
                    'relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200 group bg-surface',
                    isDragging
                        ? 'border-accent bg-accent/10 scale-[1.01]'
                        : 'border-black/10 hover:border-black/20 hover:bg-black/5'
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,.heic"
                    className="hidden"
                    onChange={onFileSelect}
                />

                <div className="flex flex-col items-center gap-4">
                    <div className={cn(
                        'p-5 rounded-full transition-colors duration-300',
                        isDragging ? 'bg-accent text-white' : 'bg-black/5 text-secondary-text group-hover:bg-black/10 group-hover:text-foreground'
                    )}>
                        <Upload size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Upload Group Photos</h3>
                        <p className="text-secondary-text max-w-sm mx-auto">
                            Drag and drop or tap to select 2-10 photos of your group.
                            <br />
                            <span className="text-xs opacity-60">JPEG, PNG, HEIC supported - Max 10MB each</span>
                        </p>
                    </div>
                </div>
            </div>

            {photos.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary-text">{photos.length} photo{photos.length !== 1 ? 's' : ''} added</span>
                        {photos.length < 2 && (
                            <span className="text-orange-600 flex items-center gap-1.5">
                                <AlertCircle size={14} /> Need at least 2 photos
                            </span>
                        )}
                        {photos.length >= 10 && (
                            <span className="text-yellow-600 flex items-center gap-1.5">
                                <AlertCircle size={14} /> Maximum 10 photos reached
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {photos.map((photo, idx) => (
                            <div
                                key={photo.id}
                                className="group relative aspect-[3/4] bg-surface rounded-2xl overflow-hidden border border-black/10 hover:border-black/20 transition-colors"
                            >
                                <img
                                    src={photo.url}
                                    alt={`Upload ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <button
                                    onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-500/90 rounded-full text-secondary-text hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                >
                                    <X size={14} />
                                </button>

                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/85 rounded-lg text-xs text-secondary-text opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                    Photo {idx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {photos.length >= 2 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-black/10">
                    <p className="text-sm text-secondary-text">
                        Ready. We will analyze your photos and find the best expressions.
                    </p>
                    <button
                        onClick={handleFindBestTakes}
                        className="bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-8 rounded-full shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
                    >
                        <Sparkles size={18} />
                        <span>Find Best Takes</span>
                    </button>
                </div>
            )}

            {isProcessing && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-foreground font-medium">Processing images...</p>
                </div>
            )}
        </div>
    );
}
