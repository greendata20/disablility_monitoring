import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 저장소
const processedData = {
  byAgeAndSeverity: [],      // 폴더 1: 연령 + 장애정도
  byAgeAndGender: [],        // 폴더 2,3: 연령 + 성별
  byTypeAndGender: [],       // 폴더 4: 장애유형 + 성별
  byTypeAndAge: [],          // 폴더 5: 연령 + 장애유형
  bySeverityAndGender: []    // 폴더 6: 장애정도 + 성별
};

// CSV 파일 읽기 함수 (EUC-KR 인코딩 지원)
const readCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const buffer = fs.readFileSync(filePath);
    const str = iconv.decode(buffer, 'euc-kr');
    
    const lines = str.split('\n');
    const headers = lines[0].split(',');
    
    for (let i = 1; i < lines.length; i++) {
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
    resolve(results);
  });
};

// 폴더별 처리 함수
const processFolderData = async (folderPath, dataKey) => {
  console.log(`Processing folder: ${folderPath}`);
  const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.csv'));
  
  for (const file of files.slice(0, 10)) { // 처리 속도를 위해 일부만 처리
    try {
      const filePath = path.join(folderPath, file);
      const data = await readCSVFile(filePath);
      processedData[dataKey].push(...data);
      console.log(`✓ Processed: ${file} (${data.length} records)`);
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }
};

// 메인 실행 함수
const main = async () => {
  const dbPath = path.join(__dirname, '../../DB');
  
  try {
    // 각 폴더 처리
    await processFolderData(path.join(dbPath, '1'), 'byAgeAndSeverity');
    await processFolderData(path.join(dbPath, '2'), 'byAgeAndGender');
    await processFolderData(path.join(dbPath, '3'), 'byAgeAndGender'); // 폴더3도 연령+성별 데이터
    await processFolderData(path.join(dbPath, '4'), 'byTypeAndGender');
    await processFolderData(path.join(dbPath, '5'), 'byTypeAndAge');
    await processFolderData(path.join(dbPath, '6'), 'bySeverityAndGender');
    
    // 중복 제거 및 데이터 정제
    for (const key in processedData) {
      processedData[key] = processedData[key].filter((item, index, self) => 
        index === self.findIndex(t => 
          t.통계연월 === item.통계연월 && 
          t.통계시도명 === item.통계시도명 && 
          t.통계시군구명 === item.통계시군구명 &&
          JSON.stringify(t) === JSON.stringify(item)
        )
      );
    }
    
    // 결과 통계
    console.log('\n=== 데이터 변환 완료 ===');
    for (const [key, data] of Object.entries(processedData)) {
      console.log(`${key}: ${data.length} records`);
    }
    
    // JSON 파일로 저장
    const outputPath = path.join(__dirname, '../src/data/disability-data.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));
    
    console.log(`\n✓ Data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
};

main();