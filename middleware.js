import { NextResponse } from 'next/server';

// Apply CORS to all API routes
export function middleware(request) {
    const origin = request.headers.get('origin') || '*';

    const corsHeaders = new Headers({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization,Content-Type,Accept,Origin,Referer,User-Agent',
        'Access-Control-Max-Age': '86400'
        // Note: Do NOT set Allow-Credentials with wildcard origin
    });

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    const response = NextResponse.next();
    corsHeaders.forEach((value, key) => response.headers.set(key, value));
    return response;
}

export const config = {
    matcher: ['/api/:path*']
};
