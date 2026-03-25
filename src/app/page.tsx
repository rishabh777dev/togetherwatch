import Footer from '@/components/Footer';
import HeroCarousel from '@/components/HeroCarousel';
import MovieRow from '@/components/MovieRow';
import Navbar from '@/components/Navbar';
import { getLatestReleases, getPopularMovies, getPopularTV, getTopRatedMovies, getTrending } from '@/lib/tmdb';
import Link from 'next/link';

export default async function HomePage() {
    // Fetch data
    const [trending, latestReleases, popularMovies, popularTV, topRated] = await Promise.all([
        getTrending(),
        getLatestReleases(),
        getPopularMovies(),
        getPopularTV(),
        getTopRatedMovies(),
    ]);

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navbar />

            {/* Hero Section */}
            <HeroCarousel movies={trending.slice(0, 5)} />

            {/* Content Rows */}
            <div className="-mt-20 relative z-10">
                <MovieRow
                    title="Latest Releases"
                    movies={latestReleases}
                    mediaType="movie"
                />

                <MovieRow
                    title="Trending Now"
                    movies={trending}
                    mediaType="movie"
                />

                <MovieRow
                    title="Popular Movies"
                    movies={popularMovies}
                    mediaType="movie"
                />

                <MovieRow
                    title="Popular TV Shows"
                    movies={popularTV}
                    mediaType="tv"
                />

                <MovieRow
                    title="Top Rated"
                    movies={topRated}
                    mediaType="movie"
                />
            </div>

            {/* CTA Section */}
            <section className="py-20 my-12 hero-gradient">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 text-center">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                        Watch <span className="text-accent">Together</span>
                    </h2>
                    <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-8">
                        Create a watch room and invite your friends to enjoy movies and TV shows
                        in perfect sync. Chat, react, and experience entertainment together.
                    </p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Link
                            href="/room/create"
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            Create Watch Room
                        </Link>
                        <Link
                            href="/dashboard"
                            className="btn-ghost inline-flex items-center gap-2"
                        >
                            View Dashboard
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
