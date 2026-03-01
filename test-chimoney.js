/**
 * Test script to debug Chimoney API connectivity
 */

const getChimoneyConfig = require('./config/chimoney');

async function testChimoneyAPI() {
  console.log('🧪 Testing Chimoney API...\n');

  try {
    // Get config
    const config = getChimoneyConfig();
    console.log(`✅ Config loaded`);
    console.log(`   Environment: ${config.environment}`);
    console.log(`   API Key: ${config.apiKey.substring(0, 20)}...`);
    console.log(`   Base URL: ${config.baseUrl}\n`);

    // Test API call
    console.log('📡 Testing Chimoney API connection...');
    const url = `${config.baseUrl}/v0.2.4/rate?countryTo=NG`;
    console.log(`   URL: ${url}\n`);

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': config.apiKey,
      },
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}\n`);

    const data = await response.json();
    console.log('📦 Response Data:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS: Chimoney API is working!');
    } else {
      console.log('\n❌ ERROR: Chimoney API returned an error');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if CHIMONEY_API_KEY_SANDBOX is set in .env.local');
    console.error('2. Verify the API key is correct');
    console.error('3. Check internet connection');
    console.error('4. Try accessing Chimoney API directly');
  }
}

testChimoneyAPI();
