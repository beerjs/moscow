const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

const AIRTABLE_BASE_ID = 'appcGU72VDA9lU29j';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

if (!AIRTABLE_API_KEY) {
  console.error('Error: AIRTABLE_API_KEY is not set');
  console.error('Set it with: export AIRTABLE_API_KEY="your_api_key"');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Releases';

function formatDate(dateString) {
  if (!dateString) return '';
  
  if (typeof dateString === 'string' && dateString.includes('г.')) {
    return dateString;
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  const months = [
    'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year} г.`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownTable(records) {
  const sortedRecords = records.sort((a, b) => {
    const numA = parseInt(a.fields.Number || a.fields['#'] || 0);
    const numB = parseInt(b.fields.Number || b.fields['#'] || 0);
    return numB - numA;
  });
  
  let table = '| #   | Date                | Place                      | Comment              |\n';
  table += '|-----|---------------------|----------------------------|----------------------|\n';
  
  for (const record of sortedRecords) {
    const fields = record.fields;
    
    const number = fields.Number || fields['#'] || fields.ID || '';
    const date = formatDate(fields.Date || fields['Дата'] || fields.Date || '');
    const place = escapeHtml(fields.Place || fields['Место'] || fields.Venue || '');
    const comment = escapeHtml(fields.Comment || fields['Комментарий'] || fields.Note || '');
    
    const numberStr = String(number).padEnd(4);
    const dateStr = date.padEnd(20);
    const placeStr = place.padEnd(27);
    const commentStr = comment.padEnd(20);
    
    table += `| ${numberStr} | ${dateStr} | ${placeStr} | ${commentStr} |\n`;
  }
  
  return table;
}

async function syncFromAirtable() {
  try {
    console.log(`Fetching data from table "${TABLE_NAME}"...`);
    
    const records = [];
    
    await base(TABLE_NAME).select({
      sort: [{ field: 'Number', direction: 'desc' }]
    }).eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords);
      fetchNextPage();
    });
    
    console.log(`Fetched ${records.length} records`);
    
    if (records.length === 0) {
      console.warn('Warning: no records found');
      console.warn('Check:');
      console.warn(`1. AIRTABLE_TABLE_NAME is correct (current: "${TABLE_NAME}")`);
      console.warn('2. Table exists in the base');
      console.warn('3. Table has records');
      return;
    }
    
    const markdownTable = formatMarkdownTable(records);
    
    const readmePath = path.join(__dirname, 'README.md');
    let readmeContent = fs.readFileSync(readmePath, 'utf8');
    
    const releasesStart = readmeContent.indexOf('## Releases');
    if (releasesStart === -1) {
      console.error('Error: "## Releases" section not found in README.md');
      return;
    }
    
    const beforeReleases = readmeContent.substring(0, releasesStart);
    const newContent = beforeReleases + '## Releases\n\n' + markdownTable + '\n';
    
    fs.writeFileSync(readmePath, newContent, 'utf8');
    
    console.log('✓ README.md updated successfully');
    console.log(`✓ Updated ${records.length} records`);
    
  } catch (error) {
    console.error('Sync error:', error.message);
    
    if (error.error) {
      console.error('Error details:', error.error);
    }
    
    if (error.statusCode === 404) {
      console.error('\nPossible causes:');
      console.error('1. Wrong table name. Try setting AIRTABLE_TABLE_NAME');
      console.error('2. Table does not exist in the base');
      console.error('3. Wrong BASE_ID');
    } else if (error.statusCode === 401) {
      console.error('\nAuthorization error. Check AIRTABLE_API_KEY');
    }
    
    process.exit(1);
  }
}

syncFromAirtable();

