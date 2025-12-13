// Edge Function para finalizar login via token OTP
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { phone, sessionToken } = await req.json();

    if (!phone || !sessionToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar telefone
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`[Login Token] Validando token para: ${formattedPhone}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validar token
    const { data: tokenData, error: tokenError } = await supabase
      .from('auth_otp_codes')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('code', sessionToken)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('[Login Token] Token inválido ou expirado');
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marcar token como usado
    await supabase
      .from('auth_otp_codes')
      .update({ verified: true })
      .eq('id', tokenData.id);

    // Buscar usuário pelo telefone
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .or(`phone.eq.${formattedPhone},phone.eq.${formattedPhone.replace(/^55/, '')}`)
      .maybeSingle();

    let userId = profile?.id;

    if (!userId) {
      // Buscar por email temporário
      const tempEmail = `${formattedPhone}@whatsapp.barbersmart.app`;
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users?.find(u => u.email === tempEmail);
      userId = user?.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase.auth.admin.getUserById(userId);

    if (!userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar link de login
    const redirectUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://barbersmart.lovable.app';
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (linkError) {
      console.error('[Login Token] Erro ao gerar link:', linkError);
      
      // Fallback: retornar dados do usuário para o frontend fazer o login
      return new Response(
        JSON.stringify({ 
          success: true,
          userId,
          email: userData.user.email,
          needsManualLogin: true,
          message: 'Use o email para login'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Login Token] Link gerado para: ${formattedPhone}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        userId,
        loginUrl: linkData.properties?.action_link,
        email: userData.user.email,
        message: 'Login autorizado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Login Token] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
