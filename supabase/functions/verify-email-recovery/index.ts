import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  email: string;
  token: string;
  newPassword: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token, newPassword }: VerifyRequest = await req.json();

    // Validate inputs
    if (!email || !token || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Email, token e nova senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Senha deve ter no mínimo 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token in auth_otp_codes table
    const { data: otpRecord, error: otpError } = await supabase
      .from("auth_otp_codes")
      .select("*")
      .eq("phone", email.toLowerCase()) // Email stored in phone field
      .eq("code", token)
      .eq("purpose", "email_recovery")
      .eq("used", false)
      .single();

    if (otpError || !otpRecord) {
      console.error("Token not found or already used:", otpError);
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido ou expirado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(otpRecord.expires_at);
    if (new Date() > expiresAt) {
      // Mark as used even if expired
      await supabase
        .from("auth_otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ success: false, error: "Token expirado. Solicite um novo link." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used immediately to prevent reuse
    const { error: updateError } = await supabase
      .from("auth_otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    if (updateError) {
      console.error("Error marking token as used:", updateError);
    }

    // Find user by email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error listing users:", authError);
      throw new Error("Erro ao buscar usuário");
    }

    const user = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error("User not found for email:", email);
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user password
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (passwordError) {
      console.error("Error updating password:", passwordError);
      throw new Error("Erro ao atualizar senha");
    }

    console.log("Password updated successfully for user:", user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Senha atualizada com sucesso",
        email: user.email 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in verify-email-recovery:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
