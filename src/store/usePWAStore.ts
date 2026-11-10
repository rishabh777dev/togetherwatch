import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAState {
    isInstallable: boolean;
    isInstalled: boolean;
    isIOS: boolean;
    showIOSPrompt: boolean;
    deferredPrompt: BeforeInstallPromptEvent | null;
    setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
    setIsInstallable: (val: boolean) => void;
    setIsInstalled: (val: boolean) => void;
    setIsIOS: (val: boolean) => void;
    setShowIOSPrompt: (val: boolean) => void;
    promptInstall: () => Promise<boolean>;
}

export const usePWAStore = create<PWAState>((set, get) => ({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    showIOSPrompt: false,
    deferredPrompt: null,

    setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt, isInstallable: !!prompt }),
    setIsInstallable: (isInstallable) => set({ isInstallable }),
    setIsInstalled: (isInstalled) => set({ isInstalled }),
    setIsIOS: (isIOS) => set({ isIOS }),
    setShowIOSPrompt: (showIOSPrompt) => set({ showIOSPrompt }),

    promptInstall: async () => {
        const { deferredPrompt, isIOS } = get();

        // If on iOS, open the iOS instruction guide
        if (isIOS) {
            set({ showIOSPrompt: true });
            return false;
        }

        if (!deferredPrompt) {
            return false;
        }

        try {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
                set({ isInstalled: true, isInstallable: false, deferredPrompt: null });
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.error('Error triggering PWA install prompt:', err);
            return false;
        }
    },
}));
