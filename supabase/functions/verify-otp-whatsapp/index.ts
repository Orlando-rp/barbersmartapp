// Edge Function para verificar código OTP e autenticar usuário
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
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telefone e código são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar telefone
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`[Verify OTP] Verificando código para: ${formattedPhone}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar código OTP válido
    const { data: otpData, error: otpError } = await supabase
      .from('auth_otp_codes')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error('[Verify OTP] Erro ao buscar código:', otpError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao verificar código' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otpData) {
      // Incrementar tentativas do código mais recente não verificado
      const { data: latestOtp } = await supabase
        .from('auth_otp_codes')
        .select('id, attempts')
        .eq('phone', formattedPhone)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestOtp) {
        await supabase
          .from('auth_otp_codes')
          .update({ attempts: latestOtp.attempts + 1 })
          .eq('id', latestOtp.id);

        if (latestOtp.attempts >= 2) {
          // Invalidar código após 3 tentativas
          await supabase
            .from('auth_otp_codes')
            .update({ verified: true })
            .eq('id', latestOtp.id);

          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Código inválido. Máximo de tentativas atingido. Solicite novo código.' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Código inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar máximo de tentativas
    if (otpData.attempts >= 3) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Máximo de tentativas atingido. Solicite novo código.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marcar código como verificado
    await supabase
      .from('auth_otp_codes')
      .update({ verified: true })
      .eq('id', otpData.id);

    console.log(`[Verify OTP] Código verificado com sucesso para: ${formattedPhone}`);

    // Buscar usuário existente pelo telefone no profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('phone', formattedPhone)
      .maybeSingle();

    // Também buscar em formato alternativo (sem código do país)
    let userId = existingProfile?.id;
    let isNewUser = !existingProfile;

    if (!existingProfile) {
      const phoneWithoutCountry = formattedPhone.replace(/^55/, '');
      const { data: altProfile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('phone', phoneWithoutCountry)
        .maybeSingle();

      if (altProfile) {
        userId = altProfile.id;
        isNewUser = false;
      }
    }

    if (isNewUser) {
      // Criar novo usuário no Supabase Auth
      // Usar email temporário baseado no telefone
      const tempEmail = `${formattedPhone}@whatsapp.barbersmart.app`;
      const tempPassword = crypto.randomUUID();

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        password: tempPassword,
        email_confirm: true,
        phone: formattedPhone,
        phone_confirm: true,
        user_metadata: {
          phone: formattedPhone,
          signup_method: 'whatsapp_otp'
        }
      });

      if (authError) {
        console.error('[Verify OTP] Erro ao criar usuário:', authError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar conta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = authData.user.id;
      console.log(`[Verify OTP] Novo usuário criado: ${userId}`);
    }

    // Gerar magic link para login
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: existingProfile ? undefined : `${formattedPhone}@whatsapp.barbersmart.app`,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://barbersmart.app'}/`
      }
    });

    // Se não conseguir gerar magic link, tentar outra abordagem
    // Criar sessão diretamente usando signInWithPassword com senha temporária
    
    // Buscar o email do usuário
    let userEmail: string;
    
    if (existingProfile) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId!);
      userEmail = userData.user?.email || `${formattedPhone}@whatsapp.barbersmart.app`;
    } else {
      userEmail = `${formattedPhone}@whatsapp.barbersmart.app`;
    }

    // Gerar token de sessão customizado
    // Para isso, vamos retornar um token especial que o frontend vai usar
    const sessionToken = crypto.randomUUID();
    
    // Salvar token temporário para validação no frontend
    await supabase
      .from('auth_otp_codes')
      .insert({
        phone: formattedPhone,
        code: sessionToken,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        verified: false, // Será verificado no login
        attempts: 0
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser,
        userId,
        sessionToken,
        message: isNewUser ? 'Conta criada com sucesso' : 'Login realizado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Verify OTP] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
