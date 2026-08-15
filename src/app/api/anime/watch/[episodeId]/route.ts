import { NextResponse } from 'next/server';

const CONSUMET_API = 'https://api.consumet.org';

export async function GET(
    _request: Request,
    context: { params: Promise<{ episodeId: string }> }
) {
    const { episodeId } = await context.params;

    try {
        const response = await fetch(
            `${CONSUMET_API}/meta/anilist/watch/${episodeId}`,
            {
                headers: {
                    'Accept': 'application/json',
                }
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch streaming links' },
                { status: response.status }
            );
        }

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            return NextResponse.json(data);
        } catch {
            return NextResponse.json(
                { error: 'Invalid response from anime server' },
                { status: 502 }
            );
        }
    } catch (error) {
        console.error('Error fetching streaming links:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
