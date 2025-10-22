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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Handle CORS preflight requests
function handleCorsOptions(request: NextRequest): NextResponse | null {
  if (request.method === "OPTIONS") {
    const corsHeaders = createCorsHeaders(request);
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  return null;
}

// Helper function to get client IP address
function getClientIP(request: NextRequest): string {
  // Check for forwarded IP headers (common in production)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP if multiple are present
    return forwarded.split(",")[0].trim();
  }

  // Check for real IP header
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Check for client IP header
  const clientIP = request.headers.get("x-client-ip");
  if (clientIP) {
    return clientIP;
  }

  // Fallback for local development
  // Note: In production with proper proxy setup, this should come from headers
  return "127.0.0.1";
}

export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight requests
    const corsResponse = handleCorsOptions(request);
    if (corsResponse) {
      return corsResponse;
    }

    // For regular requests, get CORS headers
    const corsHeaders = createCorsHeaders(request);

    const body = await request.json();
    const { addresses, assets } = body;

    // Validate required fields
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: "Addresses array is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: "Assets array is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get environment variables
    const apiKeyId = process.env.CDP_SECRET_API_KEY_ID;
    const apiKeySecret = process.env.CDP_SECRET_API_KEY_PRIVATEKEY;

    if (!apiKeyId || !apiKeySecret) {
      return NextResponse.json(
        { error: "Missing CDP API credentials" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Generate JWT for session token API
    const jwtToken = await generateJwt({
      apiKeyId,
      apiKeySecret,
      requestMethod: "POST",
      requestHost: "api.developer.coinbase.com",
      requestPath: "/onramp/v1/token",
      expiresIn: 120
    });

    // Get client IP
    const clientIP = getClientIP(request);

    // Create session token request payload
    const sessionTokenPayload = {
      addresses,
      assets,
      clientIp: clientIP
    };

    // Make request to CDP API to generate session token
    const response = await fetch("https://api.developer.coinbase.com/onramp/v1/token", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(sessionTokenPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: "Failed to create session token",
          details: errorData,
          status: response.status
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    const sessionTokenData = await response.json();

    return NextResponse.json({
      success: true,
      sessionToken: sessionTokenData.token,
      channelId: sessionTokenData.channel_id,
      clientIP,
      addresses,
      assets,
      generatedAt: new Date().toISOString(),
      expiresIn: 300 // 5 minutes as per CDP docs
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Session token generation error:", error);
    const corsHeaders = createCorsHeaders(request);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  // Handle CORS preflight requests
  const corsResponse = handleCorsOptions(request);
  if (corsResponse) {
    return corsResponse;
  }

  // For regular requests, get CORS headers
  const corsHeaders = createCorsHeaders(request);

  // Return session token debugging information
  return NextResponse.json({
    message: "Session Token API",
    description: "POST endpoint for creating session tokens. Include addresses and assets in request body.",
    requiredFields: {
      addresses: "Array of address objects with address and blockchains",
      assets: "Array of asset symbols (e.g., ['ETH', 'USDC'])"
    },
    exampleRequest: {
      addresses: [
        {
          address: "0x4315d134aCd3221a02dD380ADE3aF39Ce219037c",
          blockchains: ["ethereum", "base"]
        }
      ],
      assets: ["ETH", "USDC"]
    },
    clientIP: getClientIP(request),
    timestamp: new Date().toISOString()
  }, { headers: corsHeaders });
}
