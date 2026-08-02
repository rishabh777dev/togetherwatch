import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    
    // Validate request is authorized (by Vercel's Cron engine)
    // If CRON_SECRET is not configured locally (e.g. in dev), we bypass authentication
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // Run a simple, lightweight query to keep the database active
        const { data, error } = await supabase.from('rooms').select('id').limit(1);

        if (error) {
            console.error('[Cron] Keep-alive database error:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        console.log('[Cron] ✅ Supabase keep-alive check completed successfully.');
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            roomsFetched: data?.length || 0,
        });
    } catch (err: any) {
        console.error('[Cron] Keep-alive internal handler error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
