'use client';

import { LogIn, Menu, Search, User, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center group-hover:shadow-glow transition-shadow">
                            <span className="text-white font-bold text-lg">T</span>
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
                                        placeholder="Search movies, shows..."
                                        className="w-48 md:w-64 px-4 py-2 bg-bg-secondary border border-border rounded-lg
                             text-sm placeholder:text-text-muted outline-none
                             focus:border-accent transition-colors"
                                        autoFocus
                                        onBlur={() => !searchQuery && setIsSearchOpen(false)}
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
                        </div>

                        {/* Auth Buttons */}
                        <div className="hidden sm:flex items-center gap-2">
                            <Link
                                href="/auth"
                                className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-white transition-colors"
                            >
                                <LogIn className="w-4 h-4" />
                                <span className="text-sm font-medium">Sign In</span>
                            </Link>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light 
                         rounded-lg transition-colors text-sm font-medium"
                            >
                                <User className="w-4 h-4" />
                                <span>Dashboard</span>
                            </Link>
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
                        <Link
                            href="/auth"
                            className="block px-4 py-3 text-text-secondary hover:text-white hover:bg-bg-hover rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/dashboard"
                            className="block px-4 py-3 bg-accent text-white rounded-lg text-center font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Dashboard
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
