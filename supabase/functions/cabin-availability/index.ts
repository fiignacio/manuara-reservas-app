import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface AvailabilityRequest {
  cabinType: 'pequeña' | 'mediana1' | 'mediana2' | 'grande';
  checkIn: string;
  checkOut: string;
}

interface AvailabilityResponse {
  available: boolean;
  cabinType: string;
  checkIn: string;
  checkOut: string;
  nextAvailableDate?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('EXTERNAL_API_KEY');
    
    if (!apiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const url = new URL(req.url);
    const cabinType = url.searchParams.get('cabinType');
    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');

    if (!cabinType || !checkIn || !checkOut) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: cabinType, checkIn, checkOut' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Firebase Admin
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
    
    if (!serviceAccount.project_id) {
      throw new Error('Firebase service account not configured');
    }

    // Get Firebase Auth token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(serviceAccount),
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Query Firestore for reservations that overlap with the requested dates
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/reservations`;
    
    const reservationsResponse = await fetch(firestoreUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const reservationsData = await reservationsResponse.json();
    const reservations = reservationsData.documents || [];

    // Check for conflicts
    const requestCheckIn = new Date(checkIn);
    const requestCheckOut = new Date(checkOut);
    
    const conflictingReservations = reservations.filter((doc: any) => {
      const data = doc.fields;
      const reservationCabinType = data.cabinType?.stringValue;
      const reservationCheckIn = new Date(data.checkIn?.stringValue);
      const reservationCheckOut = new Date(data.checkOut?.stringValue);
      const status = data.status?.stringValue;

      // Only check confirmed reservations for the same cabin type
      if (reservationCabinType !== cabinType || status === 'cancelled') {
        return false;
      }

      // Check for date overlap
      return requestCheckIn < reservationCheckOut && requestCheckOut > reservationCheckIn;
    });

    const available = conflictingReservations.length === 0;
    
    const response: AvailabilityResponse = {
      available,
      cabinType,
      checkIn,
      checkOut,
    };

    // If not available, find next available date
    if (!available) {
      response.nextAvailableDate = await findNextAvailableDate(
        cabinType, 
        requestCheckOut, 
        reservations, 
        accessToken, 
        serviceAccount.project_id
      );
    }

    console.log('Availability check result:', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error checking availability:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createJWT(serviceAccount: any) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  
  // Convert the private key from PEM format to PKCS8
  const privateKeyPem = serviceAccount.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  const keyBuffer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

async function findNextAvailableDate(
  cabinType: string, 
  startDate: Date, 
  existingReservations: any[], 
  accessToken: string, 
  projectId: string
): Promise<string> {
  // Simple implementation: check next 30 days
  const current = new Date(startDate);
  
  for (let i = 0; i < 30; i++) {
    current.setDate(current.getDate() + 1);
    const checkDate = current.toISOString().split('T')[0];
    
    // Check if this date conflicts with any reservation
    const conflicts = existingReservations.some((doc: any) => {
      const data = doc.fields;
      const reservationCabinType = data.cabinType?.stringValue;
      const reservationCheckIn = new Date(data.checkIn?.stringValue);
      const reservationCheckOut = new Date(data.checkOut?.stringValue);
      const status = data.status?.stringValue;

      if (reservationCabinType !== cabinType || status === 'cancelled') {
        return false;
      }

      const testDate = new Date(checkDate);
      return testDate >= reservationCheckIn && testDate < reservationCheckOut;
    });

    if (!conflicts) {
      return checkDate;
    }
  }

  return '';
}