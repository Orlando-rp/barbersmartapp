import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  type: "logo-light" | "logo-dark" | "favicon" | "all";
  brandName?: string;
  primaryColor?: string;
}

const getPrompt = (type: string, brandName: string, primaryColor: string): string => {
  const prompts: Record<string, string> = {
    "logo-light": `Create a modern, minimalist barbershop logo for "${brandName}". The design should feature a stylized barber pole or scissors icon combined with tech/smart elements. Use gold/caramel accent color (${primaryColor}) as the primary accent. Professional SaaS aesthetic. Dark text/elements on a clean white background. The logo should be clean, scalable, and suitable for a software company. Include the text "${brandName}" in a modern sans-serif font. Horizontal layout preferred.`,
    
    "logo-dark": `Create a modern, minimalist barbershop logo for "${brandName}". The design should feature a stylized barber pole or scissors icon combined with tech/smart elements. Use gold/caramel accent color (${primaryColor}) as the primary accent. Professional SaaS aesthetic. White/light text and elements on a dark/black background. The logo should be clean, scalable, and suitable for a software company. Include the text "${brandName}" in a modern sans-serif font. Horizontal layout preferred.`,
    
    "favicon": `Create a square app icon/favicon for "${brandName}" barbershop management software. Design a minimalist monogram "BS" or a stylized scissors/barber pole icon. Use gold (${primaryColor}) as the main color on a dark navy/black background. The icon must be recognizable at very small sizes (32x32 pixels). Clean, modern tech aesthetic. No text, just the icon symbol. Square format with slightly rounded corners.`
  };
  
  return prompts[type] || prompts["logo-light"];
};

const generateImage = async (prompt: string, size: string = "1024x1024"): Promise<string> => {
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!openAIApiKey) {
    throw new Error("OPENAI_API_KEY não está configurada");
  }

  console.log(`Gerando imagem com prompt: ${prompt.substring(0, 100)}...`);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAIApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: prompt,
      n: 1,
      size: size,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro da API OpenAI:", errorText);
    throw new Error(`Erro ao gerar imagem: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].b64_json;
};

const uploadToStorage = async (
  supabase: any,
  base64Data: string,
  fileName: string
): Promise<string> => {
  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const filePath = `branding/${fileName}`;
  
  // Delete existing file if it exists
  await supabase.storage.from("public-assets").remove([filePath]);

  // Upload new file
  const { data, error } = await supabase.storage
    .from("public-assets")
    .upload(filePath, bytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    console.error("Erro ao fazer upload:", error);
    throw new Error(`Erro ao fazer upload: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("public-assets")
    .getPublicUrl(filePath);

  console.log(`Upload concluído: ${urlData.publicUrl}`);
  return urlData.publicUrl;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      type = "all", 
      brandName = "BarberSmart",
      primaryColor = "#d4a574"
    }: GenerateRequest = await req.json();

    console.log(`Iniciando geração de imagens: tipo=${type}, marca=${brandName}`);

    const results: Record<string, string> = {};
    const timestamp = Date.now();

    if (type === "all" || type === "logo-light") {
      console.log("Gerando logo para modo claro...");
      const base64 = await generateImage(getPrompt("logo-light", brandName, primaryColor), "1792x1024");
      const url = await uploadToStorage(supabase, base64, `logo-light-${timestamp}.png`);
      results["logo_url"] = url;
    }

    if (type === "all" || type === "logo-dark") {
      console.log("Gerando logo para modo escuro...");
      const base64 = await generateImage(getPrompt("logo-dark", brandName, primaryColor), "1792x1024");
      const url = await uploadToStorage(supabase, base64, `logo-dark-${timestamp}.png`);
      results["logo_dark_url"] = url;
    }

    if (type === "all" || type === "favicon") {
      console.log("Gerando favicon...");
      const base64 = await generateImage(getPrompt("favicon", brandName, primaryColor), "1024x1024");
      const url = await uploadToStorage(supabase, base64, `favicon-${timestamp}.png`);
      results["favicon_url"] = url;
    }

    // Update system_branding if generating all
    if (type === "all") {
      console.log("Atualizando system_branding...");
      
      // Check if record exists
      const { data: existing } = await supabase
        .from("system_branding")
        .select("id")
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from("system_branding")
          .update({
            logo_url: results.logo_url,
            logo_dark_url: results.logo_dark_url,
            favicon_url: results.favicon_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("system_branding")
          .insert({
            system_name: brandName,
            logo_url: results.logo_url,
            logo_dark_url: results.logo_dark_url,
            favicon_url: results.favicon_url,
          });
      }
      
      console.log("Branding atualizado com sucesso!");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Imagens geradas com sucesso!",
        images: results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
