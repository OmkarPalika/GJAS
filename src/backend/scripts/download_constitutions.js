import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const CONSTITUTIONS_URL = 'https://www.constituteproject.org/constitutions?lang=en';
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'constitutions');

async function downloadConstitutions() {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Fetch the constitutions page
    const response = await axios.get(CONSTITUTIONS_URL);
    const $ = cheerio.load(response.data);

    // Extract constitution links
    const constitutionLinks = [];
    $('a[href*="/constitution/"]').each((i, element) => {
      const href = $(element).attr('href');
      if (href && !href.includes('download')) {
        constitutionLinks.push(`https://www.constituteproject.org${href}`);
      }
    });

    console.log(`Found ${constitutionLinks.length} constitutions to download.`);

    // Download each constitution
    for (let i = 0; i < constitutionLinks.length; i++) {
      const url = constitutionLinks[i];
      try {
        const constitutionResponse = await axios.get(url);
        const constitution$ = cheerio.load(constitutionResponse.data);

        // Extract country name
        const country = constitution$('h1').first().text().trim();
        const safeCountryName = country.replace(/[^a-zA-Z0-9]/g, '_');

        // Extract constitution text
        let constitutionText = '';
        constitution$('.constitution-text, .constitution-content, #constitution-text, .main-content').each((i, element) => {
          constitutionText += constitution$(element).text().trim() + '\n\n';
        });

        if (!constitutionText.trim()) {
          constitutionText = constitution$('body').text().trim();
        }

        // Save to file
        const filePath = path.join(OUTPUT_DIR, `${safeCountryName}.txt`);
        fs.writeFileSync(filePath, constitutionText, 'utf-8');

        console.log(`Downloaded: ${country}`);
      } catch (error) {
        console.error(`Failed to download ${url}:`, error.message);
      }
    }

    console.log('Download complete!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

downloadConstitutions();