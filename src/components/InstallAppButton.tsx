'use client';

import { usePWAStore } from '@/store/usePWAStore';
import { Download, Monitor, CheckCircle2, Sparkles, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface InstallAppButtonProps {
    variant?: 'navbar' | 'mobile' | 'card' | 'floating';
    onInstalled?: () => void;
}

export default function InstallAppButton({ variant = 'navbar', onInstalled }: InstallAppButtonProps) {
    const { isInstallable, isInstalled, isIOS, promptInstall, setShowIOSPrompt } = usePWAStore();
    const [dismissed, setDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const isDismissed = sessionStorage.getItem('togetherwatch_install_dismissed');
            if (isDismissed) setDismissed(true);
        } catch (e) {}
    }, []);

    if (!mounted || isInstalled) return null;

    // Show if browser fired beforeinstallprompt OR if device is iOS (can be manually added to homescreen)
    const canPrompt = isInstallable || isIOS;

    const handleClick = async () => {
        if (isIOS) {
            setShowIOSPrompt(true);
            return;
        }
        const success = await promptInstall();
        if (success && onInstalled) {
            onInstalled();
        }
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDismissed(true);
        try {
            sessionStorage.setItem('togetherwatch_install_dismissed', 'true');
        } catch (e) {}
    };

    if (variant === 'navbar') {
        if (!canPrompt) return null;
        return (
            <button
                onClick={handleClick}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold tracking-wide transition-all duration-300 hover:scale-105 hover:border-accent/50 shadow-sm"
                title="Install TogetherWatch App"
            >
                <Download className="w-3.5 h-3.5 text-accent animate-bounce" />
                <span>Install App</span>
            </button>
        );
    }

    if (variant === 'mobile') {
        if (!canPrompt) return null;
        return (
            <button
                onClick={handleClick}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-accent/20 to-red-950/30 border border-accent/30 rounded-xl text-white font-medium transition-all hover:bg-accent/30"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/40">
                        <Download className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-white">Install App</p>
                        <p className="text-[11px] text-text-secondary">Add TogetherWatch to Home Screen</p>
                    </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent text-white uppercase tracking-wider">
                    Free
                </span>
            </button>
        );
    }

    if (variant === 'card') {
        return (
            <div className="p-5 bg-gradient-to-br from-bg-secondary via-[#14151c] to-bg-secondary rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent flex-shrink-0 shadow-lg shadow-accent/20">
                        <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                            TogetherWatch Native App
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-accent/20 text-accent rounded-full border border-accent/30">
                                PWA
                            </span>
                        </h4>
                        <p className="text-xs text-text-secondary mt-0.5">
                            Install on your Windows, Mac, Android, or iOS device for borderless standalone playback and instant launch.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleClick}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-light text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-accent/30 flex items-center gap-2 flex-shrink-0"
                >
                    <Download className="w-4 h-4" />
                    Install Now
                </button>
            </div>
        );
    }

    // Floating pill banner (shows bottom-right or bottom-center)
    if (variant === 'floating') {
        if (!canPrompt || dismissed) return null;
        return (
            <aside 
                aria-label="App installation prompt"
                className="fixed bottom-5 right-5 z-40 max-w-sm w-[calc(100vw-2.5rem)] sm:w-auto p-3.5 bg-[#121319]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl shadow-black/80 flex items-center gap-3.5 animate-slide-up"
            >
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 shadow-md shadow-accent/40">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                    <p className="text-xs font-bold text-white truncate">Install TogetherWatch</p>
                    <p className="text-[11px] text-text-secondary line-clamp-1">Faster access & fullscreen watching</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                        onClick={handleClick}
                        className="px-3 py-1.5 bg-accent hover:bg-accent-light text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-accent/30"
                    >
                        Install
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        title="Dismiss"
                        aria-label="Dismiss app install prompt"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </aside>
        );
    }

    return null;
}
