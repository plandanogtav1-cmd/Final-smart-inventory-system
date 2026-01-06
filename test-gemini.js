// Test Gemini API directly
const fetch = require('node-fetch');

const API_KEY = 'AIzaSyCE3kM0VvkKCFg-HJBCa1yipr3PUEHvCOI';

async function testGemini() {
  try {
    console.log('Testing Gemini API...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, how are you?' }] }]
        })
      }
    );

    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);

  } catch (error) {
    console.error('Error:', error);
  }
}

testGemini();