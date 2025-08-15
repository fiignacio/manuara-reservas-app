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

    // Validate cabin type
    const validCabinTypes = ['pequeña', 'mediana1', 'mediana2', 'grande'];
    if (!validCabinTypes.includes(cabinType)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid cabin type. Valid types are: ${validCabinTypes.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid date format. Use YYYY-MM-DD format.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (checkInDate < today) {
      return new Response(
        JSON.stringify({ 
          error: 'Check-in date cannot be in the past.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (checkOutDate <= checkInDate) {
      return new Response(
        JSON.stringify({ 
          error: 'Check-out date must be after check-in date.' 
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

    console.log('Using Firebase project:', serviceAccount.project_id);

    // Get Firebase Auth token
    const jwt = await createJWT(serviceAccount);
    console.log('JWT created successfully');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token request failed:', tokenResponse.status, errorText);
      throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token response:', tokenData);
    
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      throw new Error('No access token received from Firebase');
    }
    
    const accessToken = tokenData.access_token;

    // Query Firestore for reservations that overlap with the requested dates
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/reservations`;
    
    console.log(`Querying Firestore URL: ${firestoreUrl}`);
    
    const reservationsResponse = await fetch(firestoreUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!reservationsResponse.ok) {
      const errorText = await reservationsResponse.text();
      console.error('Error fetching reservations:', reservationsResponse.status, errorText);
      throw new Error(`Failed to fetch reservations: ${reservationsResponse.status} - ${errorText}`);
    }

    const reservationsData = await reservationsResponse.json();
    console.log('Raw Firestore response:', JSON.stringify(reservationsData, null, 2));
    
    const reservations = reservationsData.documents || [];
    console.log(`Found ${reservations.length} total reservations in Firestore`);

    // Check for conflicts
    const requestCheckIn = new Date(checkIn);
    const requestCheckOut = new Date(checkOut);
    
    console.log(`Checking availability for cabin "${cabinType}" from ${checkIn} to ${checkOut}`);
    
    const conflictingReservations = reservations.filter((doc: any) => {
      const data = doc.fields;
      
      // Validate data structure
      if (!data || !data.cabinType || !data.checkIn || !data.checkOut) {
        console.log(`  -> Skipping: incomplete reservation data`);
        return false;
      }
      
      const reservationCabinType = data.cabinType?.stringValue;
      const reservationCheckInStr = data.checkIn?.stringValue;
      const reservationCheckOutStr = data.checkOut?.stringValue;
      const status = data.status?.stringValue || 'confirmed'; // Default to confirmed if no status

      console.log(`Checking reservation: ${reservationCabinType}, ${reservationCheckInStr} to ${reservationCheckOutStr}, status: ${status}`);

      // Only check confirmed/active reservations for the same cabin type
      if (reservationCabinType !== cabinType) {
        console.log(`  -> Skipping: different cabin type (${reservationCabinType} vs ${cabinType})`);
        return false;
      }
      
      if (status === 'cancelled' || status === 'canceled') {
        console.log(`  -> Skipping: cancelled reservation`);
        return false;
      }

      // Parse dates with error handling
      const reservationCheckIn = new Date(reservationCheckInStr);
      const reservationCheckOut = new Date(reservationCheckOutStr);
      
      if (isNaN(reservationCheckIn.getTime()) || isNaN(reservationCheckOut.getTime())) {
        console.log(`  -> Skipping: invalid dates in reservation`);
        return false;
      }

      // Check for date overlap
      const hasOverlap = requestCheckIn < reservationCheckOut && requestCheckOut > reservationCheckIn;
      console.log(`  -> Date overlap check: ${hasOverlap} (request: ${requestCheckIn.toISOString()} - ${requestCheckOut.toISOString()}, reservation: ${reservationCheckIn.toISOString()} - ${reservationCheckOut.toISOString()})`);
      
      return hasOverlap;
    });

    console.log(`Found ${conflictingReservations.length} conflicting reservations`);
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