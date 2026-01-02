// Edge Function: test-smtp-connection
// Tests SMTP server connectivity and authentication
// Version: 1.0.0

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmtpTestRequest {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from_email: string;
  from_name: string;
  barbershop_id?: string; // Optional: for testing barbershop-specific SMTP
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', service: 'test-smtp-connection' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { host, port, secure, user, pass, from_email, from_name }: SmtpTestRequest = await req.json();

    console.log(`[SMTP Test] Testing connection to ${host}:${port} (secure: ${secure})`);

    if (!host || !user || !pass || !from_email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios não preenchidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configure SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: host,
        port: port,
        tls: secure,
        auth: {
          username: user,
          password: pass,
        },
      },
    });

    try {
      // Try to send a test email to the same address
      await client.send({
        from: `${from_name} <${from_email}>`,
        to: from_email, // Send test to itself
        subject: "✅ Teste de Conexão SMTP - BarberSmart",
        content: "auto",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #16a34a;">✅ Conexão SMTP Funcionando!</h2>
            <p>Este é um email de teste enviado pelo BarberSmart para verificar a configuração SMTP.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6b7280;">
              <strong>Servidor:</strong> ${host}:${port}<br/>
              <strong>Usuário:</strong> ${user}<br/>
              <strong>Remetente:</strong> ${from_name} &lt;${from_email}&gt;<br/>
              <strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        `,
      });

      await client.close();

      console.log('[SMTP Test] Connection successful, test email sent');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Conexão bem-sucedida! Email de teste enviado para ${from_email}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (sendError: any) {
      console.error('[SMTP Test] Send error:', sendError);
      
      await client.close().catch(() => {});
      
      // Parse common SMTP errors
      let errorMessage = sendError.message || 'Erro desconhecido';
      
      if (errorMessage.includes('authentication')) {
        errorMessage = 'Falha na autenticação. Verifique usuário e senha.';
      } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connection refused')) {
        errorMessage = 'Conexão recusada. Verifique host e porta.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Timeout na conexão. Servidor pode estar bloqueando a porta.';
      } else if (errorMessage.includes('certificate')) {
        errorMessage = 'Erro de certificado SSL/TLS. Tente mudar configuração de segurança.';
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('[SMTP Test] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
