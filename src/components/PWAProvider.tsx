'use client';

import { useEffect } from 'react';
import { usePWAStore } from '@/store/usePWAStore';
import { Share, PlusSquare, X, Smartphone, Monitor, Download } from 'lucide-react';
import Image from 'next/image';

export default function PWAProvider({ children }: { children: React.ReactNode }) {
    const {
        isInstalled,
        isIOS,
        showIOSPrompt,
        setDeferredPrompt,
        setIsInstallable,
        setIsInstalled,
        setIsIOS,
        setShowIOSPrompt,
    } = usePWAStore();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 1. Detect if already running in standalone mode (installed PWA)
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true;

        if (isStandalone) {
            setIsInstalled(true);
        }

        // 2. Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
        setIsIOS(isIOSDevice);

        if (isIOSDevice && !isStandalone) {
            setIsInstallable(true);
        }

        // 3. Register Service Worker
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('[PWA] Service Worker registered with scope:', registration.scope);
                    })
                    .catch((error) => {
                        console.error('[PWA] Service Worker registration failed:', error);
                    });
            });
        }

        // 4. Capture beforeinstallprompt for Chrome / Edge / Android / Desktop
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            // Store event in Zustand store so any button can trigger it
            setDeferredPrompt(e as unknown as Parameters<typeof setDeferredPrompt>[0]);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
            console.log('[PWA] App successfully installed!');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [setDeferredPrompt, setIsInstallable, setIsInstalled, setIsIOS]);

    return (
        <>
            {children}

            {/* iOS Add to Home Screen Instructions Modal */}
            {showIOSPrompt && (
                <div 
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowIOSPrompt(false)}
                >
                    <div 
                        className="w-full max-w-md bg-[#121318] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-slide-up text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowIOSPrompt(false)}
                            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                <Image
                                    src="/icon-192.png"
                                    alt="TogetherWatch"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Install TogetherWatch</h3>
                                <p className="text-xs text-text-secondary">Watch together in full screen on iOS</p>
                            </div>
                        </div>

                        <div className="space-y-3.5 my-5 text-sm text-white/80">
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                                    <Share className="w-4 h-4" />
                                </div>
                                <p>
                                    1. Tap the <span className="font-semibold text-white">Share</span> button in Safari's toolbar.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                                    <PlusSquare className="w-4 h-4" />
                                </div>
                                <p>
                                    2. Scroll down and tap <span className="font-semibold text-white">Add to Home Screen</span>.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                                    <Smartphone className="w-4 h-4" />
                                </div>
                                <p>
                                    3. Launch TogetherWatch anytime from your iPhone or iPad home screen!
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowIOSPrompt(false)}
                            className="w-full py-3 bg-accent hover:bg-accent-light text-white font-semibold rounded-2xl transition-all shadow-lg shadow-accent/30"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
