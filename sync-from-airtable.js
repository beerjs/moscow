require('dotenv').config();

const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

const AIRTABLE_BASE_ID = 'appcGU72VDA9lU29j';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

if (!AIRTABLE_API_KEY) {
  console.error('Error: AIRTABLE_API_KEY is not set');
  console.error('\nTo run locally, set the environment variable:');
  console.error('  export AIRTABLE_API_KEY="your_token_here"');
  console.error('  npm run sync');
  console.error('\nOr run in one line:');
  console.error('  AIRTABLE_API_KEY="your_token_here" npm run sync');
  console.error('\nTo get token: https://airtable.com/create/tokens');
  process.exit(1);
}

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);
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
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMarkdownTable(records) {
  const sortedRecords = records.sort((a, b) => {
    const numA = parseInt(a.fields.ID || 0);
    const numB = parseInt(b.fields.ID || 0);
    return numB - numA;
  });
  
  let maxNumberLength = 3;
  let maxDateLength = 20;
  let maxPlaceLength = 6;
  let maxCommentLength = 7;
  const processedRecords = [];
  
  for (const record of sortedRecords) {
    const fields = record.fields;
    
    if (!fields.date || !fields['Заголовок']) {
      continue;
    }
    
    const number = String(fields.ID || '');
    const date = formatDate(fields.date || '');
    const заголовок = fields['Заголовок'] || '';
    const place = заголовок.includes(',') ? заголовок.split(', ').slice(1).join(', ') : '';
    let comment = escapeHtml(fields.comment || '');
    comment = comment.replace(/\n/g, ' ').replace(/\r/g, '').trim();
    
    if (number.length > maxNumberLength) maxNumberLength = number.length;
    if (date.length > maxDateLength) maxDateLength = date.length;
    if (escapeHtml(place).length > maxPlaceLength) maxPlaceLength = escapeHtml(place).length;
    if (comment.length > maxCommentLength) maxCommentLength = comment.length;
    
    processedRecords.push({
      number: number,
      date: date,
      place: place,
      comment: comment
    });
  }
  
  const numberHeader = '#   '.padEnd(maxNumberLength + 1);
  const dateHeader = 'Date'.padEnd(maxDateLength);
  const placeHeader = 'Place'.padEnd(maxPlaceLength);
  const commentHeader = 'Comment'.padEnd(maxCommentLength);
  
  let table = `| ${numberHeader}| ${dateHeader} | ${placeHeader} | ${commentHeader} |\n`;
  table += `|${'-'.repeat(maxNumberLength + 2)}|${'-'.repeat(maxDateLength + 2)}|${'-'.repeat(maxPlaceLength + 2)}|${'-'.repeat(maxCommentLength + 2)}|\n`;
  
  for (const record of processedRecords) {
    const numberStr = (record.number || '').padEnd(maxNumberLength + 1);
    const dateStr = (record.date || '').padEnd(maxDateLength);
    const placeStr = (escapeHtml(record.place) || '').padEnd(maxPlaceLength);
    const commentStr = (record.comment || '').padEnd(maxCommentLength);
    
    table += `| ${numberStr}| ${dateStr} | ${placeStr} | ${commentStr} |\n`;
  }
  
  return table;
}

async function syncFromAirtable() {
  try {
    console.log(`Fetching data from table "${TABLE_NAME}"...`);
    
    const records = [];
    
    await base(TABLE_NAME).select({
      sort: [{ field: 'ID', direction: 'desc' }]
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
      console.error('Error details:', JSON.stringify(error.error, null, 2));
    }
    
    if (error.statusCode === 404) {
      console.error('\nPossible causes:');
      console.error('1. Wrong table name. Try setting AIRTABLE_TABLE_NAME');
      console.error('2. Table does not exist in the base');
      console.error('3. Wrong BASE_ID');
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      console.error('\nAuthorization error. Possible causes:');
      console.error('1. Token does not have scope: data.records:read');
      console.error(`2. Token does not have access to base: ${AIRTABLE_BASE_ID}`);
      console.error('3. Token is invalid or expired');
      console.error('\nTo fix:');
      console.error('1. Go to https://airtable.com/create/tokens');
      console.error('2. Create token with scope: data.records:read');
      console.error(`3. Grant access to base: ${AIRTABLE_BASE_ID}`);
      console.error('4. Update AIRTABLE_API_KEY secret in GitHub');
    }
    
    process.exit(1);
  }
}

syncFromAirtable();

