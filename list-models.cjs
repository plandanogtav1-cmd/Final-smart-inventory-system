// List available Gemini models
const fetch = require('node-fetch');

const API_KEY = 'AIzaSyCE3kM0VvkKCFg-HJBCa1yipr3PUEHvCOI';

async function listModels() {
  try {
    console.log('Listing available Gemini models...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
    );

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Available models:');
    
    if (data.models) {
      data.models.forEach(model => {
        console.log(`- ${model.name} (${model.displayName})`);
      });
    } else {
      console.log('Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

listModels();