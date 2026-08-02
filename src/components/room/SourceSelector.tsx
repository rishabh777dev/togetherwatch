'use client';

import { videoSources } from '@/lib/videoSources';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface SourceSelectorProps {
    currentSourceId?: string;
    currentSource?: string;
    onSourceChange: (sourceId: string) => void;
    disabled?: boolean;
    filterAnimeOnly?: boolean;
}

export default function SourceSelector({
    currentSourceId,
    currentSource,
    onSourceChange,
    disabled = false,
    filterAnimeOnly = false
}: SourceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const sourcesToShow = filterAnimeOnly
        ? videoSources.filter(source => source.id.includes('hianime') || source.id.includes('gogoanime'))
        : videoSources;

    const activeSourceId = currentSourceId || currentSource || sourcesToShow[0]?.id;
    const activeSource = sourcesToShow.find(source => source.id === activeSourceId) || sourcesToShow[0];

    const handleSelect = (sourceId: string) => {
        onSourceChange(sourceId);
        setIsOpen(false);
    };

    if (!activeSource) return null;

    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-3 py-2 transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                title="Switch video source"
            >
                <span className="text-lg">{activeSource.icon}</span>
                <span className="text-sm font-medium">{activeSource.name}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close source menu"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-bg-card shadow-lg">
                        <div className="p-2">
                            <p className="mb-1 px-2 py-1 text-xs text-text-muted">
                                Switch Video Source
                            </p>

                            {sourcesToShow.map(source => (
                                <button
                                    key={source.id}
                                    onClick={() => handleSelect(source.id)}
                                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                                        source.id === activeSourceId
                                            ? 'bg-accent text-white'
                                            : 'hover:bg-bg-hover'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{source.icon}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-0.5 flex items-center gap-2">
                                                <span className="text-sm font-semibold">{source.name}</span>
                                                {source.id === activeSourceId && (
                                                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mb-1 text-xs text-text-secondary">
                                                {source.description}
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {source.features.map(feature => (
                                                    <span
                                                        key={feature}
                                                        className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs"
                                                    >
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-border bg-bg-secondary px-3 py-2">
                            <p className="text-xs text-text-muted">
                                Different sources may have different languages and quality.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
