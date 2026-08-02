import { NextRequest, NextResponse } from 'next/server';

const OMDB_API_KEY = process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY;
const OMDB_BASE_URL = 'https://www.omdbapi.com';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    if (!OMDB_API_KEY) {
        return NextResponse.json(
            { Response: 'False', Error: 'OMDb API key is not configured' },
            { status: 503 }
        );
    }

    // Forward all query params to OMDb (except our internal ones)
    const omdbParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
        omdbParams.set(key, value);
    });
    // Always add the API key
    omdbParams.set('apikey', OMDB_API_KEY);

    try {
        const res = await fetch(`${OMDB_BASE_URL}/?${omdbParams.toString()}`, {
            next: { revalidate: 86400 }, // Cache for 24 hours on server
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('OMDb proxy error:', error);
        return NextResponse.json(
            { Response: 'False', Error: 'Failed to fetch from OMDb' },
            { status: 500 }
        );
    }
}
