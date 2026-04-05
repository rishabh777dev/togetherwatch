'use client';

import { ChatMessage, getMessages, sendMessage, subscribeToMessages } from '@/lib/supabase';
import { getOrCreateUserId, getStoredUserName } from '@/lib/session';
import { Send, Smile } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ChatPanelProps {
    roomCode: string;
    isOpen?: boolean;
}

// Generate a unique user ID for this session
function getUserId(): string {
    return getOrCreateUserId();
}

// Get or generate a username for this session
function getUserName(): string {
    if (typeof window === 'undefined') return 'Guest';

    // First check localStorage (where the name prompt saves the name)
    let userName = getStoredUserName();
    if (!userName) {
        // Fallback to generating a random name
        const adjectives = ['Happy', 'Cool', 'Swift', 'Chill', 'Epic', 'Brave'];
        const nouns = ['Viewer', 'Watcher', 'Movie Fan', 'Cinephile', 'Lurker', 'Guest'];
        userName = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
        localStorage.setItem('tw_user_name', userName);
    }
    return userName;
}

export default function ChatPanel({ roomCode, isOpen = true }: ChatPanelProps) {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const userId = useRef<string>('');
    const userName = useRef<string>('');

    const quickEmojis = ['😂', '🔥', '😮', '❤️', '👏', '😭'];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Initialize user info and load messages
    useEffect(() => {
        userId.current = getUserId();
        userName.current = getUserName();

        const loadMessages = async () => {
            const existingMessages = await getMessages(roomCode);
            setMessages(existingMessages);
            setIsLoading(false);
        };

        loadMessages();

        // Subscribe to new messages with better error handling
        const subscription = subscribeToMessages(roomCode, (newMessage) => {
            setMessages(prev => {
                // 1. If exact real ID is already present, just update it (avoids duplicate final renders)
                if (prev.some(m => m.id === newMessage.id)) {
                    return prev.map(m => m.id === newMessage.id ? newMessage : m);
                }
                
                // 2. We use optimistic `temp_` IDs. If the user spammed the same emoji twice, 
                // we ONLY want to replace the oldest matching temp ID to avoid wiping multiples and duplicating keys!
                const tempIndex = prev.findIndex(m => 
                    m.id.startsWith('temp_') && 
                    m.content === newMessage.content && 
                    m.user_id === newMessage.user_id
                );

                if (tempIndex !== -1) {
                    const nextMsgs = [...prev];
                    nextMsgs[tempIndex] = newMessage;
                    return nextMsgs;
                }

                // 3. Otherwise, it's a brand new message from someone else (or a non-optimistic message)
                return [...prev, newMessage];
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [roomCode]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isSending) return;

        const content = message;
        setMessage(''); // Clear immediately for better UX

        // Optimistic update - add message immediately
        const tempMessage: ChatMessage = {
            id: 'temp_' + Date.now(),
            room_code: roomCode,
            user_id: userId.current,
            user_name: userName.current,
            content,
            message_type: 'message',
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMessage]);

        setIsSending(true);
        const { error } = await sendMessage({
            roomCode,
            userId: userId.current,
            userName: userName.current,
            content,
            messageType: 'message',
        });

        if (error) {
            console.error('Failed to send message:', error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            setMessage(content); // Restore message on error
        }

        setIsSending(false);
    };

    const handleQuickReaction = async (emoji: string) => {
        // Optimistic update for reactions
        const tempReaction: ChatMessage = {
            id: 'temp_' + Date.now(),
            room_code: roomCode,
            user_id: userId.current,
            user_name: userName.current,
            content: emoji,
            message_type: 'reaction',
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempReaction]);

        const { error } = await sendMessage({
            roomCode,
            userId: userId.current,
            userName: userName.current,
            content: emoji,
            messageType: 'reaction',
        });

        if (error) {
            // Remove optimistic reaction on error
            setMessages(prev => prev.filter(m => m.id !== tempReaction.id));
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    return (
        <div className="h-full flex flex-col bg-bg-secondary border-l border-border">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Live Chat</h3>
                <p className="text-xs text-text-muted">
                    {isLoading ? 'Loading...' : `${messages.length} messages`}
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="text-center text-text-muted py-8">
                        Loading messages...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-text-muted py-8">
                        No messages yet. Say hello! 👋
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwnMessage = msg.user_id === userId.current;

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.message_type === 'system' ? (
                                    <div className="w-full text-center">
                                        <span className="text-xs text-text-muted bg-bg-tertiary px-3 py-1 rounded-full">
                                            {msg.content}
                                        </span>
                                    </div>
                                ) : msg.message_type === 'reaction' ? (
                                    <div className={`flex items-center gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-6 h-6 rounded-full bg-bg-hover flex items-center justify-center text-xs">
                                            {msg.user_name[0]}
                                        </div>
                                        <span className="text-2xl">{msg.content}</span>
                                    </div>
                                ) : (
                                    <div className={`max-w-[80%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                            <div className="w-7 h-7 rounded-full bg-bg-hover flex items-center justify-center text-xs flex-shrink-0">
                                                {msg.user_name[0]}
                                            </div>
                                            <div>
                                                <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-xs font-medium text-text-secondary">
                                                        {isOwnMessage ? 'You' : msg.user_name}
                                                    </span>
                                                    <span className="text-xs text-text-muted">{formatTime(msg.created_at)}</span>
                                                </div>
                                                <div className={`px-4 py-2 rounded-2xl ${isOwnMessage
                                                    ? 'bg-accent text-white rounded-br-sm'
                                                    : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Reactions */}
            <div className="px-4 py-2 border-t border-border">
                <div className="flex items-center gap-1">
                    {quickEmojis.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => handleQuickReaction(emoji)}
                            className="p-2 hover:bg-bg-hover rounded-lg transition-colors text-xl"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
                    >
                        <Smile className="w-5 h-5 text-text-muted" />
                    </button>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Send a message..."
                        disabled={isSending}
                        className="flex-1 px-4 py-2 bg-bg-primary border border-border rounded-xl 
                     outline-none focus:border-accent transition-colors text-sm disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!message.trim() || isSending}
                        className={`p-2 rounded-lg transition-colors ${message.trim() && !isSending
                            ? 'bg-accent hover:bg-accent-light'
                            : 'bg-bg-hover text-text-muted'
                            }`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
