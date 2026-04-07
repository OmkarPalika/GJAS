import fs from 'fs';
import path from 'path';

const INPUT_DIR = path.join(process.cwd(), '..', 'data', 'constitutions');
const OUTPUT_DIR = path.join(process.cwd(), '..', 'data', 'cleaned_constitutions');

function cleanText(text) {
  // Remove unwanted placeholders and navigation text
  let cleanedText = text.replace(/\\[\\[getTranslation\\(".*?\"\)\\]/g, '');
  cleanedText = cleanedText.replace(/\\n\\n\\n+/g, '\n\n');
  cleanedText = cleanedText.replace(/\\t+/g, ' ');
  cleanedText = cleanedText.replace(/\\s+/g, ' ');
  cleanedText = cleanedText.trim();
  
  return cleanedText;
}

function preprocessConstitutions() {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Read all files in the input directory
    const files = fs.readdirSync(INPUT_DIR);
    
    files.forEach(file => {
      const filePath = path.join(INPUT_DIR, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile() && file.endsWith('.txt')) {
        const constitutionText = fs.readFileSync(filePath, 'utf-8');
        const cleanedText = cleanText(constitutionText);
        
        const outputFilePath = path.join(OUTPUT_DIR, file);
        fs.writeFileSync(outputFilePath, cleanedText, 'utf-8');
        
        console.log(`Processed: ${file}`);
      }
    });

    console.log('Preprocessing complete!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

preprocessConstitutions();