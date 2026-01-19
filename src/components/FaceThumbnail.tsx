'use client';

import { cn } from '@/lib/utils';

interface FaceThumbnailProps {
    imageUrl: string;
    isSelected?: boolean;
    isHighlighted?: boolean;
    confidence?: number;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20'
};

export function FaceThumbnail({
    imageUrl,
    isSelected = false,
    isHighlighted = false,
    confidence,
    size = 'md',
    onClick
}: FaceThumbnailProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative rounded-full overflow-hidden transition-all duration-200 flex-shrink-0",
                sizeClasses[size],
                isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-black scale-110",
                isHighlighted && "ring-2 ring-white/50",
                !isSelected && !isHighlighted && "ring-1 ring-white/20 hover:ring-white/40",
                "hover:scale-105 active:scale-95"
            )}
        >
            <img
                src={imageUrl}
                alt="Face"
                className="w-full h-full object-cover"
            />

            {/* Glow effect on hover/selection */}
            <div className={cn(
                "absolute inset-0 pointer-events-none transition-opacity duration-300",
                isSelected ? "opacity-100" : "opacity-0",
                "bg-gradient-to-t from-accent/30 to-transparent"
            )} />

            {/* Confidence indicator */}
            {confidence !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                    <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${confidence * 100}%` }}
                    />
                </div>
            )}
        </button>
    );
}
