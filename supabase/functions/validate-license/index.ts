import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, fingerprint_hash } = await req.json();
    
    if (!token || !fingerprint_hash) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token e fingerprint são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decodifica token
    let tokenData;
    try {
      tokenData = JSON.parse(atob(token));
    } catch {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica fingerprint
    if (tokenData.fingerprint_hash !== fingerprint_hash) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Fingerprint não corresponde' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Busca licença atual
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', tokenData.license_id)
      .single();

    if (error || !license) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Licença não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica status
    if (license.status === 'blocked') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Licença bloqueada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(license.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Licença expirada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualiza última validação
    await supabase
      .from('activations')
      .update({ last_validated_at: new Date().toISOString() })
      .eq('license_id', license.id)
      .eq('fingerprint_hash', fingerprint_hash);

    // Gera novo token
    const newToken = btoa(JSON.stringify({
      license_id: license.id,
      fingerprint_hash,
      issued_at: Date.now(),
      expires_at: new Date(license.expires_at).getTime(),
      plan: license.plan,
    }));

    return new Response(
      JSON.stringify({ 
        valid: true, 
        token: newToken,
        expiresAt: license.expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Validation error:', err);
    return new Response(
      JSON.stringify({ valid: false, error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
