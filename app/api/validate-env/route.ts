import { NextRequest, NextResponse } from 'next/server';

interface ValidationResult {
  variable: string;
  status: 'valid' | 'invalid' | 'missing' | 'server-only';
  message: string;
  isRequired: boolean;
}

interface ValidationResponse {
  success: boolean;
  results: ValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    missing: number;
    serverOnly: number;
  };
}

// Helper function to validate CDP Project ID format
function validateCDPProjectId(value: string): boolean {
  // CDP Project IDs are typically UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Helper function to validate OnchainKit API Key format
function validateOnchainKitApiKey(value: string): boolean {
  // OnchainKit API keys are typically base64-encoded strings
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value) && value.length > 20;
}

// Helper function to validate WalletConnect Project ID format
function validateWalletConnectProjectId(value: string): boolean {
  // WalletConnect Project IDs are typically 32-character hex strings
  const hexRegex = /^[0-9a-f]{32}$/i;
  return hexRegex.test(value);
}

// Helper function to make API validation requests
async function validateApiKey(type: 'cdp' | 'onchainkit', apiKey: string, projectId?: string): Promise<boolean> {
  try {
    if (type === 'cdp' && projectId) {
      // Test CDP API with a simple request
      const response = await fetch('https://api.cdp.coinbase.com/platform/v1/networks', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });
      return response.ok;
    }
    
    if (type === 'onchainkit') {
      // Test OnchainKit API with RPC endpoint (Client API Key is embedded in URL)
      const rpcUrl = `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${apiKey}`;
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Check if we got a valid JSON-RPC response
        return data && data.jsonrpc === '2.0' && data.result;
      }
      return false;
    }
    
    return false;
  } catch (error) {
    console.error(`API validation error for ${type}:`, error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const results: ValidationResult[] = [];
    
    // Client-side environment variables (accessible in browser)
    const clientVars = [
      {
        name: 'NEXT_PUBLIC_CDP_PROJECT_ID',
        value: process.env.NEXT_PUBLIC_CDP_PROJECT_ID,
        required: true,
        validator: validateCDPProjectId,
      },
      {
        name: 'NEXT_PUBLIC_ONCHAINKIT_API_KEY',
        value: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
        required: true,
        validator: validateOnchainKitApiKey,
      },
      {
        name: 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
        value: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        required: true,
        validator: validateWalletConnectProjectId,
      },
    ];

    // Server-side environment variables (not accessible in browser)
    const serverVars = [
      {
        name: 'CDP_PROJECT_ID',
        value: process.env.CDP_PROJECT_ID,
        required: true,
        validator: validateCDPProjectId,
      },
      {
        name: 'ONCHAINKIT_API_KEY',
        value: process.env.ONCHAINKIT_API_KEY,
        required: true,
        validator: validateOnchainKitApiKey,
      },
      {
        name: 'CDP_API_KEY_NAME',
        value: process.env.CDP_API_KEY_NAME,
        required: false,
        validator: (value: string) => value.length > 0,
      },
      {
        name: 'CDP_API_KEY_PRIVATE_KEY',
        value: process.env.CDP_API_KEY_PRIVATE_KEY,
        required: false,
        validator: (value: string) => value.length > 50, // Private keys are long
      },
      {
        name: 'IRON_PASSWORD',
        value: process.env.IRON_PASSWORD,
        required: false,
        validator: (value: string) => value.length >= 32, // Iron passwords should be at least 32 chars
      },
    ];

    // Validate client-side variables
    for (const envVar of clientVars) {
      if (!envVar.value) {
        results.push({
          variable: envVar.name,
          status: 'missing',
          message: `${envVar.name} is not set`,
          isRequired: envVar.required,
        });
      } else if (envVar.name === 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID' && envVar.value === 'demo-project-id') {
        results.push({
          variable: envVar.name,
          status: 'invalid',
          message: 'Using demo project ID - replace with real WalletConnect Project ID',
          isRequired: envVar.required,
        });
      } else if (!envVar.validator(envVar.value)) {
        results.push({
          variable: envVar.name,
          status: 'invalid',
          message: `${envVar.name} format is invalid`,
          isRequired: envVar.required,
        });
      } else {
        // Perform API validation for certain keys
        let apiValid = true;
        if (envVar.name === 'NEXT_PUBLIC_ONCHAINKIT_API_KEY') {
          apiValid = await validateApiKey('onchainkit', envVar.value);
        }
        
        results.push({
          variable: envVar.name,
          status: apiValid ? 'valid' : 'invalid',
          message: apiValid 
            ? `${envVar.name} is valid and working`
            : `${envVar.name} format is correct but API validation failed`,
          isRequired: envVar.required,
        });
      }
    }

    // Validate server-side variables
    for (const envVar of serverVars) {
      if (!envVar.value) {
        results.push({
          variable: envVar.name,
          status: envVar.required ? 'missing' : 'server-only',
          message: envVar.required 
            ? `${envVar.name} is not set (server-side)`
            : `${envVar.name} is optional and not set`,
          isRequired: envVar.required,
        });
      } else if (!envVar.validator(envVar.value)) {
        results.push({
          variable: envVar.name,
          status: 'invalid',
          message: `${envVar.name} format is invalid (server-side)`,
          isRequired: envVar.required,
        });
      } else {
        results.push({
          variable: envVar.name,
          status: 'valid',
          message: `${envVar.name} is valid (server-side)`,
          isRequired: envVar.required,
        });
      }
    }

    // Calculate summary
    const summary = {
      total: results.length,
      valid: results.filter(r => r.status === 'valid').length,
      invalid: results.filter(r => r.status === 'invalid').length,
      missing: results.filter(r => r.status === 'missing').length,
      serverOnly: results.filter(r => r.status === 'server-only').length,
    };

    const response: ValidationResponse = {
      success: true,
      results,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Environment validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate environment variables',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
