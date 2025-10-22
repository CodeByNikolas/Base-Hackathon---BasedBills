import { NextRequest, NextResponse } from "next/server";

// Helper function to create CORS headers
function createCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");

  const allowedOrigins: string[] = [
    "http://localhost:3000",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    // Add your custom domain here if using one, e.g.:
    // "https://yourdomain.com",
  ].filter((origin): origin is string => Boolean(origin));

  const isAllowedOrigin = origin && allowedOrigins.some(allowed => origin.includes(allowed));

  return {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "http://localhost:3000",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function GET(request: NextRequest) {
  try {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      const corsHeaders = createCorsHeaders(request);
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // For regular requests, get CORS headers
    const corsHeaders = createCorsHeaders(request);

    // Check environment variables on server-side only
    const cdpSecretApiKeyId = process.env.CDP_SECRET_API_KEY_ID;
    const cdpSecretApiKeyPrivateKey = process.env.CDP_SECRET_API_KEY_PRIVATEKEY;
    const nextPublicOnchainkitApiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;

    // Return safe status information (never expose actual values)
    return NextResponse.json({
      environmentStatus: {
        CDP_SECRET_API_KEY_ID: {
          configured: Boolean(cdpSecretApiKeyId),
          // Never expose the actual value for security
        },
        CDP_SECRET_API_KEY_PRIVATEKEY: {
          configured: Boolean(cdpSecretApiKeyPrivateKey),
        },
        NEXT_PUBLIC_ONCHAINKIT_API_KEY: {
          configured: Boolean(nextPublicOnchainkitApiKey),
        },
      },
      note: "Environment variables are checked server-side only for security. Actual values are never exposed to the client.",
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Environment status check error:", error);
    const corsHeaders = createCorsHeaders(request);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Failed to check environment status", details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
