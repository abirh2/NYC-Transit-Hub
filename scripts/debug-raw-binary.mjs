/**
 * Debug script to look at raw binary data and find extension fields
 */

const MTA_API_KEY = '2d394b0e-269d-454b-b229-66d15474c2f2';
const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`;

async function main() {
  console.log(`Fetching raw feed...\n`);

  const response = await fetch(FEED_URL, {
    headers: { 'x-api-key': MTA_API_KEY },
  });

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Convert to string and look for text patterns
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const text = decoder.decode(bytes);
  
  // Look for status strings
  const statusPatterns = ['Departed', 'Arriving', 'On-Time', 'Late', 'Early'];
  
  console.log(`Looking for status strings in the raw binary...\n`);
  
  for (const pattern of statusPatterns) {
    const count = (text.match(new RegExp(pattern, 'g')) || []).length;
    if (count > 0) {
      console.log(`Found "${pattern}": ${count} occurrences`);
      
      // Find first occurrence and show context
      const idx = text.indexOf(pattern);
      if (idx !== -1) {
        // Show bytes around this text
        const start = Math.max(0, idx - 20);
        const end = Math.min(text.length, idx + pattern.length + 20);
        const context = text.slice(start, end);
        console.log(`  Context: ...${context.replace(/[^\x20-\x7E]/g, '.')}...`);
        
        // Show hex bytes around it
        const hexStart = Math.max(0, idx - 10);
        const hexEnd = Math.min(bytes.length, idx + pattern.length + 10);
        const hexBytes = Array.from(bytes.slice(hexStart, hexEnd))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
        console.log(`  Hex: ${hexBytes}`);
      }
    }
  }
  
  // Also look for train 1324 and see surrounding data
  console.log(`\n\nLooking for entity 1324...\n`);
  const idx1324 = text.indexOf('1324');
  if (idx1324 !== -1) {
    // Find next "Departed" or "Arriving" after this
    const searchStart = idx1324;
    const nextDeparted = text.indexOf('Departed', searchStart);
    const nextArriving = text.indexOf('Arriving', searchStart);
    
    if (nextDeparted !== -1 && nextDeparted - idx1324 < 500) {
      console.log(`Found "Departed" at offset ${nextDeparted - idx1324} bytes from entity 1324`);
    }
    if (nextArriving !== -1 && nextArriving - idx1324 < 500) {
      console.log(`Found "Arriving" at offset ${nextArriving - idx1324} bytes from entity 1324`);
    }
  }
}

main().catch(console.error);

