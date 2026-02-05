'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Key, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ApiKeyInput() {
    const { apiKey, setApiKey } = useAppStore();
    const [inputValue, setInputValue] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim().length > 0) {
            setApiKey(inputValue.trim());
        }
    };

    if (apiKey) return null;

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-surface rounded-2xl border border-black/10 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center mb-6">
                <div className="p-3 bg-accent/10 rounded-full text-accent">
                    <Key className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Enter Gemini API Key</h2>
                <p className="text-sm text-secondary-text">
                    Your key is stored locally and used only to analyze your photos.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className={cn(
                    'relative group transition-all duration-200',
                    isFocused ? 'scale-[1.01]' : ''
                )}>
                    <input
                        type={isVisible ? 'text' : 'password'}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="AIzaSy..."
                        suppressHydrationWarning
                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 pr-12 text-foreground placeholder-black/30 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 transition-all font-mono text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setIsVisible(!isVisible)}
                        suppressHydrationWarning
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-text hover:text-foreground transition-colors"
                    >
                        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={inputValue.length < 10}
                    className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <span>Continue</span>
                    <ChevronRight size={18} />
                </button>
            </form>

            <div className="mt-6 text-center">
                <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-secondary-text hover:text-accent transition-colors underline decoration-black/20 hover:decoration-accent"
                >
                    Get a free API key here
                </a>
            </div>
        </div>
    );
}
