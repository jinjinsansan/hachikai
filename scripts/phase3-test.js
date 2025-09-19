#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Phase 3 test configuration
const phase3Files = [
  'src/types/amazon.ts',
  'src/utils/AmazonAPI.ts',
  'src/utils/ImageProcessor.ts',
  'src/utils/UserNetwork.ts',
  'src/utils/NotificationManager.ts',
  'src/screens/PurchaseConfirmation.tsx'
];

const testResults = {
  fileStructure: { passed: 0, failed: 0, tests: [] },
  imports: { passed: 0, failed: 0, tests: [] },
  exports: { passed: 0, failed: 0, tests: [] },
  types: { passed: 0, failed: 0, tests: [] },
  components: { passed: 0, failed: 0, tests: [] }
};

// Test 1: File Structure
console.log('\n📁 Testing Phase 3 File Structure...\n');
phase3Files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
    testResults.fileStructure.passed++;
    testResults.fileStructure.tests.push({ file, status: 'passed' });
  } else {
    console.log(`❌ ${file} not found`);
    testResults.fileStructure.failed++;
    testResults.fileStructure.tests.push({ file, status: 'failed', error: 'File not found' });
  }
});

// Test 2: Import Resolution
console.log('\n🔗 Testing Import Resolution...\n');
const importPatterns = [
  /import\s+(?:{[^}]+}|[^}]+)\s+from\s+['"]([^'"]+)['"]/g,
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
];

phase3Files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    let hasImportError = false;

    importPatterns.forEach(pattern => {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => {
        const importPath = match[1];

        // Skip node_modules and React Native built-ins
        if (importPath.startsWith('.') || importPath.startsWith('..')) {
          const resolvedPath = path.resolve(path.dirname(filePath), importPath);
          const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];

          let found = false;
          for (const ext of extensions) {
            if (fs.existsSync(resolvedPath + ext)) {
              found = true;
              break;
            }
          }

          if (!found) {
            console.log(`❌ Import error in ${file}: Cannot resolve '${importPath}'`);
            hasImportError = true;
            testResults.imports.failed++;
            testResults.imports.tests.push({ file, import: importPath, status: 'failed' });
          }
        }
      });
    });

    if (!hasImportError) {
      console.log(`✅ ${file} - All imports resolved`);
      testResults.imports.passed++;
      testResults.imports.tests.push({ file, status: 'passed' });
    }
  }
});

// Test 3: Export Verification
console.log('\n📤 Testing Export Consistency...\n');
phase3Files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for exports
    const hasExports = /export\s+(default|{|class|interface|type|const|function)/.test(content);
    const hasExportDefault = /export\s+default/.test(content);

    if (file.endsWith('.tsx') && !hasExportDefault) {
      console.log(`⚠️  ${file} - React component should have default export`);
      testResults.exports.failed++;
      testResults.exports.tests.push({ file, status: 'warning', issue: 'No default export' });
    } else if (hasExports) {
      console.log(`✅ ${file} - Exports found`);
      testResults.exports.passed++;
      testResults.exports.tests.push({ file, status: 'passed' });
    } else {
      console.log(`ℹ️  ${file} - No exports (may be intentional)`);
      testResults.exports.passed++;
      testResults.exports.tests.push({ file, status: 'info' });
    }
  }
});

// Test 4: Type Definitions
console.log('\n📊 Testing Type Definitions...\n');
phase3Files.forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for proper TypeScript usage
      const hasAnyType = /:\s*any(?:\s|;|,|\)|>)/.test(content);
      const hasTypes = /(?:interface|type|enum)\s+\w+/.test(content);
      const hasTypedParams = /\([^)]*:\s*\w+[^)]*\)/.test(content);

      if (hasAnyType) {
        console.log(`⚠️  ${file} - Uses 'any' type`);
        testResults.types.failed++;
        testResults.types.tests.push({ file, status: 'warning', issue: 'Uses any type' });
      } else if (hasTypes || hasTypedParams) {
        console.log(`✅ ${file} - Properly typed`);
        testResults.types.passed++;
        testResults.types.tests.push({ file, status: 'passed' });
      } else {
        console.log(`ℹ️  ${file} - Check type coverage`);
        testResults.types.passed++;
        testResults.types.tests.push({ file, status: 'info' });
      }
    }
  }
});

// Test 5: Component Properties (for React components)
console.log('\n🧩 Testing Component Properties...\n');
phase3Files.filter(f => f.endsWith('.tsx')).forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for proper prop definitions
    const hasPropsInterface = /interface\s+\w*Props\s*{/.test(content);
    const hasPropsType = /type\s+\w*Props\s*=/.test(content);
    const usesProps = /const\s+\w+\s*:\s*(?:React\.)?FC<\w*Props?>/.test(content) ||
                     /function\s+\w+\s*\([^)]*:\s*\w*Props[^)]*\)/.test(content);

    if (hasPropsInterface || hasPropsType) {
      console.log(`✅ ${file} - Props properly defined`);
      testResults.components.passed++;
      testResults.components.tests.push({ file, status: 'passed' });
    } else if (usesProps) {
      console.log(`✅ ${file} - Component uses props`);
      testResults.components.passed++;
      testResults.components.tests.push({ file, status: 'passed' });
    } else {
      console.log(`ℹ️  ${file} - No explicit props (may not need them)`);
      testResults.components.passed++;
      testResults.components.tests.push({ file, status: 'info' });
    }
  }
});

// Calculate total score
console.log('\n' + '='.repeat(50));
console.log('📊 Phase 3 Test Results Summary');
console.log('='.repeat(50) + '\n');

let totalPassed = 0;
let totalFailed = 0;
let totalTests = 0;

for (const category in testResults) {
  const result = testResults[category];
  totalPassed += result.passed;
  totalFailed += result.failed;
  totalTests += result.passed + result.failed;

  const categoryScore = result.failed === 0 ? '✅' : '❌';
  console.log(`${categoryScore} ${category}: ${result.passed}/${result.passed + result.failed} passed`);
}

const finalScore = Math.round((totalPassed / totalTests) * 100);
console.log('\n' + '='.repeat(50));
console.log(`🎯 Final Score: ${finalScore}/100`);
console.log('='.repeat(50) + '\n');

if (finalScore === 100) {
  console.log('🎉 Perfect score! All Phase 3 tests passed!');
} else {
  console.log(`⚠️  ${totalFailed} issues need to be fixed`);

  // Show failed tests
  console.log('\n❌ Failed Tests:');
  for (const category in testResults) {
    testResults[category].tests.forEach(test => {
      if (test.status === 'failed' || test.status === 'warning') {
        console.log(`  - ${category}: ${test.file} ${test.error || test.issue || test.import || ''}`);
      }
    });
  }
}

// Export results for further processing
fs.writeFileSync(
  path.join(__dirname, 'phase3-test-results.json'),
  JSON.stringify(testResults, null, 2)
);

process.exit(finalScore === 100 ? 0 : 1);