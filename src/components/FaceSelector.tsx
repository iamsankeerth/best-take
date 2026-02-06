'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { FaceThumbnail } from './FaceThumbnail';
import { cn } from '@/lib/utils';
import { Undo2, Redo2, RotateCcw, Download, Share2, Eye, EyeOff, Wand2 } from 'lucide-react';
import { cropBoundingBoxToBlob } from '@/lib/imageUtils';
import { editWithQwen } from '@/lib/qwen';

export function FaceSelector() {
    const {
        photos,
        faceGroups,
        currentSelection,
        selectFace,
        undo,
        redo,
        undoStack,
        redoStack,
        isComparing,
        setComparing,
        reset,
        compositeUrl,
        setCompositeUrl,
        setError
    } = useAppStore();

    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (faceGroups.length > 0) {
            setSelectedPersonId(faceGroups[0].personId);
        }
    }, [faceGroups]);

    // Get base photo
    const basePhoto = photos.find(p => p.id === currentSelection?.basePhotoId);

    // Get faces for selected person
    const selectedPersonGroup = faceGroups.find(g => g.personId === selectedPersonId);

    const selectedFace = useMemo(() => {
        if (!selectedPersonGroup) return null;
        const selectedFaceId = currentSelection?.selectedFaces[selectedPersonGroup.personId] || selectedPersonGroup.bestFaceId;
        return selectedPersonGroup.faces.find((f) => f.id === selectedFaceId) || null;
    }, [currentSelection, selectedPersonGroup]);

    const handleApplyEdit = async () => {
        if (!basePhoto || !selectedFace) return;
        if (isEditing) return;

        try {
            setIsEditing(true);
            setError(null);

            const baseBlob = compositeUrl
                ? await fetch(compositeUrl).then((r) => r.blob())
                : basePhoto.file;

            const refBlob = await cropBoundingBoxToBlob(
                selectedFace.thumbnailUrl,
                selectedFace.boundingBox,
                0.25,
                0.98
            );

            const maxEdge = 1536;
            const scale = Math.min(1, maxEdge / Math.max(basePhoto.width, basePhoto.height));
            const targetWidth = Math.round(basePhoto.width * scale);
            const targetHeight = Math.round(basePhoto.height * scale);

            const resultBlob = await editWithQwen(baseBlob, [refBlob], {
                mode: 'best_take',
                width: targetWidth,
                height: targetHeight
            });

            const url = URL.createObjectURL(resultBlob);
            setCompositeUrl(url);
        } catch (err: unknown) {
            console.error('Qwen edit failed', err);
            const message = err instanceof Error ? err.message : 'Failed to run Qwen edit';
            setError(message);
        } finally {
            setIsEditing(false);
        }
    };

    const handleDownload = () => {
        const downloadUrl = compositeUrl || basePhoto?.url;
        if (!downloadUrl) return;

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `besttake-${Date.now()}.jpg`;
        link.click();
    };

    const handleShare = async () => {
        const shareUrl = compositeUrl || basePhoto?.url;
        if (!shareUrl || !navigator.share) return;

        try {
            const blob = await fetch(shareUrl).then(r => r.blob());
            const file = new File([blob], 'besttake.jpg', { type: 'image/jpeg' });
            await navigator.share({
                files: [file],
                title: 'My BestTake Photo'
            });
        } catch (err) {
            console.error('Share failed', err);
        }
    };

    if (!basePhoto) {
        return (
            <div className="flex items-center justify-center h-[60vh] text-secondary-text">
                No photo selected
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">

            {/* Top Action Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface border border-black/10 rounded-xl mb-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <button
                        onClick={undo}
                        disabled={undoStack.length === 0}
                        className="p-2 rounded-lg hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Undo"
                    >
                        <Undo2 size={18} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={redoStack.length === 0}
                        className="p-2 rounded-lg hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Redo"
                    >
                        <Redo2 size={18} />
                    </button>
                </div>

                <button
                    onClick={() => setComparing(!isComparing)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm",
                        isComparing ? "bg-accent/10 text-accent" : "bg-black/5 hover:bg-black/10"
                    )}
                >
                    {isComparing ? <EyeOff size={16} /> : <Eye size={16} />}
                    {isComparing ? 'Hide Original' : 'Compare'}
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={reset}
                    className="p-2 rounded-lg hover:bg-black/5 text-secondary-text hover:text-foreground transition-colors"
                        title="Reset"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>

            {/* Main Photo Area */}
            <div className="flex-1 relative bg-surface border border-black/10 rounded-2xl overflow-hidden flex items-center justify-center p-4 shadow-sm">
                <div className="relative inline-block">
                    <img
                        src={isComparing || !compositeUrl ? basePhoto.url : compositeUrl}
                        alt="Base photo"
                        className="max-w-full max-h-[70vh] block pointer-events-none rounded-lg shadow-sm"
                    />

                    {/* Face highlight overlays */}
                    {faceGroups.map((group) => {
                        const selectedFace = group.faces.find(f => f.photoId === basePhoto.id);
                        if (!selectedFace) return null;

                        const bb = selectedFace.boundingBox;
                        const isThisPersonSelected = selectedPersonId === group.personId;

                        // ASPECT-RATIO AWARE CIRCLE MATH
                        const padding = 0.06;
                        const hleft = Math.max(0, bb.x - bb.width * padding);
                        const htop = Math.max(0, bb.y - bb.height * padding);
                        const hwidth = Math.min(1 - hleft, bb.width * (1 + padding * 2));
                        const hheight = Math.min(1 - htop, bb.height * (1 + padding * 2));

                        return (
                            <button
                                key={group.personId}
                                onClick={() => setSelectedPersonId(isThisPersonSelected ? null : group.personId)}
                                className={cn(
                                    "absolute border transition-all duration-200 cursor-pointer rounded-xl",
                                    isThisPersonSelected
                                        ? "border-accent bg-accent/10 shadow-sm"
                                        : "border-black/20 hover:border-black/40 hover:bg-black/5"
                                )}
                                style={{
                                    left: `${hleft * 100}%`,
                                    top: `${htop * 100}%`,
                                    width: `${hwidth * 100}%`,
                                    height: `${hheight * 100}%`,
                                    zIndex: isThisPersonSelected ? 20 : 10
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Face Strip */}
            <div className="mt-4 bg-surface border border-black/10 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    <span className="text-xs text-secondary-text flex-shrink-0">People:</span>

                    {faceGroups.map((group) => {
                        const bestFace = group.faces.find(f => f.id === group.bestFaceId) || group.faces[0];
                        const isSelected = selectedPersonId === group.personId;
                        const facePhoto = photos.find((p) => p.id === bestFace.photoId) || basePhoto;
                        const aspectRatio = facePhoto.width / facePhoto.height;

                        return (
                            <FaceThumbnail
                                key={group.personId}
                                imageUrl={bestFace?.thumbnailUrl || basePhoto.url}
                                boundingBox={bestFace?.boundingBox}
                                aspectRatio={aspectRatio}
                                isSelected={isSelected}
                                onClick={() => setSelectedPersonId(isSelected ? null : group.personId)}
                            />
                        );
                    })}
                </div>

                {/* Face Variations */}
                {selectedPersonGroup && (
                    <div className="mt-4 pt-4 border-t border-black/10">
                        <div className="text-xs text-secondary-text mb-3">
                            Select best expression:
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto">
                            {selectedPersonGroup.faces.map((face) => {
                                const isCurrentSelection = currentSelection?.selectedFaces[selectedPersonGroup.personId] === face.id;
                                const isBestMatch = face.id === selectedPersonGroup.bestFaceId;
                                const facePhoto = photos.find((p) => p.id === face.photoId) || basePhoto;
                                const aspectRatio = facePhoto.width / facePhoto.height;

                                return (
                                    <div key={face.id} className="flex flex-col items-center gap-1">
                                        <FaceThumbnail
                                            imageUrl={face.thumbnailUrl}
                                            boundingBox={face.boundingBox}
                                            aspectRatio={aspectRatio}
                                            isSelected={isCurrentSelection}
                                            isHighlighted={isBestMatch && !isCurrentSelection}
                                            confidence={face.confidence}
                                            size="lg"
                                            onClick={() => selectFace(selectedPersonGroup.personId, face.id)}
                                        />
                                        {isBestMatch && (
                                            <span className="text-[10px] text-accent">Best</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="mt-4 flex items-center justify-between">
                <button
                    onClick={reset}
                    className="text-secondary-text hover:text-foreground transition-colors text-sm"
                >
                    Start Over
                </button>

                <div className="flex items-center gap-3">
                    {isEditing && (
                        <span className="text-xs text-secondary-text">Applying AI edit...</span>
                    )}
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 rounded-xl transition-colors"
                        >
                            <Share2 size={18} />
                            <span>Share</span>
                        </button>
                    )}

                    <button
                        onClick={handleApplyEdit}
                        disabled={!selectedFace || isEditing}
                        className="flex items-center gap-2 px-5 py-2 bg-white border border-black/10 hover:border-black/20 rounded-xl font-medium text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Wand2 size={18} />
                        <span>Apply Best Take</span>
                    </button>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent/90 rounded-xl font-medium text-white transition-colors"
                    >
                        <Download size={18} />
                        <span>Download</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
