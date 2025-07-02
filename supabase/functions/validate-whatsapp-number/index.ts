// supabase/functions/validate-whatsapp-number/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function validateWhatsAppNumber(instanceName: string, phoneNumber: string) {
  try {
    console.log(`Validating WhatsApp number ${phoneNumber} for instance ${instanceName}`);
    
    const response = await fetch(`${evolutionApiUrl}/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        numbers: [phoneNumber]
      }),
    });

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Evolution API response:', data);

    // Verificar se o número foi encontrado e retornar o JID
    if (data && Array.isArray(data) && data.length > 0) {
      const numberInfo = data.find((item: any) => 
        item.number === phoneNumber || 
        item.jid?.includes(phoneNumber.replace(/\D/g, ''))
      );
      
      if (numberInfo && numberInfo.jid) {
        return {
          valid: true,
          jid: numberInfo.jid,
          exists: numberInfo.exists !== false
        };
      }
    }

    return {
      valid: false,
      jid: null,
      exists: false
    };
  } catch (error) {
    console.error('Error validating WhatsApp number:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    const { phoneNumber, contactName } = await req.json();

    if (!phoneNumber || !contactName) {
      throw new Error('phoneNumber e contactName são obrigatórios');
    }

    // Buscar instância do usuário
    const { data: instance, error: instanceError } = await supabase
      .from('evolution_instances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (instanceError || !instance) {
      throw new Error('Instância WhatsApp não encontrada');
    }

    if (instance.status !== 'connected') {
      throw new Error('Instância WhatsApp não está conectada');
    }

    // Verificar se já existem 2 contatos
    const { data: existingContacts, error: countError } = await supabase
      .from('instance_contacts')
      .select('id')
      .eq('instance_id', instance.id);

    if (countError) {
      throw new Error('Erro ao verificar contatos existentes');
    }

    if (existingContacts && existingContacts.length >= 2) {
      throw new Error('Máximo de 2 contatos permitidos por instância');
    }

    // Formatar número para consulta (remover caracteres não numéricos)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Adicionar código do país se necessário (Brasil = 55)
    const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

    // Validar número via Evolution API
    const validation = await validateWhatsAppNumber(instance.instance_name, fullNumber);

    if (!validation.valid || !validation.jid) {
      throw new Error('Número não encontrado no WhatsApp ou inválido');
    }

    if (!validation.exists) {
      throw new Error('Número não possui WhatsApp ativo');
    }

    // Verificar se JID já existe para esta instância
    const { data: existingJid } = await supabase
      .from('instance_contacts')
      .select('id')
      .eq('instance_id', instance.id)
      .eq('jid', validation.jid)
      .single();

    if (existingJid) {
      throw new Error('Este número já está cadastrado');
    }

    // Criar novo contato
    const { data: newContact, error: insertError } = await supabase
      .from('instance_contacts')
      .insert({
        instance_id: instance.id,
        phone_number: phoneNumber,
        jid: validation.jid,
        contact_name: contactName,
        is_active: true,
      })
      .select('*')
      .single();

    if (insertError) {
      throw new Error(`Erro ao salvar contato: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact: newContact,
        message: 'Número validado e adicionado com sucesso!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in validate-whatsapp-number:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});