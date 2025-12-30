import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function TestConnection() {
  const [status, setStatus] = useState('Testing connection...');

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('products').select('count').limit(1);
        if (error) {
          setStatus(`Connection failed: ${error.message}`);
        } else {
          setStatus('Connection successful!');
        }
      } catch (error) {
        setStatus(`Connection error: ${error}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl text-white mb-4">Inventra Connection Test</h1>
        <p className="text-gray-400">{status}</p>
      </div>
    </div>
  );
}