import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 샘플 데이터를 위한 파일 몇개만 처리
const processSampleFiles = async (folderPath, maxFiles = 2) => {
  const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.csv'));
  const results = [];
  
  for (const file of files.slice(0, maxFiles)) {
    try {
      const filePath = path.join(folderPath, file);
      const buffer = fs.readFileSync(filePath);
      const str = iconv.decode(buffer, 'euc-kr');
      
      const lines = str.split('\n');
      const headers = lines[0].split(',');
      
      for (let i = 1; i < Math.min(lines.length, 1000); i++) { // 최대 1000줄만
        const line = lines[i].trim();
        if (line) {
          const values = line.split(',');
          const row = {};
          headers.forEach((header, index) => {
            const cleanHeader = header.trim();
            const cleanValue = values[index] ? values[index].trim() : '';
            
            if (cleanHeader === '등록장애인수' || cleanHeader === '연령') {
              row[cleanHeader] = parseInt(cleanValue) || 0;
            } else {
              row[cleanHeader] = cleanValue;
            }
          });
          results.push(row);
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  return results;
};

const main = async () => {
  const dbPath = path.join(__dirname, '../../DB');
  
  console.log('Creating sample data...');
  
  const processedData = {
    byAgeAndSeverity: await processSampleFiles(path.join(dbPath, '1')),
    byAgeAndGender: await processSampleFiles(path.join(dbPath, '2')),
    byTypeAndGender: await processSampleFiles(path.join(dbPath, '4')),
    byTypeAndAge: await processSampleFiles(path.join(dbPath, '5')),
    bySeverityAndGender: await processSampleFiles(path.join(dbPath, '6'))
  };
  
  // 결과 통계
  console.log('\n=== 샘플 데이터 생성 완료 ===');
  for (const [key, data] of Object.entries(processedData)) {
    console.log(`${key}: ${data.length} records`);
  }
  
  // JSON 파일로 저장
  const outputPath = path.join(__dirname, '../src/data/sample-data.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));
  
  console.log(`\n✓ Sample data saved to: ${outputPath}`);
};

main();