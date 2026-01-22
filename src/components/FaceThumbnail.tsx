'use client';

import { cn } from '@/lib/utils';

interface FaceThumbnailProps {
    imageUrl: string;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    aspectRatio?: number; // width / height of original photo
    isSelected?: boolean;
    isHighlighted?: boolean;
    confidence?: number;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-24 h-24'
};

export function FaceThumbnail({
    imageUrl,
    boundingBox,
    aspectRatio = 1,
    isSelected = false,
    isHighlighted = false,
    confidence,
    size = 'md',
    onClick
}: FaceThumbnailProps) {
    // Calculate CSS for zoomed face
    const getZoomStyle = () => {
        if (!boundingBox) return { width: '100%', height: '100%', objectFit: 'cover' as const };

        const padding = 1.4;

        // We calculate everything relative to the container's WIDTH (which is 1:1)
        // If the original image is wider than tall (AR > 1):
        // Height is H_img = W_img / AR.
        // We want the face box (which is bb.width * W_img) to be scaled.
        const boxSize = Math.max(boundingBox.width, boundingBox.height / aspectRatio) * padding;
        const scale = 1 / boxSize;

        const centerX = boundingBox.x + boundingBox.width / 2;
        const centerY = boundingBox.y + boundingBox.height / 2;

        return {
            position: 'absolute' as const,
            width: `${scale * 100}%`,
            height: 'auto',
            left: `${(0.5 - centerX * scale) * 100}%`,
            // Vertical centering must account for the fact that centerY is relative to H_img, 
            // but the container's height is relative to W_img * scale * (1/AR)? 
            top: `${(0.5 - centerY * (scale / aspectRatio)) * 100}%`,
            display: 'block'
        };
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "relative rounded-full overflow-hidden transition-all duration-200 flex-shrink-0 bg-neutral-900",
                sizeClasses[size],
                isSelected && "ring-4 ring-accent ring-offset-4 ring-offset-black scale-105 z-10",
                isHighlighted && "ring-2 ring-white/50",
                !isSelected && !isHighlighted && "ring-2 ring-white/10 hover:ring-white/30",
                "hover:scale-105 active:scale-95 shadow-xl"
            )}
        >
            <div className="w-full h-full overflow-hidden flex items-center justify-center pointer-events-none relative">
                <img
                    src={imageUrl}
                    alt="Face"
                    style={getZoomStyle()}
                    className="max-w-none transition-transform duration-500 ease-out"
                />
            </div>

            {/* Glow effect on hover/selection */}
            <div className={cn(
                "absolute inset-0 pointer-events-none transition-opacity duration-300",
                isSelected ? "opacity-100" : "opacity-0",
                "bg-gradient-to-t from-accent/30 to-transparent"
            )} />

            {/* Confidence indicator bar */}
            {confidence !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 overflow-hidden">
                    <div
                        className={cn(
                            "h-full transition-all duration-1000",
                            confidence > 0.8 ? "bg-green-500" : confidence > 0.5 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${confidence * 100}%` }}
                    />
                </div>
            )}
        </button>
    );
}
