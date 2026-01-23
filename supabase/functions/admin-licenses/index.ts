import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function verifyAdmin(supabase: any, adminToken: string): Promise<boolean> {
  try {
    const tokenData = JSON.parse(atob(adminToken));
    const { data } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('user_id', tokenData.user_id)
      .eq('role', 'admin')
      .single();
    return !!data;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, admin_token } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verifica autenticação admin
    if (!await verifyAdmin(supabase, admin_token)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'list': {
        const { data: licenses } = await supabase
          .from('licenses')
          .select('*')
          .order('created_at', { ascending: false });
        return new Response(
          JSON.stringify({ success: true, licenses: licenses || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        const key = generateLicenseKey();
        const { data: license, error } = await supabase
          .from('licenses')
          .insert({
            key,
            status: 'pending',
            plan: 'monthly',
            expires_at: body.expires_at,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        await supabase.from('activity_logs').insert({
          license_id: license.id,
          action: 'created',
          details: { key },
        });

        return new Response(
          JSON.stringify({ success: true, license }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_status': {
        const { error } = await supabase
          .from('licenses')
          .update({ status: body.status })
          .eq('id', body.license_id);
        
        if (error) throw error;

        await supabase.from('activity_logs').insert({
          license_id: body.license_id,
          action: body.status === 'blocked' ? 'blocked' : 'updated',
          details: { new_status: body.status },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset_activation': {
        await supabase
          .from('activations')
          .delete()
          .eq('license_id', body.license_id);

        await supabase.from('activity_logs').insert({
          license_id: body.license_id,
          action: 'reset',
          details: { action: 'activation_reset' },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_expiration': {
        await supabase
          .from('licenses')
          .update({ expires_at: body.expires_at })
          .eq('id', body.license_id);

        await supabase.from('activity_logs').insert({
          license_id: body.license_id,
          action: 'updated',
          details: { new_expires_at: body.expires_at },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_logs': {
        let query = supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (body.license_id) {
          query = query.eq('license_id', body.license_id);
        }

        const { data: logs } = await query;
        return new Response(
          JSON.stringify({ success: true, logs: logs || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (err) {
    console.error('Admin licenses error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
