'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Key, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ApiKeyInput() {
    const { apiKey, setApiKey } = useAppStore();
    const [inputValue, setInputValue] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (apiKey) {
            setInputValue(apiKey);
        } else {
            setInputValue('');
        }
    }, [apiKey]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim().length > 0) {
            setApiKey(inputValue.trim());
        }
    };

    if (apiKey) return null; // Hide if already set (or show mini version?)
    // Actually masterplan says "API Key Entry Screen" is phase 1.

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-surface rounded-2xl border border-white/10 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center gap-4 text-center mb-6">
                <div className="p-3 bg-accent/10 rounded-full text-accent">
                    <Key className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white">Enter Gemini API Key</h2>
                <p className="text-sm text-secondary-text">
                    To process your photos securely, we need your Google Gemini API key.
                    It's stored locally in your browser and never sent to our servers.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className={cn(
                    "relative group transition-all duration-300",
                    isFocused ? "scale-[1.02]" : ""
                )}>
                    <input
                        type={isVisible ? "text" : "password"}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="AIzaSy..."
                        suppressHydrationWarning
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/20 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-mono text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setIsVisible(!isVisible)}
                        suppressHydrationWarning
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={inputValue.length < 10}
                    className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
                >
                    <span>Continue</span>
                    <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </form>

            <div className="mt-6 text-center">
                <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-secondary-text hover:text-accent transition-colors underline decoration-white/20 hover:decoration-accent"
                >
                    Get a free API key here →
                </a>
            </div>
        </div>
    );
}
