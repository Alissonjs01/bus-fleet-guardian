import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gera uma chave de licença aleatória no formato XXXX-XXXX-XXXX-XXXX
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { license_key, fingerprint_hash } = await req.json();
    
    if (!license_key || !fingerprint_hash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chave e fingerprint são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Busca a licença
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('key', license_key.toUpperCase())
      .single();

    if (licenseError || !license) {
      console.log('License not found:', license_key);
      return new Response(
        JSON.stringify({ success: false, error: 'Chave de licença inválida ou não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica status
    if (license.status === 'blocked') {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta licença foi bloqueada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (license.status === 'expired' || new Date(license.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta licença está expirada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica ativação existente
    const { data: existingActivation } = await supabase
      .from('activations')
      .select('*')
      .eq('license_id', license.id)
      .single();

    if (existingActivation && existingActivation.fingerprint_hash !== fingerprint_hash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta licença já está ativada em outro computador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cria ou atualiza ativação
    if (!existingActivation) {
      await supabase.from('activations').insert({
        license_id: license.id,
        fingerprint_hash,
      });
    } else {
      await supabase
        .from('activations')
        .update({ last_validated_at: new Date().toISOString() })
        .eq('id', existingActivation.id);
    }

    // Atualiza status para ativo
    if (license.status === 'pending') {
      await supabase
        .from('licenses')
        .update({ status: 'active' })
        .eq('id', license.id);
    }

    // Registra log
    await supabase.from('activity_logs').insert({
      license_id: license.id,
      action: 'activation',
      details: { fingerprint_hash: fingerprint_hash.substring(0, 8) + '...' },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    });

    // Gera token simples (em produção, usar JWT assinado)
    const token = btoa(JSON.stringify({
      license_id: license.id,
      fingerprint_hash,
      issued_at: Date.now(),
      expires_at: new Date(license.expires_at).getTime(),
      plan: license.plan,
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        token,
        expiresAt: license.expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Activation error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
