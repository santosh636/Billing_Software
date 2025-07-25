// update-user-metadata.ts

import { createClient } from '@supabase/supabase-js';

// Use your Supabase project URL and service role key (NOT anon key)
const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'YOUR_SERVICE_ROLE_KEY'
);

async function updateUserMetadata(userId: string, franchiseId: string) {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      franchise_id: franchiseId,
    },
  });

  if (error) {
    console.error('Error updating user metadata:', error.message);
  } else {
    console.log('✅ Updated user:', data?.user?.email || userId);
  }
}

// 🔧 Call it for a specific user
updateUserMetadata(
  'b43b6606-1187-48aa-9300-816bdab51c85', // example user ID
  'FR-ABC12345' // franchise ID to set
);
