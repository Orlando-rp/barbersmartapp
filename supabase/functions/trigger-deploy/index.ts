import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Invalid token:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Check if user is super_admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (roleError) {
      console.error('Error checking role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Error checking permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleData) {
      console.error('User is not super_admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User is super_admin, proceeding with deploy trigger');

    // Get request body
    const { tag, skip_health_check } = await req.json();

    if (!tag) {
      return new Response(
        JSON.stringify({ error: 'Tag is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get GitHub secrets
    const githubPat = Deno.env.get('GITHUB_PAT');
    const githubOwner = Deno.env.get('GITHUB_OWNER');
    const githubRepo = Deno.env.get('GITHUB_REPO');

    if (!githubPat || !githubOwner || !githubRepo) {
      console.error('Missing GitHub configuration');
      return new Response(
        JSON.stringify({ 
          error: 'GitHub configuration missing',
          details: 'Please configure GITHUB_PAT, GITHUB_OWNER, and GITHUB_REPO secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Triggering workflow for ${githubOwner}/${githubRepo} with tag: ${tag}`);

    // Trigger GitHub Actions workflow
    const githubUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/build-push.yml/dispatches`;
    
    const githubResponse = await fetch(githubUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubPat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'BarberSmart-Deploy'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          tag: tag,
          skip_health_check: skip_health_check ? 'true' : 'false'
        }
      })
    });

    console.log('GitHub API response status:', githubResponse.status);

    if (githubResponse.status === 204) {
      console.log('Workflow triggered successfully');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Deploy triggered successfully',
          tag: tag,
          skip_health_check: !!skip_health_check
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle error responses
    let errorMessage = `GitHub API returned status ${githubResponse.status}`;
    try {
      const errorBody = await githubResponse.text();
      console.error('GitHub API error:', errorBody);
      errorMessage += `: ${errorBody}`;
    } catch (e) {
      console.error('Could not read error body');
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: githubResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trigger-deploy function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
