'use client';

import { LogIn, LogOut, Menu, Search, User, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { searchMulti, getImageUrl, Movie } from '@/lib/tmdb';
import { useRouter } from 'next/navigation';

const NAVBAR_GENRES = [
    { id: 'action', name: 'Action' },
    { id: 'comedy', name: 'Comedy' },
    { id: 'drama', name: 'Drama' },
    { id: 'horror', name: 'Horror' },
    { id: 'romance', name: 'Romance' },
    { id: 'sci-fi', name: 'Sci-Fi' },
    { id: 'thriller', name: 'Thriller' },
    { id: 'animation', name: 'Animation' },
    { id: 'family', name: 'Family' },
    { id: 'mystery', name: 'Mystery' },
];

const NAVBAR_PROVIDERS = [
    { id: 'netflix', name: 'Netflix' },
    { id: 'amazon-prime', name: 'Amazon Prime' },
    { id: 'disney-plus', name: 'Disney+' },
    { id: 'apple-tv', name: 'Apple TV+' },
    { id: 'jio-cinema', name: 'Jio Cinema' },
];

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileGenresOpen, setIsMobileGenresOpen] = useState(false);
    const [isMobileOttOpen, setIsMobileOttOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { user, isInitialized } = useAuthStore();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // Debounced search logic for Navbar
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const fetchResults = async () => {
            setIsSearching(true);
            try {
                const results = await searchMulti(searchQuery);
                setSearchResults(results.slice(0, 5) || []);
            } catch (err) {
                console.error('Navbar search error:', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(() => {
            fetchResults();
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
                  ${isScrolled ? 'glass' : 'bg-gradient-to-b from-bg-primary to-transparent'}`}
        >
            <nav className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="relative w-10 h-10 group-hover:scale-105 transition-transform duration-300">
                            <Image
                                src="/logo.webp"
                                alt="TogetherWatch Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <span className="font-bold text-xl hidden sm:block">
                            Together<span className="text-accent">Watch</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link
                            href="/"
                            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
                        >
                            Home
                        </Link>
                        <Link
                            href="/browse"
                            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
                        >
                            Browse
                        </Link>

                        {/* Genre Dropdown */}
                        <div className="relative group/genre">
                            <button className="px-4 py-2 text-text-secondary hover:text-white transition-colors flex items-center gap-1">
                                Genre
                                <svg className="w-4 h-4 transition-transform duration-300 group-hover/genre:rotate-180" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-48 opacity-0 invisible group-hover/genre:opacity-100 group-hover/genre:visible transition-all duration-200 z-50">
                                <div className="bg-[#0b0b0b]/95 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-md grid grid-cols-1 gap-0.5">
                                    {NAVBAR_GENRES.map((g) => (
                                        <Link
                                            key={g.id}
                                            href={`/browse?genre=${g.id}`}
                                            className="block px-3.5 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                        >
                                            {g.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* OTT Dropdown */}
                        <div className="relative group/ott">
                            <button className="px-4 py-2 text-text-secondary hover:text-white transition-colors flex items-center gap-1">
                                OTT
                                <svg className="w-4 h-4 transition-transform duration-300 group-hover/ott:rotate-180" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-48 opacity-0 invisible group-hover/ott:opacity-100 group-hover/ott:visible transition-all duration-200 z-50">
                                <div className="bg-[#0b0b0b]/95 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-md grid grid-cols-1 gap-0.5">
                                    {NAVBAR_PROVIDERS.map((p) => (
                                        <Link
                                            key={p.id}
                                            href={`/browse?provider=${p.id}`}
                                            className="block px-3.5 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                                        >
                                            {p.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/browse?type=movie"
                            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
                        >
                            Movies
                        </Link>
                        <Link
                            href="/browse?type=tv"
                            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
                        >
                            TV Shows
                        </Link>
                        <Link
                            href="/watchlist"
                            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
                        >
                            Watchlist
                        </Link>
                        <Link
                            href="/watch-together"
                            className="px-4 py-2 text-accent hover:text-accent-light transition-colors font-medium"
                        >
                            Watch Together
                        </Link>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative">
                            {isSearchOpen ? (
                                <div className="flex items-center animate-fade-in">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && searchQuery.trim()) {
                                                router.push(`/browse?q=${encodeURIComponent(searchQuery)}`);
                                                setIsSearchOpen(false);
                                                setSearchQuery('');
                                            }
                                        }}
                                        placeholder="Search movies, shows..."
                                        className="w-48 md:w-64 px-4 py-2 bg-bg-secondary border border-border rounded-lg
                             text-sm placeholder:text-text-muted outline-none
                             focus:border-accent transition-colors"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                        className="ml-2 p-2 hover:bg-bg-hover rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                            )}

                            {/* Search Results Dropdown */}
                            {isSearchOpen && searchQuery.trim() && (
                                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#0b0b0b]/98 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden z-50 animate-slide-up">
                                    {isSearching ? (
                                        <div className="flex items-center justify-center py-6 text-sm text-text-secondary">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Searching...
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-text-secondary">
                                            No results found
                                        </div>
                                    ) : (
                                        <div className="p-2 divide-y divide-white/5">
                                            {searchResults.map((item) => {
                                                const title = item.title || item.name || 'Untitled';
                                                const type = item.media_type === 'tv' ? 'TV Show' : 'Movie';
                                                const releaseYear = (item.release_date || item.first_air_date)?.split('-')[0];
                                                const imgPath = item.poster_path || item.backdrop_path;

                                                return (
                                                    <Link
                                                        key={`${item.media_type}:${item.id}`}
                                                        href={`/watch/${item.media_type || 'movie'}/${item.id}`}
                                                        onClick={() => {
                                                            setIsSearchOpen(false);
                                                            setSearchQuery('');
                                                        }}
                                                        className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors group text-left"
                                                    >
                                                        <div className="relative w-10 h-14 bg-bg-tertiary rounded-lg overflow-hidden flex-shrink-0">
                                                            <Image
                                                                src={getImageUrl(imgPath, 'w92')}
                                                                alt={title}
                                                                fill
                                                                className="object-cover"
                                                                sizes="40px"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-semibold text-white truncate group-hover:text-accent transition-colors">
                                                                {title}
                                                            </h4>
                                                            <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2">
                                                                <span className="px-1.5 py-0.5 rounded bg-white/10 uppercase text-[9px] font-bold text-white tracking-wide">
                                                                    {type}
                                                                </span>
                                                                {releaseYear && <span>{releaseYear}</span>}
                                                                {item.vote_average > 0 && (
                                                                    <span className="text-yellow-500 font-medium">
                                                                        ★ {item.vote_average.toFixed(1)}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                            <div className="pt-2 px-2 pb-1 border-t border-white/5">
                                                <Link
                                                    href={`/browse?q=${encodeURIComponent(searchQuery)}`}
                                                    onClick={() => {
                                                        setIsSearchOpen(false);
                                                        setSearchQuery('');
                                                    }}
                                                    className="block w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-center text-xs font-semibold text-white transition-colors"
                                                >
                                                    See all results
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Auth Buttons - Desktop & Mobile User Icon */}
                        <div className="flex items-center gap-2">
                            {isInitialized ? (
                                user ? (
                                    <>
                                        {/* Desktop User Info & SignOut */}
                                        <div className="hidden sm:flex items-center gap-3">
                                            <span className="text-sm font-medium text-text-secondary truncate max-w-[120px]">
                                                {user.email?.split('@')[0]}
                                            </span>
                                            <Link
                                                href="/dashboard"
                                                className="flex items-center justify-center w-9 h-9 bg-bg-tertiary hover:bg-bg-hover rounded-full transition-colors"
                                                title="Account"
                                            >
                                                <User className="w-4 h-4 text-text-secondary hover:text-white" />
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center justify-center w-9 h-9 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors"
                                                title="Sign Out"
                                            >
                                                <LogOut className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>

                                        {/* Mobile User Icon Button */}
                                        <Link
                                            href="/dashboard"
                                            className="sm:hidden flex items-center justify-center w-9 h-9 bg-accent/20 border border-accent/30 rounded-full text-accent transition-colors"
                                            title="Account"
                                        >
                                            <User className="w-4 h-4" />
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        {/* Desktop Sign In Button */}
                                        <Link
                                            href="/login"
                                            className="hidden sm:flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-light rounded-lg transition-colors text-white text-sm font-medium"
                                        >
                                            <LogIn className="w-4 h-4" />
                                            <span>Sign In</span>
                                        </Link>

                                        {/* Mobile Sign In Icon Button */}
                                        <Link
                                            href="/login"
                                            className="sm:hidden flex items-center justify-center w-9 h-9 bg-accent rounded-full text-white transition-colors"
                                            title="Sign In"
                                        >
                                            <LogIn className="w-4 h-4" />
                                        </Link>
                                    </>
                                )
                            ) : (
                                <div className="w-9 sm:w-24 h-9 bg-bg-tertiary animate-pulse rounded-full sm:rounded-lg"></div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 hover:bg-bg-hover rounded-lg transition-colors"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden glass animate-slide-down">
                    <div className="px-4 py-4 space-y-1">
                        <Link
                            href="/"
                            className="block px-4 py-3 text-text-secondary hover:text-white hover:bg-bg-hover rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Home
                        </Link>
                        <Link
                            href="/browse"
                            className="block px-4 py-3 text-text-secondary hover:text-white hover:bg-bg-hover rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Browse
                        </Link>

                        {/* Mobile Genre Accordion */}
                        <div>
                            <button
                                onClick={() => setIsMobileGenresOpen(!isMobileGenresOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 text-text-secondary hover:text-white hover:bg-bg-hover rounded-lg transition-colors text-left"
                            >
                                <span>Genre</span>
                                {isMobileGenresOpen ? (
                                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                ) : (
                                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                )}
                            </button>
                            {isMobileGenresOpen && (
                                <div className="pl-6 pr-4 py-1 grid grid-cols-2 gap-1 bg-black/10 rounded-lg">
                                    {NAVBAR_GENRES.map((g) => (
                                        <Link
                                            key={g.id}
                                            href={`/browse?genre=${g.id}`}
                                            className="block px-3 py-2 text-sm text-text-secondary hover:text-white rounded-md transition-colors"
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                setIsMobileGenresOpen(false);
                                            }}
                                        >
                                            {g.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Mobile OTT Accordion */}
                        <div>
                            <button
                                onClick={() => setIsMobileOttOpen(!isMobileOttOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 text-text-secondary hover:text-white hover:bg-bg-hover rounded-lg transition-colors text-left"
                            >
                                <span>OTT Platforms</span>
                                {isMobileOttOpen ? (
                                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                ) : (
                                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                )}
                            </button>
                            {isMobileOttOpen && (
                                <div className="pl-6 pr-4 py-1 grid grid-cols-1 gap-1 bg-black/10 rounded-lg">
                                    {NAVBAR_PROVIDERS.map((p) => (
                                        <Link
                                            key={p.id}
                                            href={`/browse?provider=${p.id}`}
                                            className="block px-3 py-2 text-sm text-text-secondary hover:text-white rounded-md transition-colors"
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                setIsMobileOttOpen(false);
                                            }}
                                        >
                                            {p.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Link
                            href="/browse?type=movie"
                            className="block px-4 py-3 text-text-secondary hover:text-white hover:bg-bg-hover rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Movies
                        </Link>
                        <Link
                            href="/browse?type=tv"
                            className="block px-4 py-3 text-text-secondary hover:text-white hover:bg-bg-hover rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            TV Shows
                        </Link>
                        <Link
                            href="/watchlist"
                            className="block px-4 py-3 text-text-secondary hover:text-white hover:bg-bg-hover rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Watchlist
                        </Link>
                        <Link
                            href="/watch-together"
                            className="block px-4 py-3 text-accent hover:bg-bg-hover rounded-lg transition-colors font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Watch Together
                        </Link>
                        <hr className="border-border my-2" />
                        
                        {isInitialized && user ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="block px-4 py-3 text-text-secondary hover:text-white hover:bg-bg-hover rounded-lg transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="block px-4 py-3 bg-accent text-white rounded-lg text-center font-medium"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
