'use client';

import { useState } from 'react';

interface Reaction {
    id: string;
    emoji: string;
    x: number;
}

interface ReactionBarProps {
    roomId: string;
}

export default function ReactionBar({ roomId }: ReactionBarProps) {
    const [reactions, setReactions] = useState<Reaction[]>([]);

    const emojis = ['❤️', '🔥', '😂', '😮', '👏', '😢', '🎉', '💯'];

    const sendReaction = (emoji: string) => {
        const newReaction: Reaction = {
            id: Date.now().toString(),
            emoji,
            x: 10 + Math.random() * 80,
        };

        setReactions((prev) => [...prev, newReaction]);

        // Remove reaction after animation
        setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
        }, 3000);
    };

    return (
        <>
            {/* Floating Reactions */}
            <div className="fixed bottom-28 left-0 right-0 pointer-events-none overflow-hidden h-[50vh]">
                {reactions.map((reaction) => (
                    <div
                        key={reaction.id}
                        className="absolute animate-bounce-up"
                        style={{
                            left: `${reaction.x}%`,
                            bottom: 0,
                            animation: 'floatUp 3s ease-out forwards',
                        }}
                    >
                        <span className="text-4xl drop-shadow-lg">{reaction.emoji}</span>
                    </div>
                ))}
            </div>

            {/* Reaction Bar */}
            <div className="flex items-center justify-center gap-1 py-3 px-4 bg-bg-secondary border-t border-border">
                {emojis.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => sendReaction(emoji)}
                        className="p-3 hover:bg-bg-hover rounded-xl transition-all hover:scale-110 active:scale-95 text-2xl"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </>
    );
}
