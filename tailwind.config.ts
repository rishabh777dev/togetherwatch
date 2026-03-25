import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Lexend', 'sans-serif'],
            },
            colors: {
                // Cineby-style dark theme - stealth mode
                bg: {
                    primary: '#0A0A0A',
                    secondary: '#111111',
                    tertiary: '#181818',
                    card: '#141414',
                    hover: '#1F1F1F',
                },
                // Accent - keeping coral for TogetherWatch branding
                accent: {
                    DEFAULT: '#E50914',
                    light: '#FF3B3B',
                    dim: '#B80710',
                    glow: 'rgba(229, 9, 20, 0.3)',
                },
                // Text hierarchy
                text: {
                    primary: '#FFFFFF',
                    secondary: '#B3B3B3',
                    muted: '#6B6B6B',
                    dim: '#404040',
                },
                // Border colors
                border: {
                    DEFAULT: 'rgba(255, 255, 255, 0.1)',
                    hover: 'rgba(255, 255, 255, 0.2)',
                },
            },
            borderRadius: {
                '4xl': '2rem',
            },
            boxShadow: {
                glow: '0 0 20px rgba(229, 9, 20, 0.3)',
                'glow-lg': '0 0 40px rgba(229, 9, 20, 0.4)',
                card: '0 8px 30px rgba(0, 0, 0, 0.5)',
                'card-hover': '0 16px 50px rgba(0, 0, 0, 0.7)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
                shimmer: 'shimmer 2s infinite linear',
            },
            transitionDuration: {
                '400': '400ms',
            },
        },
    },
    plugins: [],
};

export default config;
