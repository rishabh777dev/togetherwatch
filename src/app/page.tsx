import Footer from '@/components/Footer';
import HeroCarousel from '@/components/HeroCarousel';
import MovieRow from '@/components/MovieRow';
import TopTenRow from '@/components/TopTenRow';
import Navbar from '@/components/Navbar';
import ContinueWatching from '@/components/ContinueWatching';
import { 
    getLatestReleases, 
    getPopularMovies, 
    getPopularTV, 
    getTopRatedMovies, 
    getTrending, 
    getNetflixOriginals 
} from '@/lib/tmdb';
import Link from 'next/link';

export default async function HomePage() {
    // Fetch real TMDB dynamic data concurrently
    const [trending, latestReleases, popularMovies, popularTV, topRated, netflix] = await Promise.all([
        getTrending(),
        getLatestReleases(),
        getPopularMovies(),
        getPopularTV(),
        getTopRatedMovies(),
        getNetflixOriginals(),
    ]);

    return (
        <main className="min-h-screen bg-bg-primary overflow-hidden">
            <Navbar />

            {/* Cineby-style Massive Hero (Using No. 1 Trending) */}
            <HeroCarousel movies={trending.slice(0, 5)} />

            {/* Content Rows */}
            <div className="-mt-32 xl:-mt-48 relative z-10 pb-20">
                
                {/* Your Continue Watching Row */}
                <ContinueWatching />

                {/* Top 10 Today - Posters with Giant Numbers Behind */}
                <TopTenRow movies={trending} />

                {/* Trending Today - Cinematic 16:9 Backdrops */}
                <MovieRow
                    title="Trending Today"
                    movies={latestReleases.concat(popularTV).slice(0, 15)}
                />

                {/* Netflix Row - 16:9 Backdrops */}
                <MovieRow
                    title="Netflix"
                    movies={netflix}
                    mediaType="tv"
                />

                {/* Top Rated - 16:9 Backdrops */}
                <MovieRow
                    title="Top rated"
                    movies={topRated}
                    mediaType="movie"
                />
                
                {/* Popular Movies - 16:9 Backdrops */}
                <MovieRow
                    title="Popular Movies"
                    movies={popularMovies}
                    mediaType="movie"
                />

            </div>

            {/* Call to action section */}
            <section className="py-20 mt-12 hero-gradient border-t border-white/5">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Watch <span className="text-accent">Together</span>
                    </h2>
                    <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-8">
                        Experience the ultimate watch party. Sync your streams instantly and chat with friends in real-time.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link href="/room/create" className="btn-primary">
                            Create a Room
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
