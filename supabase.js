import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://jlardcellqgkpamfmhje.supabase.co';
const supabaseKey = 'sb_publishable_IZzmHH8Raf_qsO_bNkFeRw_Zeb_y52K';

export const supabase = createClient(supabaseUrl, supabaseKey);