import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: 'Telefone e código são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify OTP code
    const { data: otpRecord, error: otpError } = await supabase
      .from('auth_otp_codes')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      // Increment attempts if OTP exists
      if (!otpRecord) {
        await supabase
          .from('auth_otp_codes')
          .update({ attempts: supabase.rpc('increment_attempts') })
          .eq('phone', formattedPhone)
          .eq('verified', false);
      }

      return new Response(
        JSON.stringify({ error: 'Código inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      await supabase
        .from('auth_otp_codes')
        .update({ verified: true })
        .eq('id', otpRecord.id);

      return new Response(
        JSON.stringify({ error: 'Número máximo de tentativas excedido. Solicite um novo código.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('auth_otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // Find client by phone number
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, barbershop_id, name, phone')
      .or(`phone.eq.${formattedPhone},phone.eq.${phone}`)
      .eq('active', true)
      .limit(1)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Nenhum cliente encontrado com este telefone. Verifique se você está cadastrado na barbearia.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if client already has a user account
    const { data: existingClientUser } = await supabase
      .from('client_users')
      .select('user_id')
      .eq('client_id', client.id)
      .single();

    let userId: string;

    if (existingClientUser) {
      // Client already has account, just login
      userId = existingClientUser.user_id;
    } else {
      // Create new user account for client
      const tempEmail = `${formattedPhone}@cliente.barbersmart.app`;
      const tempPassword = crypto.randomUUID();

      // Check if user with this email exists
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userWithEmail = existingUser?.users?.find(u => u.email === tempEmail);

      if (userWithEmail) {
        userId = userWithEmail.id;
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: tempEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: client.name,
            phone: formattedPhone,
            is_client: true
          }
        });

        if (createError || !newUser.user) {
          console.error('Error creating user:', createError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar conta. Tente novamente.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        userId = newUser.user.id;
      }

      // Create client_users link
      const { error: linkError } = await supabase
        .from('client_users')
        .upsert({
          user_id: userId,
          client_id: client.id
        }, { onConflict: 'user_id' });

      if (linkError) {
        console.error('Error linking client:', linkError);
      }

      // Create user_roles entry
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'cliente',
          barbershop_id: client.barbershop_id
        }, { onConflict: 'user_id,role,barbershop_id' });

      if (roleError) {
        console.error('Error creating role:', roleError);
      }
    }

    // Generate session token for frontend to complete login
    const sessionToken = crypto.randomUUID();
    
    // Store session token temporarily
    await supabase
      .from('auth_otp_codes')
      .update({ session_token: sessionToken })
      .eq('id', otpRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        sessionToken,
        clientId: client.id,
        message: 'Login realizado com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-otp-client:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
