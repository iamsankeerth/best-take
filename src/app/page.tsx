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
    photos,
    faceGroups,
    processingStage,
    setApiKey,
    clearApiKey,
    reset
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initialize();
    setMounted(true);
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

  // Prevent hydration mismatch by not rendering step-specific UI until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen bg-black text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <ImageIcon className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">BestTake</h1>
              </div>
            </div>
          </header>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">

      {/* Background Ambience */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">

        {/* Header */}
        <header className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ImageIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">BestTake</h1>
              <p className="text-xs text-secondary-text">Create perfect group photos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {apiKey && (
              <>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs text-white/50">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  API Connected
                </div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-secondary-text hover:text-white"
                >
                  <Settings size={18} />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Settings Dropdown */}
        {showSettings && (
          <div className="absolute right-6 top-20 w-64 bg-surface border border-white/10 rounded-xl p-4 shadow-xl z-50 animate-in slide-in-from-top-2 duration-200">
            <h3 className="text-sm font-medium mb-3">Settings</h3>
            <button
              onClick={handleClearApiKey}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
