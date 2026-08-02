import { NextResponse } from 'next/server';

const CONSUMET_API = 'https://api.consumet.org';

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id: anilistId } = await context.params;

    try {
        const response = await fetch(
            `${CONSUMET_API}/meta/anilist/info/${anilistId}?provider=gogoanime`,
            {
                headers: {
                    'Accept': 'application/json',
                }
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch anime info' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching anime info:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
