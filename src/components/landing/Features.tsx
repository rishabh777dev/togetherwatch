'use client';

import { MessageCircle, Mic, Shield, Sparkles, Users, Zap } from 'lucide-react';

const features = [
    {
        icon: Zap,
        title: 'Perfect Sync',
        description: 'Industry-leading 250ms synchronization ensures everyone sees the same frame at the same time.',
        color: 'coral',
    },
    {
        icon: Users,
        title: 'Watch Together',
        description: 'Invite up to 5 friends to your private watch room. See their reactions in real-time.',
        color: 'salmon',
    },
    {
        icon: MessageCircle,
        title: 'Live Chat',
        description: 'React with emojis, share your thoughts, and feel the collective excitement together.',
        color: 'wine',
    },
    {
        icon: Mic,
        title: 'Voice Chat',
        description: 'Crystal-clear voice chat powered by WebRTC. Talk as if you\'re in the same room.',
        color: 'coral',
    },
    {
        icon: Shield,
        title: 'BYOS Friendly',
        description: 'Bring Your Own Subscription. Use your existing streaming services — we just sync.',
        color: 'salmon',
    },
    {
        icon: Sparkles,
        title: 'AI Highlights',
        description: 'Our AI detects hype moments and creates session recaps automatically.',
        color: 'wine',
    },
];

const getColorClasses = (color: string) => {
    switch (color) {
        case 'coral':
            return {
                bg: 'bg-coral-500/10',
                border: 'border-coral-500/30',
                icon: 'text-coral-500',
                hover: 'group-hover:bg-coral-500/20',
                glow: 'group-hover:shadow-coral-500/20',
            };
        case 'salmon':
            return {
                bg: 'bg-salmon-500/10',
                border: 'border-salmon-500/30',
                icon: 'text-salmon-500',
                hover: 'group-hover:bg-salmon-500/20',
                glow: 'group-hover:shadow-salmon-500/20',
            };
        case 'wine':
            return {
                bg: 'bg-wine-500/10',
                border: 'border-wine-500/30',
                icon: 'text-wine-400',
                hover: 'group-hover:bg-wine-500/20',
                glow: 'group-hover:shadow-wine-500/20',
            };
        default:
            return {
                bg: 'bg-coral-500/10',
                border: 'border-coral-500/30',
                icon: 'text-coral-500',
                hover: 'group-hover:bg-coral-500/20',
                glow: 'group-hover:shadow-coral-500/20',
            };
    }
};

export default function Features() {
    return (
        <section className="py-24 px-4 relative">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <h2 className="font-display font-bold text-4xl sm:text-5xl mb-4">
                        Everything you need for the
                        <br />
                        <span className="text-gradient">perfect watch party</span>
                    </h2>
                    <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                        Built from the ground up for synchronized viewing, real-time interaction,
                        and that electric &quot;same room&quot; feeling.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => {
                        const colors = getColorClasses(feature.color);
                        const Icon = feature.icon;

                        return (
                            <div
                                key={feature.title}
                                className={`group glass-card p-6 hover:border-white/20 transition-all duration-300 
                           hover:shadow-xl ${colors.glow} cursor-default`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.border} border
                              flex items-center justify-center mb-4 transition-all duration-300 ${colors.hover}`}>
                                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                                </div>

                                <h3 className="font-display font-semibold text-xl text-white mb-2">
                                    {feature.title}
                                </h3>

                                <p className="text-text-secondary leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
