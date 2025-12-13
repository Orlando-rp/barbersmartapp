// Edge Function para resetar senha após verificação OTP via WhatsApp
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
    const { phone, sessionToken, newPassword } = await req.json();

    if (!phone || !sessionToken || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telefone, token e nova senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Senha deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar telefone
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`[Reset Password] Resetando senha para: ${formattedPhone}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar session token (criado após verificação OTP)
    const { data: tokenData, error: tokenError } = await supabase
      .from('auth_otp_codes')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('code', sessionToken)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('[Reset Password] Token inválido ou expirado');
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado. Verifique seu telefone novamente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marcar token como usado
    await supabase
      .from('auth_otp_codes')
      .update({ verified: true })
      .eq('id', tokenData.id);

    // Buscar usuário pelo telefone no profiles
    let userId: string | null = null;

    // Tentar com telefone completo
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', formattedPhone)
      .maybeSingle();

    if (profile) {
      userId = profile.id;
    } else {
      // Tentar sem código do país
      const phoneWithoutCountry = formattedPhone.replace(/^55/, '');
      const { data: altProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phoneWithoutCountry)
        .maybeSingle();

      if (altProfile) {
        userId = altProfile.id;
      }
    }

    if (!userId) {
      // Tentar buscar pelo email temporário do WhatsApp
      const tempEmail = `${formattedPhone}@whatsapp.barbersmart.app`;
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(u => u.email === tempEmail || u.phone === formattedPhone);
      
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado com este telefone' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Reset Password] Usuário encontrado: ${userId}`);

    // Atualizar senha do usuário
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) {
      console.error('[Reset Password] Erro ao atualizar senha:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar senha' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar email do usuário para login
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = userData.user?.email;

    console.log(`[Reset Password] Senha atualizada com sucesso para: ${userEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email: userEmail,
        message: 'Senha atualizada com sucesso!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Reset Password] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
