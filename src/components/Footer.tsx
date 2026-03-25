import { Github, Instagram, Twitter } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-bg-secondary border-t border-border">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">T</span>
                            </div>
                            <span className="font-bold text-xl">
                                Together<span className="text-accent">Watch</span>
                            </span>
                        </Link>
                        <p className="text-text-muted text-sm mb-4">
                            Watch movies and shows together with friends in perfect sync.
                        </p>
                        <div className="flex items-center gap-3">
                            <a href="#" className="p-2 bg-bg-hover rounded-lg hover:bg-bg-tertiary transition-colors">
                                <Twitter className="w-4 h-4 text-text-muted" />
                            </a>
                            <a href="#" className="p-2 bg-bg-hover rounded-lg hover:bg-bg-tertiary transition-colors">
                                <Instagram className="w-4 h-4 text-text-muted" />
                            </a>
                            <a href="#" className="p-2 bg-bg-hover rounded-lg hover:bg-bg-tertiary transition-colors">
                                <Github className="w-4 h-4 text-text-muted" />
                            </a>
                        </div>
                    </div>

                    {/* Browse */}
                    <div>
                        <h4 className="font-semibold mb-4">Browse</h4>
                        <ul className="space-y-2">
                            <li><Link href="/browse?type=movie" className="text-text-muted hover:text-white transition-colors text-sm">Movies</Link></li>
                            <li><Link href="/browse?type=tv" className="text-text-muted hover:text-white transition-colors text-sm">TV Shows</Link></li>
                            <li><Link href="/" className="text-text-muted hover:text-white transition-colors text-sm">Trending</Link></li>
                            <li><Link href="/" className="text-text-muted hover:text-white transition-colors text-sm">New Releases</Link></li>
                        </ul>
                    </div>

                    {/* Features */}
                    <div>
                        <h4 className="font-semibold mb-4">Features</h4>
                        <ul className="space-y-2">
                            <li><Link href="/rooms" className="text-text-muted hover:text-white transition-colors text-sm">Watch Rooms</Link></li>
                            <li><Link href="/" className="text-text-muted hover:text-white transition-colors text-sm">Live Chat</Link></li>
                            <li><Link href="/" className="text-text-muted hover:text-white transition-colors text-sm">Sync Playback</Link></li>
                            <li><Link href="/" className="text-text-muted hover:text-white transition-colors text-sm">Reactions</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2">
                            <li><Link href="/" className="text-text-muted hover:text-white transition-colors text-sm">Privacy Policy</Link></li>
                            <li><Link href="/" className="text-text-muted hover:text-white transition-colors text-sm">Terms of Service</Link></li>
                            <li><Link href="/" className="text-text-muted hover:text-white transition-colors text-sm">DMCA</Link></li>
                            <li><Link href="/" className="text-text-muted hover:text-white transition-colors text-sm">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-border mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-text-muted text-sm">
                        &copy; {new Date().getFullYear()} TogetherWatch. All rights reserved.
                    </p>
                    <p className="text-text-dim text-xs">
                        TogetherWatch does not host any content. All media is provided by third-party services.
                    </p>
                </div>
            </div>
        </footer>
    );
}
