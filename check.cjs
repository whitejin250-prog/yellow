const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const lines = fs.readFileSync('src/supabase.ts', 'utf8');
const urlMatch = lines.match(/supabaseUrl = '([^']+)'/);
const keyMatch = lines.match(/supabaseAnonKey = '([^']+)'/);

if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    supabase.from('organization_units').select('*')
        .then(res => console.log(JSON.stringify(res.data, null, 2)))
        .catch(err => console.error(err));
} else {
    console.log('Could not find credentials');
}
