'use client';

import { cn } from '@/lib/utils';

interface ProgressStepsProps {
    currentStep: number;
    steps: string[];
}

export function ProgressSteps({ currentStep, steps }: ProgressStepsProps) {
    return (
        <div className="flex items-center justify-center gap-2 py-4">
            {steps.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isActive = idx === currentStep;

                return (
                    <div key={step} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                                isCompleted && "bg-accent text-white",
                                isActive && "bg-accent/20 border-2 border-accent text-accent",
                                !isCompleted && !isActive && "bg-surface border border-white/20 text-secondary-text"
                            )}>
                                {isCompleted ? '✓' : idx + 1}
                            </div>
                            <span className={cn(
                                "text-xs mt-1 transition-colors",
                                isActive ? "text-white" : "text-secondary-text"
                            )}>
                                {step}
                            </span>
                        </div>

                        {idx < steps.length - 1 && (
                            <div className={cn(
                                "w-12 h-0.5 mx-2",
                                isCompleted ? "bg-accent" : "bg-white/10"
                            )} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

interface ProcessingOverlayProps {
    stage: string;
    progress?: number;
}

export function ProcessingOverlay({ stage, progress }: ProcessingOverlayProps) {
    const stageMessages: Record<string, string> = {
        uploading: 'Uploading photos...',
        analyzing: 'Detecting faces...',
        comparing: 'Grouping similar faces...',
        generating: 'Creating your best take...'
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-6" />

            <h3 className="text-xl font-bold text-white mb-2">
                {stageMessages[stage] || 'Processing...'}
            </h3>

            {progress !== undefined && (
                <div className="w-64 mt-4">
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent transition-all duration-300 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-secondary-text text-center mt-2">
                        {Math.round(progress)}%
                    </p>
                </div>
            )}
        </div>
    );
}
