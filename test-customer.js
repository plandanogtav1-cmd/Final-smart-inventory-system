// Quick test to create a customer directly
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'your_supabase_url'
const supabaseKey = 'your_supabase_anon_key'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testCustomer() {
  const result = await supabase
    .from('customers')
    .insert({
      name: 'Test Customer',
      phone: '09171234567',
      customer_type: 'regular',
      total_purchases: 1,
      last_purchase_date: new Date().toISOString()
    })
    .select()
  
  console.log('Result:', result)
}

testCustomer()