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
        ? videoSources.filter(s => s.id.includes('hianime') || s.id.includes('gogoanime'))
        : videoSources;

    const activeSourceId = currentSourceId || currentSource || sourcesToShow[0].id;
    const activeSource = sourcesToShow.find(s => s.id === activeSourceId) || sourcesToShow[0];

    const handleSelect = (sourceId: string) => {
        onSourceChange(sourceId);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Current Source Button */}
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary hover:bg-bg-hover border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Switch video source"
            >
                <span className="text-lg">{activeSource.icon}</span>
                <span className="text-sm font-medium">{activeSource.name}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full mt-2 left-0 w-80 bg-bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
                        <div className="p-2">
                            <p className="text-xs text-text-muted px-2 py-1 mb-1">
                                Switch Video Source
                            </p>

                            {sourcesToShow.map((source) => (
                                <button
                                    key={source.id}
                                    onClick={() => handleSelect(source.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${source.id === activeSourceId
                                        ? 'bg-accent text-white'
                                        : 'hover:bg-bg-hover'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{source.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-semibold text-sm">{source.name}</span>
                                                {source.id === activeSourceId && (
                                                    <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-secondary mb-1">
                                                {source.description}
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {source.features.map((feature, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-xs px-1.5 py-0.5 bg-bg-secondary rounded"
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

                        <div className="border-t border-border px-3 py-2 bg-bg-secondary">
                            <p className="text-xs text-text-muted">
                                💡 Tip: Different sources may have different languages and quality
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
