'use client';

import Navbar from '@/components/Navbar';
import { getOrCreateUserId, markRoomAsHosted } from '@/lib/session';
import { useRoomStore } from '@/lib/store';
import { createRoom } from '@/lib/supabase';
import { getImageUrl, Movie, searchMulti } from '@/lib/tmdb';
import { ArrowLeft, ChevronRight, Film, Loader2, Play, Search, Tv, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

function CreateRoomContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedType = searchParams.get('type') as 'movie' | 'tv' | null;
    const preselectedId = searchParams.get('id');

    const { setRoomId, setRoomName, setIsHost, setMedia } = useRoomStore();

    const [roomName, setRoomNameLocal] = useState('Movie Night');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<Movie | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // If we have a preselected ID, fetch its details
    useEffect(() => {
        if (preselectedId && preselectedType) {
            setSelectedMedia({
                id: 0,
                imdbID: preselectedId,
                title: 'Selected Content',
                poster_path: '',
                backdrop_path: '',
                overview: '',
                vote_average: 0,
                media_type: preselectedType,
            });
        }
    }, [preselectedId, preselectedType]);

    // Debounced search
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchMulti(query);
            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    const handleCreateRoom = async () => {
        if (!roomName.trim()) return;

        setIsCreating(true);

        const mediaId = selectedMedia?.imdbID || preselectedId || '';
        const mediaType = selectedMedia?.media_type || preselectedType || 'movie';

        try {
            // Create room in Supabase
            const userId = getOrCreateUserId();
            const { room, error } = await createRoom({
                name: roomName,
                hostId: userId,
                mediaId: mediaId,
                mediaType: mediaType,
                mediaTitle: selectedMedia?.title || selectedMedia?.name,
            });

            if (error || !room) {
                console.error('Failed to create room:', error);
                setIsCreating(false);
                alert('Failed to create room. Please try again.');
                return;
            }

            // Set up room state
            setRoomId(room.code);
            setRoomName(room.name);
            setIsHost(true);
            markRoomAsHosted(room.code);

            if (selectedMedia) {
                const embedUrl = mediaType === 'tv'
                    ? `https://vidsrc.to/embed/tv/${mediaId}`
                    : `https://vidsrc.to/embed/movie/${mediaId}`;
                setMedia(embedUrl, mediaType, selectedMedia.id);
            }

            // Navigate to room using the simple code
            router.push(`/room/${room.code}`);
        } catch (err) {
            console.error('Error creating room:', err);
            setIsCreating(false);
            alert('Failed to create room. Please try again.');
        }
    };

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navbar />

            <div className="pt-24 pb-12 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Back */}
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="font-bold text-4xl mb-2">Create Watch Room</h1>
                        <p className="text-text-secondary">Set up your watch party and invite friends</p>
                    </div>

                    {/* Form */}
                    <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-6">
                        {/* Room Name */}
                        <div>
                            <label className="block text-sm text-text-secondary mb-2">Room Name</label>
                            <input
                                type="text"
                                value={roomName}
                                onChange={(e) => setRoomNameLocal(e.target.value)}
                                placeholder="Enter a fun name for your room"
                                className="input w-full text-lg"
                            />
                        </div>

                        {/* Media Selection */}
                        <div>
                            <label className="block text-sm text-text-secondary mb-2">What to Watch</label>

                            {selectedMedia ? (
                                <div className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary border border-accent/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 h-24 rounded-lg overflow-hidden bg-bg-tertiary relative">
                                            {selectedMedia.poster_path ? (
                                                <Image
                                                    src={getImageUrl(selectedMedia.poster_path)}
                                                    alt={selectedMedia.title || ''}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {selectedMedia.media_type === 'tv' ? (
                                                        <Tv className="w-6 h-6 text-text-muted" />
                                                    ) : (
                                                        <Film className="w-6 h-6 text-text-muted" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-medium">{selectedMedia.title || selectedMedia.name}</h4>
                                            <p className="text-sm text-text-muted capitalize">
                                                {selectedMedia.media_type || 'movie'}
                                                {selectedMedia.vote_average > 0 && ` - Rating ${selectedMedia.vote_average.toFixed(1)}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMedia(null)}
                                        className="text-sm text-accent hover:text-accent-light"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search for a movie or TV show..."
                                            className="input w-full pl-12"
                                        />
                                        {isSearching && (
                                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted animate-spin" />
                                        )}
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden max-h-80 overflow-y-auto">
                                            {searchResults.map((result) => (
                                                <button
                                                    key={result.imdbID || result.id}
                                                    onClick={() => {
                                                        setSelectedMedia(result);
                                                        setSearchQuery('');
                                                        setSearchResults([]);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-bg-hover transition-colors text-left"
                                                >
                                                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-bg-tertiary relative flex-shrink-0">
                                                        {result.poster_path ? (
                                                            <Image
                                                                src={getImageUrl(result.poster_path)}
                                                                alt={result.title || ''}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                {result.media_type === 'tv' ? (
                                                                    <Tv className="w-5 h-5 text-text-muted" />
                                                                ) : (
                                                                    <Film className="w-5 h-5 text-text-muted" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium truncate">{result.title || result.name}</h4>
                                                        <p className="text-sm text-text-muted">
                                                            {result.release_date?.split('-')[0] || result.first_air_date?.split('-')[0]}
                                                            {' - '}
                                                            {result.media_type === 'tv' ? 'TV Show' : 'Movie'}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* No results */}
                                    {searchQuery && !isSearching && searchResults.length === 0 && (
                                        <p className="text-center text-text-muted py-4">
                                            No results found for &quot;{searchQuery}&quot;
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={handleCreateRoom}
                            disabled={!roomName.trim() || isCreating}
                            className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all
                                ${roomName.trim() && !isCreating
                                    ? 'btn-primary'
                                    : 'bg-bg-tertiary text-text-muted cursor-not-allowed'}`}
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating Room...
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    Create Room
                                </>
                            )}
                        </button>
                    </div>

                    {/* Tips */}
                    <div className="mt-8 p-4 rounded-xl bg-bg-secondary border border-border">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4 text-accent" />
                            Tips for a Great Watch Party
                        </h4>
                        <ul className="text-sm text-text-secondary space-y-1">
                            <li>Share the room link with friends to invite them</li>
                            <li>Use the chat to react and discuss</li>
                            <li>Everyone stays in sync automatically</li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function CreateRoomPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-bg-primary flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </main>
        }>
            <CreateRoomContent />
        </Suspense>
    );
}
