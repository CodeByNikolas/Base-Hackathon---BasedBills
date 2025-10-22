import { NextRequest, NextResponse } from "next/server";
import { generateJwt } from "@coinbase/cdp-sdk/auth";

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

    // Get environment variables
    const apiKeyId = process.env.CDP_SECRET_API_KEY_ID;
    const apiKeySecret = process.env.CDP_SECRET_API_KEY_PRIVATEKEY;
    const requestMethod = "POST";
    const requestHost = "api.developer.coinbase.com";
    const requestPath = "/onramp/v1/token";

    // Validate environment variables
    if (!apiKeyId || !apiKeySecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing CDP API credentials",
          details: "CDP_SECRET_API_KEY_ID and CDP_SECRET_API_KEY_PRIVATEKEY must be configured"
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // Generate JWT token using CDP SDK
    const token = await generateJwt({
      apiKeyId,
      apiKeySecret,
      requestMethod,
      requestHost,
      requestPath,
      expiresIn: 120 // 2 minutes
    });

    return NextResponse.json({
      success: true,
      token,
      expiresIn: 120,
      generatedAt: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("JWT generation error:", error);
    const corsHeaders = createCorsHeaders(request);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate JWT token",
        details: errorMessage
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
