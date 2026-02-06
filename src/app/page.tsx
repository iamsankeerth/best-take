'use client';

import { useEffect } from 'react';
import { PhotoUpload } from '@/components/PhotoUpload';
import { FaceSelector } from '@/components/FaceSelector';
import { ProcessingOverlay } from '@/components/ProgressSteps';
import { useAppStore } from '@/store/useAppStore';
import { ImageIcon } from 'lucide-react';

type AppStep = 'upload' | 'processing' | 'edit';

export default function Home() {
  const {
    initialize,
    faceGroups,
    processingStage
  } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Determine current step
  const getCurrentStep = (): AppStep => {
    if (processingStage !== 'idle' && processingStage !== 'complete' && processingStage !== 'error') {
      return 'processing';
    }
    if (faceGroups.length > 0) return 'edit';
    return 'upload';
  };

  const currentStep = getCurrentStep();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
              <ImageIcon className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">BestTake</h1>
              <p className="text-xs text-secondary-text">Create perfect group photos</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-black/10 text-xs text-secondary-text">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Local AI Ready
          </div>
        </header>

        {/* Main Content */}
        <div className="min-h-[calc(100vh-8rem)]">
          {currentStep === 'upload' && (
            <PhotoUpload />
          )}

          {currentStep === 'edit' && (
            <FaceSelector />
          )}
        </div>

        {/* Processing Overlay */}
        {currentStep === 'processing' && (
          <ProcessingOverlay stage={processingStage} />
        )}

      </div>
    </main>
  );
}
