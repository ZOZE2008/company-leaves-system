const { createClient } = window.supabase;

const supabaseUrl = 'https://jlardcellqgkpamfmhje.supabase.co';
const supabaseKey = 'sb_publishable_IZzmHH8Raf_qsO_bNkFeRw_Zeb_y52K';

const supabaseClient = createClient(supabaseUrl, supabaseKey);
window.supabaseClient = supabaseClient;