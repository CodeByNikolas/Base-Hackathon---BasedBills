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

  // Check if we're in development and use a mock public IP for testing
  // CDP requires public IPs, so we use a mock one for development
  if (process.env.NODE_ENV === 'development') {
    return "192.0.2.1"; // This is a mock public IP for testing (TEST-NET-1)
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
    const { addresses, assets, testnet } = body;

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

    // Check if any addresses contain base-sepolia (which is NOT supported by CDP)
    const hasBaseSepolia = addresses.some(addr =>
      addr.blockchains.includes("base-sepolia")
    );

    // Log testnet usage
    if (testnet || hasBaseSepolia) {
      console.log("Testnet mode detected:", { testnet, hasBaseSepolia, blockchains: addresses.map(addr => addr.blockchains) });
    }

    // Convert Base Sepolia to Base mainnet for session token generation
    // Session tokens should be generated for mainnet networks, testnet is specified in the onramp URL
    let modifiedAddresses = addresses.map(addr => ({
      ...addr,
      blockchains: addr.blockchains.map((blockchain: string) =>
        blockchain === "base-sepolia" ? "base" : blockchain
      )
    }));

    // Check if we converted any testnet addresses
    const hadTestnetConversion = addresses.some((addr, index) =>
      addr.blockchains.includes("base-sepolia") &&
      !modifiedAddresses[index].blockchains.includes("base-sepolia")
    );

    if (hadTestnetConversion) {
      console.log("Converting Base Sepolia to Base mainnet for session token generation");
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

    // Get client IP first for logging
    const clientIP = getClientIP(request);
    console.log("Session token request - Client IP:", clientIP);
    console.log("Session token request - Addresses:", addresses);
    console.log("Session token request - Assets:", assets);

    // Generate JWT for session token API
    console.log("Generating JWT for session token API...");
    const jwtToken = await generateJwt({
      apiKeyId,
      apiKeySecret,
      requestMethod: "POST",
      requestHost: "api.developer.coinbase.com",
      requestPath: "/onramp/v1/token",
      expiresIn: 120
    });
    console.log("JWT generated successfully for session token API");

    // Create session token request payload
    const sessionTokenPayload = {
      addresses: modifiedAddresses,
      assets,
      clientIp: clientIP
    };

    // Make request to CDP API to generate session token
    console.log("Making request to CDP API for session token...");
    const response = await fetch("https://api.developer.coinbase.com/onramp/v1/token", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(sessionTokenPayload)
    });

    console.log("CDP API response status:", response.status);

    if (!response.ok) {
      let errorData = {};
      try {
        const responseText = await response.text();
        console.log("CDP API error response text:", responseText);
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || "Unknown error" };
        }
      } catch (e) {
        console.error("Failed to read CDP API error response:", e);
        errorData = { message: "Failed to read error response" };
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create session token",
          details: errorData,
          status: response.status,
          clientIP,
          timestamp: new Date().toISOString()
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    let sessionTokenData;
    try {
      const responseText = await response.text();
      console.log("CDP API success response:", responseText);
      sessionTokenData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse CDP API success response:", e);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid response from CDP API",
          details: "Response was not valid JSON",
          status: response.status,
          clientIP,
          timestamp: new Date().toISOString()
        },
        { status: 502, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      sessionToken: sessionTokenData.token,
      channelId: sessionTokenData.channel_id,
      clientIP,
      addresses: modifiedAddresses,
      originalAddresses: addresses,
      assets,
      testnet: testnet || hasBaseSepolia,
      testnetConverted: hadTestnetConversion,
      generatedAt: new Date().toISOString(),
      expiresIn: 300 // 5 minutes as per CDP docs
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Session token generation error:", error);
    const corsHeaders = createCorsHeaders(request);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const clientIP = getClientIP(request);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: errorMessage,
        clientIP,
        timestamp: new Date().toISOString()
      },
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
    optionalFields: {
      testnet: "Boolean flag to indicate testnet mode (auto-detected from blockchain if not provided)"
    },
    exampleRequest: {
      addresses: [
        {
          address: "0x4315d134aCd3221a02dD380ADE3aF39Ce219037c",
          blockchains: ["base"]
        }
      ],
      assets: ["ETH", "USDC"],
      testnet: false
    },
    clientIP: getClientIP(request),
    timestamp: new Date().toISOString()
  }, { headers: corsHeaders });
}
