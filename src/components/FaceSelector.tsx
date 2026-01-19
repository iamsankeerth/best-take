'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { FaceThumbnail } from './FaceThumbnail';
import { cn } from '@/lib/utils';
import { Undo2, Redo2, RotateCcw, Download, Share2, Eye, EyeOff } from 'lucide-react';

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
        reset
    } = useAppStore();

    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

    // Get base photo
    const basePhoto = photos.find(p => p.id === currentSelection?.basePhotoId);

    // Get faces for selected person
    const selectedPersonGroup = faceGroups.find(g => g.personId === selectedPersonId);

    const handleDownload = () => {
        // For now just download the base photo
        if (basePhoto) {
            const link = document.createElement('a');
            link.href = basePhoto.url;
            link.download = `besttake-${Date.now()}.jpg`;
            link.click();
        }
    };

    const handleShare = async () => {
        if (!basePhoto || !navigator.share) return;

        try {
            const blob = await fetch(basePhoto.url).then(r => r.blob());
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
        <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">

            {/* Top Action Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface/50 backdrop-blur-md rounded-xl mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={undo}
                        disabled={undoStack.length === 0}
                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Undo"
                    >
                        <Undo2 size={18} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={redoStack.length === 0}
                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Redo"
                    >
                        <Redo2 size={18} />
                    </button>
                </div>

                <button
                    onClick={() => setComparing(!isComparing)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm",
                        isComparing ? "bg-accent text-white" : "bg-white/10 hover:bg-white/20"
                    )}
                >
                    {isComparing ? <EyeOff size={16} /> : <Eye size={16} />}
                    {isComparing ? 'Hide Original' : 'Compare'}
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={reset}
                        className="p-2 rounded-lg hover:bg-white/10 text-secondary-text hover:text-white transition-colors"
                        title="Reset"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>

            {/* Main Photo Area */}
            <div className="flex-1 relative bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                <img
                    src={basePhoto.url}
                    alt="Base photo"
                    className="max-w-full max-h-full object-contain"
                />

                {/* Face highlight overlays would go here */}
                {faceGroups.map((group) => {
                    const selectedFace = group.faces.find(f => f.photoId === basePhoto.id);
                    if (!selectedFace) return null;

                    const bb = selectedFace.boundingBox;
                    const isThisPersonSelected = selectedPersonId === group.personId;

                    return (
                        <button
                            key={group.personId}
                            onClick={() => setSelectedPersonId(isThisPersonSelected ? null : group.personId)}
                            className={cn(
                                "absolute border-2 rounded-lg transition-all duration-200 cursor-pointer",
                                isThisPersonSelected
                                    ? "border-accent bg-accent/20"
                                    : "border-transparent hover:border-white/50 hover:bg-white/10"
                            )}
                            style={{
                                left: `${bb.x * 100}%`,
                                top: `${bb.y * 100}%`,
                                width: `${bb.width * 100}%`,
                                height: `${bb.height * 100}%`
                            }}
                        />
                    );
                })}
            </div>

            {/* Face Strip */}
            <div className="mt-4 bg-surface/50 backdrop-blur-md rounded-xl p-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    <span className="text-xs text-secondary-text flex-shrink-0">People:</span>

                    {faceGroups.map((group) => {
                        // Show best face for each person
                        const bestFace = group.faces.find(f => f.id === group.bestFaceId) || group.faces[0];
                        const isSelected = selectedPersonId === group.personId;

                        return (
                            <FaceThumbnail
                                key={group.personId}
                                imageUrl={bestFace?.thumbnailUrl || basePhoto.url}
                                isSelected={isSelected}
                                onClick={() => setSelectedPersonId(isSelected ? null : group.personId)}
                            />
                        );
                    })}
                </div>

                {/* Face Variations */}
                {selectedPersonGroup && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="text-xs text-secondary-text mb-3">
                            Select best expression:
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto">
                            {selectedPersonGroup.faces.map((face) => {
                                const isCurrentSelection = currentSelection?.selectedFaces[selectedPersonGroup.personId] === face.id;
                                const isBestMatch = face.id === selectedPersonGroup.bestFaceId;

                                return (
                                    <div key={face.id} className="flex flex-col items-center gap-1">
                                        <FaceThumbnail
                                            imageUrl={face.thumbnailUrl}
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
                    className="text-secondary-text hover:text-white transition-colors text-sm"
                >
                    Start Over
                </button>

                <div className="flex items-center gap-3">
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                        >
                            <Share2 size={18} />
                            <span>Share</span>
                        </button>
                    )}

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent/90 rounded-xl font-medium transition-colors"
                    >
                        <Download size={18} />
                        <span>Download</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
