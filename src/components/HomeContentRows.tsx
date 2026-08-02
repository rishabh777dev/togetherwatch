'use client';

import MovieRow from '@/components/MovieRow';
import TopTenRow from '@/components/TopTenRow';
import ContinueWatching from '@/components/ContinueWatching';
import { Movie } from '@/lib/tmdb';

interface HomeContentRowsProps {
    trending: Movie[];
    latestReleases: Movie[];
    popularMovies: Movie[];
    popularTV: Movie[];
    topRatedMovies: Movie[];
    topRatedTV: Movie[];
    netflix: Movie[];
    hbo: Movie[];
    trendingMovies: Movie[];
    trendingTV: Movie[];
    actionMovies: Movie[];
    animeShows: Movie[];
    kDramas: Movie[];
    sciFiMovies: Movie[];
    horrorMovies: Movie[];
    comedyMovies: Movie[];
    upcomingMovies: Movie[];
}

export default function HomeContentRows(props: HomeContentRowsProps) {
    return (
        <div className="-mt-8 sm:-mt-12 lg:-mt-16 xl:-mt-20 relative z-10 pb-20 pt-8 sm:pt-10">
            {/* Continue Watching Section */}
            <ContinueWatching />

            {/* Top 10 Today Row */}
            <TopTenRow movies={props.trending} />

            {/* Trending Today */}
            <MovieRow
                title="Trending Today"
                movies={props.latestReleases.concat(props.popularTV).slice(0, 15)}
            />

            {/* Trending Movies */}
            <MovieRow
                title="Trending Movies"
                movies={props.trendingMovies}
                mediaType="movie"
            />

            {/* Trending TV Series */}
            <MovieRow
                title="Trending Series"
                movies={props.trendingTV}
                mediaType="tv"
            />

            {/* Popular Anime Row */}
            <MovieRow
                title="Popular Anime & Animation"
                movies={props.animeShows}
                mediaType="tv"
            />

            {/* K-Drama & Asian Series */}
            <MovieRow
                title="K-Drama & Asian Series"
                movies={props.kDramas}
                mediaType="tv"
            />

            {/* Netflix Originals */}
            <MovieRow
                title="Netflix Originals"
                movies={props.netflix}
                mediaType="tv"
            />

            {/* HBO & Max Originals */}
            {props.hbo.length > 0 && (
                <MovieRow
                    title="HBO & Max Hits"
                    movies={props.hbo}
                    mediaType="tv"
                />
            )}

            {/* Action & Adventure */}
            <MovieRow
                title="Action & Adventure Blockbusters"
                movies={props.actionMovies}
                mediaType="movie"
            />

            {/* Sci-Fi & Fantasy */}
            <MovieRow
                title="Sci-Fi & Fantasy Worlds"
                movies={props.sciFiMovies}
                mediaType="movie"
            />

            {/* Top Rated Movies */}
            <MovieRow
                title="Top Rated Movies"
                movies={props.topRatedMovies}
                mediaType="movie"
            />

            {/* Top Rated TV Shows */}
            <MovieRow
                title="Top Rated TV Series"
                movies={props.topRatedTV}
                mediaType="tv"
            />

            {/* Horror & Thriller */}
            <MovieRow
                title="Horror & Thrillers"
                movies={props.horrorMovies}
                mediaType="movie"
            />

            {/* Comedy Hits */}
            <MovieRow
                title="Comedy Favorites"
                movies={props.comedyMovies}
                mediaType="movie"
            />

            {/* Popular Movies */}
            <MovieRow
                title="Popular Movies"
                movies={props.popularMovies}
                mediaType="movie"
            />

            {/* Upcoming Movies */}
            <MovieRow
                title="Coming Soon to Theaters"
                movies={props.upcomingMovies}
                mediaType="movie"
            />
        </div>
    );
}
