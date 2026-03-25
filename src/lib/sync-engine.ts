// Sync Engine - Client-side playback synchronization

interface SyncState {
    isPlaying: boolean;
    currentTime: number;
    serverTime: number;
    lastUpdate: number;
}

interface SyncEngineConfig {
    syncInterval: number;  // How often to check sync (ms)
    driftThreshold: number; // Max allowed drift before correction (ms)
    maxCorrection: number;  // Max time jump for correction (seconds)
}

const DEFAULT_CONFIG: SyncEngineConfig = {
    syncInterval: 2000,    // Check every 2 seconds
    driftThreshold: 250,   // 250ms tolerance
    maxCorrection: 5,      // Max 5 second jump
};

export class SyncEngine {
    private config: SyncEngineConfig;
    private ws: WebSocket | null = null;
    private syncIntervalId: NodeJS.Timeout | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private isHost: boolean = false;
    private roomId: string = '';
    private onSyncStatusChange?: (status: 'synced' | 'syncing' | 'out-of-sync') => void;

    constructor(config: Partial<SyncEngineConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // Connect to sync server
    connect(roomId: string, wsUrl: string, isHost: boolean): Promise<void> {
        return new Promise((resolve, reject) => {
            this.roomId = roomId;
            this.isHost = isHost;

            try {
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('[SyncEngine] Connected to server');
                    this.ws?.send(JSON.stringify({
                        type: 'join',
                        roomId,
                        isHost,
                    }));
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleServerMessage(data);
                };

                this.ws.onerror = (error) => {
                    console.error('[SyncEngine] WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('[SyncEngine] Disconnected from server');
                    this.stopSyncLoop();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    // Attach video element for sync
    attachVideo(videoElement: HTMLVideoElement): void {
        this.videoElement = videoElement;

        // Listen for local playback events
        videoElement.addEventListener('play', () => this.broadcastState());
        videoElement.addEventListener('pause', () => this.broadcastState());
        videoElement.addEventListener('seeked', () => this.broadcastState());

        // Start sync loop
        this.startSyncLoop();
    }

    // Broadcast current playback state to server
    private broadcastState(): void {
        if (!this.ws || !this.videoElement || !this.isHost) return;

        const state: SyncState = {
            isPlaying: !this.videoElement.paused,
            currentTime: this.videoElement.currentTime,
            serverTime: Date.now(),
            lastUpdate: Date.now(),
        };

        this.ws.send(JSON.stringify({
            type: 'sync',
            roomId: this.roomId,
            state,
        }));
    }

    // Handle incoming server messages
    private handleServerMessage(data: any): void {
        switch (data.type) {
            case 'sync':
                this.handleSyncUpdate(data.state);
                break;
            case 'play':
                this.handlePlay(data.time);
                break;
            case 'pause':
                this.handlePause(data.time);
                break;
            case 'seek':
                this.handleSeek(data.time);
                break;
            case 'chat':
                // Handle via store
                break;
            case 'reaction':
                // Handle via store
                break;
        }
    }

    // Handle sync update from server
    private handleSyncUpdate(serverState: SyncState): void {
        if (!this.videoElement || this.isHost) return;

        const networkDelay = (Date.now() - serverState.serverTime) / 1000;
        const expectedTime = serverState.currentTime + networkDelay;
        const drift = Math.abs(this.videoElement.currentTime - expectedTime);

        console.log(`[SyncEngine] Drift: ${(drift * 1000).toFixed(0)}ms`);

        if (drift * 1000 > this.config.driftThreshold) {
            this.onSyncStatusChange?.('syncing');

            if (drift < this.config.maxCorrection) {
                // Small drift - adjust smoothly
                this.videoElement.currentTime = expectedTime;
                console.log(`[SyncEngine] Corrected to ${expectedTime.toFixed(2)}s`);
            } else {
                // Large drift - seek directly
                this.videoElement.currentTime = expectedTime;
                console.log(`[SyncEngine] Large correction to ${expectedTime.toFixed(2)}s`);
            }

            setTimeout(() => {
                this.onSyncStatusChange?.('synced');
            }, 500);
        }

        // Match play/pause state
        if (serverState.isPlaying && this.videoElement.paused) {
            this.videoElement.play();
        } else if (!serverState.isPlaying && !this.videoElement.paused) {
            this.videoElement.pause();
        }
    }

    private handlePlay(serverTime: number): void {
        if (!this.videoElement) return;
        this.videoElement.currentTime = serverTime;
        this.videoElement.play();
    }

    private handlePause(serverTime: number): void {
        if (!this.videoElement) return;
        this.videoElement.pause();
        this.videoElement.currentTime = serverTime;
    }

    private handleSeek(time: number): void {
        if (!this.videoElement) return;
        this.videoElement.currentTime = time;
    }

    // Start periodic sync check
    private startSyncLoop(): void {
        if (this.syncIntervalId) return;

        this.syncIntervalId = setInterval(() => {
            if (this.isHost) {
                this.broadcastState();
            }
        }, this.config.syncInterval);
    }

    // Stop sync loop
    private stopSyncLoop(): void {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }

    // Host controls
    play(): void {
        if (!this.isHost || !this.videoElement) return;
        this.videoElement.play();
        this.broadcastState();
    }

    pause(): void {
        if (!this.isHost || !this.videoElement) return;
        this.videoElement.pause();
        this.broadcastState();
    }

    seek(time: number): void {
        if (!this.isHost || !this.videoElement) return;
        this.videoElement.currentTime = time;
        this.broadcastState();
    }

    // Set callback for sync status changes
    onStatusChange(callback: (status: 'synced' | 'syncing' | 'out-of-sync') => void): void {
        this.onSyncStatusChange = callback;
    }

    // Disconnect and cleanup
    disconnect(): void {
        this.stopSyncLoop();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.videoElement = null;
    }
}

export default SyncEngine;
