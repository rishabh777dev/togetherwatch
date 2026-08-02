import Footer from '@/components/Footer';
import HeroCarousel from '@/components/HeroCarousel';
import Navbar from '@/components/Navbar';
import HomeContentRows from '@/components/HomeContentRows';
import { getTrendingAnime } from '@/lib/anilist';
import {
    getLatestReleases, 
    getPopularMovies, 
    getPopularTV, 
    getTopRatedMovies, 
    getTrending, 
    getNetflixOriginals,
    getTrendingMovies,
    getTrendingTV,
    getTopRatedTV,
    getUpcomingMovies,
    getActionMovies,
    getAnimeShows,
    getKDramas,
    getSciFiMovies,
    getHorrorMovies,
    getComedyMovies,
    getHBOOriginals,
    Movie
} from '@/lib/tmdb';
import Link from 'next/link';

export default async function HomePage() {
    // Fetch in small sequential batches to prevent connection resets / timeouts
    const [trending, latestReleases, popularMovies, popularTV] = await Promise.all([
        getTrending().catch(() => []),
        getLatestReleases().catch(() => []),
        getPopularMovies().catch(() => []),
        getPopularTV().catch(() => []),
    ]);

    const [topRatedMovies, topRatedTV, netflix, hbo] = await Promise.all([
        getTopRatedMovies().catch(() => []),
        getTopRatedTV().catch(() => []),
        getNetflixOriginals().catch(() => []),
        getHBOOriginals().catch(() => []),
    ]);

    const [trendingMovies, trendingTV, actionMovies, animeShows] = await Promise.all([
        getTrendingMovies().catch(() => []),
        getTrendingTV().catch(() => []),
        getActionMovies().catch(() => []),
        getAnimeShows().catch(() => []),
    ]);

    const [kDramas, sciFiMovies, horrorMovies, comedyMovies, upcomingMovies, anilistAnime] = await Promise.all([
        getKDramas().catch(() => []),
        getSciFiMovies().catch(() => []),
        getHorrorMovies().catch(() => []),
        getComedyMovies().catch(() => []),
        getUpcomingMovies().catch(() => []),
        getTrendingAnime(1, 15).catch(() => []),
    ]);

    // Fallback/enrich anime shows with AniList data if needed
    const finalAnimeShows: Movie[] = animeShows.length > 0 ? animeShows : (anilistAnime || []).map((a) => ({
        id: a.id,
        title: a.title.english || a.title.romaji,
        name: a.title.english || a.title.romaji,
        poster_path: a.coverImage.large,
        backdrop_path: a.coverImage.large,
        overview: `${a.format || 'Anime'} • ${a.episodes ? `${a.episodes} Episodes` : 'Series'} • Rating: ${a.averageScore ? (a.averageScore / 10).toFixed(1) : 'N/A'}`,
        vote_average: a.averageScore ? a.averageScore / 10 : 0,
        media_type: 'tv',
    }));

    return (
        <main className="min-h-screen bg-bg-primary overflow-hidden">
            <Navbar />

            {/* Cineby-style Hero (Using Top Trending Items) */}
            <HeroCarousel movies={trending.slice(0, 5)} />

            {/* Comprehensive Content Rows & Category Filter Pills */}
            <HomeContentRows 
                trending={trending}
                latestReleases={latestReleases}
                popularMovies={popularMovies}
                popularTV={popularTV}
                topRatedMovies={topRatedMovies}
                topRatedTV={topRatedTV}
                netflix={netflix}
                hbo={hbo}
                trendingMovies={trendingMovies}
                trendingTV={trendingTV}
                actionMovies={actionMovies}
                animeShows={finalAnimeShows}
                kDramas={kDramas}
                sciFiMovies={sciFiMovies}
                horrorMovies={horrorMovies}
                comedyMovies={comedyMovies}
                upcomingMovies={upcomingMovies}
            />

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
