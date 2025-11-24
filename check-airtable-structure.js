const Airtable = require('airtable');

const AIRTABLE_BASE_ID = 'appcGU72VDA9lU29j';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

if (!AIRTABLE_API_KEY) {
  console.error('Error: AIRTABLE_API_KEY is not set');
  console.error('Set it with: export AIRTABLE_API_KEY="your_api_key"');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Releases';

async function checkStructure() {
  try {
    console.log(`Checking table structure "${TABLE_NAME}"...\n`);
    
    const records = await base(TABLE_NAME).select({
      maxRecords: 5
    }).firstPage();
    
    if (records.length === 0) {
      console.log('Table is empty or not found');
      return;
    }
    
    console.log(`Found ${records.length} records\n`);
    console.log('Field structure (first record example):\n');
    
    const firstRecord = records[0];
    console.log('Record fields:');
    console.log(JSON.stringify(firstRecord.fields, null, 2));
    
    console.log('\n\nAll available fields:');
    const allFields = Object.keys(firstRecord.fields);
    allFields.forEach((field, index) => {
      const value = firstRecord.fields[field];
      const type = Array.isArray(value) ? 'array' : typeof value;
      console.log(`${index + 1}. "${field}" (${type}): ${JSON.stringify(value).substring(0, 50)}`);
    });
    
    console.log('\n\nAll records examples:');
    records.forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log(JSON.stringify(record.fields, null, 2));
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.error) {
      console.error('Details:', error.error);
    }
    
    if (error.statusCode === 404) {
      console.error('\nTable not found. Try:');
      console.error('1. Check table name (AIRTABLE_TABLE_NAME)');
      console.error('2. Check BASE_ID');
      console.error('3. Ensure API key has access to the base');
    } else if (error.statusCode === 401) {
      console.error('\nAuthorization error. Check AIRTABLE_API_KEY');
    }
    
    process.exit(1);
  }
}

checkStructure();

