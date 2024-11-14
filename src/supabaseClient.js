import { createClient } from '@supabase/supabase-js';
import { getAuth,onAuthStateChanged } from 'firebase/auth';

const SUPABASE_URL = 'https://vmpilcujqwmxqygnjxbf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcGlsY3VqcXdteHF5Z25qeGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0OTEzNjIsImV4cCI6MjAzNzA2NzM2Mn0.oZkfYEotWPZLhTAL1UW5F5RLw5DLNd2RNB0-4-E-9rE';

// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {}
    }
  });
  
  // Set up auth listener to update headers
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Update headers when user is authenticated
      supabase.headers = {
        'x-hospital-id': user.uid
      };
    } else {
      // Clear headers when user is not authenticated
      supabase.headers = {};
    }
  });
  
  export { supabase };
  