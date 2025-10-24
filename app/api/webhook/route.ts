import { NextRequest, NextResponse } from 'next/server';

function createCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://base-hackathon-based-bills.vercel.app',
    'http://localhost:3000',
    'https://base.org',
    'https://app.base.org'
  ];

  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin || '') ? (origin || '*') : '*',
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Signature",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      const corsHeaders = createCorsHeaders(request);
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const corsHeaders = createCorsHeaders(request);
    const body = await request.json();

    console.log('🔔 Webhook received:', {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      body: body
    });

    // Handle different webhook event types
    const eventType = body.type || body.event_type || 'unknown';
    
    switch (eventType) {
      case 'miniapp.launch':
        console.log('🚀 MiniApp launched:', body);
        break;
      case 'miniapp.close':
        console.log('❌ MiniApp closed:', body);
        break;
      case 'transaction.completed':
        console.log('✅ Transaction completed:', body);
        break;
      case 'transaction.failed':
        console.log('❌ Transaction failed:', body);
        break;
      default:
        console.log('📨 Unknown webhook event:', eventType, body);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString(),
      eventType: eventType
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    const corsHeaders = createCorsHeaders(request);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process webhook",
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);
  
  return NextResponse.json({
    message: "BasedBills Webhook Endpoint",
    description: "Handles MiniApp webhook events from Base",
    status: "active",
    supportedEvents: [
      "miniapp.launch",
      "miniapp.close", 
      "transaction.completed",
      "transaction.failed"
    ],
    timestamp: new Date().toISOString()
  }, { headers: corsHeaders });
}
