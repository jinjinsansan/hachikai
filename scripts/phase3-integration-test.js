#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(50));
console.log('🔧 Phase 3 Integration Test');
console.log('='.repeat(50) + '\n');

const integrationTests = {
  crossFileImports: { passed: 0, failed: 0, tests: [] },
  typeCompatibility: { passed: 0, failed: 0, tests: [] },
  functionUsage: { passed: 0, failed: 0, tests: [] },
  dependencies: { passed: 0, failed: 0, tests: [] }
};

// Test 1: Cross-file imports between Phase 3 and existing code
console.log('🔗 Testing Cross-file Integration...\n');

const checkImports = [
  {
    file: 'src/utils/AmazonAPI.ts',
    shouldImport: ['../types/amazon'],
    description: 'AmazonAPI imports types correctly'
  },
  {
    file: 'src/utils/UserNetwork.ts',
    shouldImport: ['../types', '../types/amazon', './UserManager'],
    description: 'UserNetwork integrates with existing UserManager'
  },
  {
    file: 'src/utils/NotificationManager.ts',
    shouldImport: ['../types'],
    description: 'NotificationManager uses User type'
  },
  {
    file: 'src/screens/PurchaseConfirmation.tsx',
    shouldImport: ['../types/amazon', '../utils/UserManager', '../utils/ImageProcessor'],
    description: 'PurchaseConfirmation integrates utilities'
  }
];

checkImports.forEach(check => {
  const filePath = path.join(__dirname, '..', check.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    let allFound = true;

    check.shouldImport.forEach(importPath => {
      const regex = new RegExp(`from\\s+['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
      if (!regex.test(content)) {
        console.log(`❌ ${check.file} missing import: ${importPath}`);
        allFound = false;
      }
    });

    if (allFound) {
      console.log(`✅ ${check.description}`);
      integrationTests.crossFileImports.passed++;
    } else {
      integrationTests.crossFileImports.failed++;
    }
    integrationTests.crossFileImports.tests.push({
      file: check.file,
      status: allFound ? 'passed' : 'failed'
    });
  }
});

// Test 2: Type compatibility
console.log('\n📊 Testing Type Compatibility...\n');

const typeChecks = [
  {
    description: 'PurchaseRecord uses ProductInfo correctly',
    file: 'src/types/amazon.ts',
    pattern: /interface\s+PurchaseRecord\s*{[^}]*productInfo:\s*ProductInfo/s
  },
  {
    description: 'PublicUser interface properly structured',
    file: 'src/types/amazon.ts',
    pattern: /interface\s+PublicUser\s*{[^}]*wishlistItems\?:\s*WishlistItem\[\]/s
  },
  {
    description: 'NotificationSettings properly typed',
    file: 'src/utils/NotificationManager.ts',
    pattern: /interface\s+NotificationSettings\s*{[^}]*enabled:\s*boolean/s
  }
];

typeChecks.forEach(check => {
  const filePath = path.join(__dirname, '..', check.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.description}`);
      integrationTests.typeCompatibility.passed++;
      integrationTests.typeCompatibility.tests.push({
        description: check.description,
        status: 'passed'
      });
    } else {
      console.log(`❌ ${check.description}`);
      integrationTests.typeCompatibility.failed++;
      integrationTests.typeCompatibility.tests.push({
        description: check.description,
        status: 'failed'
      });
    }
  }
});

// Test 3: Function usage patterns
console.log('\n🔧 Testing Function Integration...\n');

const functionChecks = [
  {
    description: 'UserManager integration in PurchaseConfirmation',
    file: 'src/screens/PurchaseConfirmation.tsx',
    pattern: /UserManager\.incrementProgress/
  },
  {
    description: 'AsyncStorage usage in NotificationManager',
    file: 'src/utils/NotificationManager.ts',
    pattern: /AsyncStorage\.(getItem|setItem|removeItem)/
  },
  {
    description: 'FLOOR_RULES usage in UserNetwork',
    file: 'src/utils/UserNetwork.ts',
    pattern: /FLOOR_RULES\[.*\]/
  }
];

functionChecks.forEach(check => {
  const filePath = path.join(__dirname, '..', check.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.description}`);
      integrationTests.functionUsage.passed++;
      integrationTests.functionUsage.tests.push({
        description: check.description,
        status: 'passed'
      });
    } else {
      console.log(`❌ ${check.description}`);
      integrationTests.functionUsage.failed++;
      integrationTests.functionUsage.tests.push({
        description: check.description,
        status: 'failed'
      });
    }
  }
});

// Test 4: Package dependencies
console.log('\n📦 Testing Package Dependencies...\n');

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const requiredDeps = [
  '@react-native-async-storage/async-storage',
  'crypto-js',
  'react-native-safe-area-context',
  'react-native-vector-icons'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} is installed`);
    integrationTests.dependencies.passed++;
    integrationTests.dependencies.tests.push({
      dependency: dep,
      status: 'passed'
    });
  } else {
    console.log(`❌ ${dep} is missing`);
    integrationTests.dependencies.failed++;
    integrationTests.dependencies.tests.push({
      dependency: dep,
      status: 'failed'
    });
  }
});

// Calculate integration test score
console.log('\n' + '='.repeat(50));
console.log('📊 Integration Test Results Summary');
console.log('='.repeat(50) + '\n');

let totalPassed = 0;
let totalFailed = 0;

for (const category in integrationTests) {
  const result = integrationTests[category];
  totalPassed += result.passed;
  totalFailed += result.failed;

  const categoryScore = result.failed === 0 ? '✅' : '❌';
  console.log(`${categoryScore} ${category}: ${result.passed}/${result.passed + result.failed} passed`);
}

const totalTests = totalPassed + totalFailed;
const finalScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

console.log('\n' + '='.repeat(50));
console.log(`🎯 Integration Score: ${finalScore}/100`);
console.log('='.repeat(50) + '\n');

if (finalScore === 100) {
  console.log('🎉 Perfect integration! Phase 3 fully integrated with existing code!');
} else {
  console.log(`⚠️  ${totalFailed} integration issues found`);
}

// Save results
fs.writeFileSync(
  path.join(__dirname, 'phase3-integration-results.json'),
  JSON.stringify(integrationTests, null, 2)
);

process.exit(finalScore === 100 ? 0 : 1);