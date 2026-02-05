'use client';

import { useEffect, useState } from 'react';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { PhotoUpload } from '@/components/PhotoUpload';
import { FaceSelector } from '@/components/FaceSelector';
import { ProcessingOverlay } from '@/components/ProgressSteps';
import { useAppStore } from '@/store/useAppStore';
import { ImageIcon, Settings, Trash2 } from 'lucide-react';

type AppStep = 'api-key' | 'upload' | 'processing' | 'edit';

export default function Home() {
  const {
    apiKey,
    initialize,
    faceGroups,
    processingStage,
    clearApiKey,
    reset
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Determine current step
  const getCurrentStep = (): AppStep => {
    if (!apiKey) return 'api-key';
    if (processingStage !== 'idle' && processingStage !== 'complete' && processingStage !== 'error') {
      return 'processing';
    }
    if (faceGroups.length > 0) return 'edit';
    return 'upload';
  };

  const currentStep = getCurrentStep();

  const handleClearApiKey = () => {
    clearApiKey();
    reset();
    setShowSettings(false);
  };

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

          <div className="flex items-center gap-2">
            {apiKey && (
              <>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-black/10 text-xs text-secondary-text">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  API Connected
                </div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg hover:bg-black/5 transition-colors text-secondary-text"
                >
                  <Settings size={18} />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Settings Dropdown */}
        {showSettings && (
          <div className="absolute right-6 top-20 w-64 bg-surface border border-black/10 rounded-xl p-4 shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
            <h3 className="text-sm font-medium mb-3">Settings</h3>
            <button
              onClick={handleClearApiKey}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              Clear API Key
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="min-h-[calc(100vh-8rem)]">
          {currentStep === 'api-key' && (
            <div className="flex items-center justify-center h-[60vh]">
              <ApiKeyInput />
            </div>
          )}

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

      {/* Click outside to close settings */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}
