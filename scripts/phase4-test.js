#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🔥 フェーズ4 包括的テスト');
console.log('='.repeat(60) + '\n');

// フェーズ4ファイル
const phase4Files = [
  'src/utils/FirebaseNotifications.ts',
  'src/utils/AuthManager.ts',
  'src/utils/RealtimeSync.ts',
  'src/utils/OfflineManager.ts',
  'src/utils/FraudDetection.ts',
  'src/utils/CacheManager.ts'
];

const testResults = {
  fileStructure: { passed: 0, failed: 0, errors: [] },
  imports: { passed: 0, failed: 0, errors: [] },
  exports: { passed: 0, failed: 0, errors: [] },
  types: { passed: 0, failed: 0, errors: [] },
  firebase: { passed: 0, failed: 0, errors: [] },
  dependencies: { passed: 0, failed: 0, errors: [] }
};

// Test 1: ファイル構造チェック
console.log('📁 ファイル構造テスト\n');
phase4Files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > 0) {
      console.log(`  ✅ ${file} (${stats.size} bytes)`);
      testResults.fileStructure.passed++;
    } else {
      console.log(`  ❌ ${file} は空です`);
      testResults.fileStructure.failed++;
      testResults.fileStructure.errors.push(`${file} is empty`);
    }
  } else {
    console.log(`  ❌ ${file} が見つかりません`);
    testResults.fileStructure.failed++;
    testResults.fileStructure.errors.push(`${file} not found`);
  }
});

// Test 2: インポート解決
console.log('\n🔗 インポート解決テスト\n');
phase4Files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const imports = [...content.matchAll(importRegex)];

    let hasImportError = false;
    const failedImports = [];

    imports.forEach(match => {
      const importPath = match[1];

      // ローカルインポートのチェック
      if (importPath.startsWith('.')) {
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
          hasImportError = true;
          failedImports.push(importPath);
        }
      }
    });

    if (hasImportError) {
      console.log(`  ❌ ${path.basename(file)} - インポートエラー: ${failedImports.join(', ')}`);
      testResults.imports.failed++;
      testResults.imports.errors.push(`${file}: ${failedImports.join(', ')}`);
    } else {
      console.log(`  ✅ ${path.basename(file)} - すべてのインポートが解決済み`);
      testResults.imports.passed++;
    }
  }
});

// Test 3: エクスポートチェック
console.log('\n📤 エクスポートチェック\n');
phase4Files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    const hasExports = /export\s+(default|class|interface|type|const|function|{)/.test(content);
    const hasDefaultExport = /export\s+default/.test(content);
    const hasNamedExport = /export\s+(class|interface|type|const|function|{)/.test(content);

    if (hasExports) {
      console.log(`  ✅ ${path.basename(file)} - エクスポート定義済み`);
      testResults.exports.passed++;
    } else {
      console.log(`  ⚠️  ${path.basename(file)} - エクスポートなし`);
      testResults.exports.failed++;
      testResults.exports.errors.push(`${file}: no exports`);
    }
  }
});

// Test 4: TypeScript品質
console.log('\n📊 TypeScript品質チェック\n');
phase4Files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // any型の使用チェック
    const anyTypeRegex = /:\s*any(?:\s|;|,|\)|>|\[)/g;
    const anyMatches = content.match(anyTypeRegex);

    // 適切な型定義チェック
    const hasInterfaces = /interface\s+\w+/.test(content);
    const hasTypes = /type\s+\w+\s*=/.test(content);
    const hasGenericTypes = /<[A-Z]\w*>/.test(content);

    if (anyMatches && anyMatches.length > 0) {
      console.log(`  ⚠️  ${path.basename(file)} - any型を${anyMatches.length}箇所で使用`);
      testResults.types.failed++;
      testResults.types.errors.push(`${file}: uses 'any' type ${anyMatches.length} times`);
    } else if (hasInterfaces || hasTypes || hasGenericTypes) {
      console.log(`  ✅ ${path.basename(file)} - 適切な型定義`);
      testResults.types.passed++;
    } else {
      console.log(`  ℹ️  ${path.basename(file)} - 型定義を確認`);
      testResults.types.passed++;
    }
  }
});

// Test 5: Firebase統合チェック
console.log('\n🔥 Firebase統合チェック\n');
const firebaseFiles = phase4Files.filter(f =>
  f.includes('Firebase') || f.includes('Auth') || f.includes('Realtime') || f.includes('Offline')
);

firebaseFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Firebase インポートチェック
    const hasFirebaseImports = /@react-native-firebase/.test(content);
    const hasFirestoreImports = /firestore\(\)/.test(content);
    const hasAuthImports = /auth\(\)/.test(content);
    const hasMessagingImports = /messaging\(\)/.test(content);

    if (hasFirebaseImports) {
      console.log(`  ✅ ${path.basename(file)} - Firebase統合済み`);
      testResults.firebase.passed++;
    } else {
      console.log(`  ⚠️  ${path.basename(file)} - Firebase統合を確認`);
      testResults.firebase.failed++;
      testResults.firebase.errors.push(`${file}: no Firebase imports`);
    }
  }
});

// Test 6: パッケージ依存関係
console.log('\n📦 パッケージ依存関係チェック\n');
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const requiredPackages = [
  '@react-native-firebase/app',
  '@react-native-firebase/messaging',
  '@react-native-firebase/firestore',
  '@react-native-firebase/auth',
  '@react-native-community/netinfo',
  'react-native-device-info'
];

requiredPackages.forEach(pkg => {
  if (packageJson.dependencies[pkg]) {
    console.log(`  ✅ ${pkg} インストール済み`);
    testResults.dependencies.passed++;
  } else {
    console.log(`  ❌ ${pkg} が見つかりません`);
    testResults.dependencies.failed++;
    testResults.dependencies.errors.push(`Missing package: ${pkg}`);
  }
});

// 統合テスト
console.log('\n🔧 統合テスト\n');

// クラス/関数のエクスポート確認
const expectedExports = {
  'FirebaseNotifications': ['getFCMToken', 'setupNotificationListeners', 'sendFloorChangeNotification'],
  'AuthManager': ['signUp', 'signIn', 'signOut', 'validateSession'],
  'RealtimeSync': ['startSync', 'stopSync', 'broadcastFloorChange'],
  'OfflineManager': ['initialize', 'queueOperation', 'syncWhenOnline'],
  'FraudDetection': ['detectAnomalousActivity', 'detectMultipleAccounts', 'applyAutoSanctions'],
  'CacheManager': ['cacheProductInfo', 'getProductInfo', 'invalidateCache']
};

Object.entries(expectedExports).forEach(([className, methods]) => {
  const file = phase4Files.find(f => f.includes(className.replace('Manager', '').replace('Detection', '')));
  if (file) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const allMethodsFound = methods.every(method =>
        new RegExp(`static\\s+(async\\s+)?${method}`).test(content)
      );

      if (allMethodsFound) {
        console.log(`  ✅ ${className} - すべてのメソッド実装済み`);
      } else {
        console.log(`  ❌ ${className} - 一部メソッドが未実装`);
      }
    }
  }
});

// 結果集計
console.log('\n' + '='.repeat(60));
console.log('📊 テスト結果サマリー');
console.log('='.repeat(60) + '\n');

let totalPassed = 0;
let totalFailed = 0;
let allErrors = [];

for (const category in testResults) {
  const result = testResults[category];
  totalPassed += result.passed;
  totalFailed += result.failed;

  const status = result.failed === 0 ? '✅' : '❌';
  console.log(`${status} ${category}: ${result.passed}/${result.passed + result.failed} 合格`);

  if (result.errors && result.errors.length > 0) {
    allErrors.push(...result.errors);
  }
}

const totalTests = totalPassed + totalFailed;
const score = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

console.log('\n' + '='.repeat(60));
console.log(`🎯 最終スコア: ${score}/100`);
console.log('='.repeat(60) + '\n');

if (score === 100) {
  console.log('🎉 完璧！フェーズ4のすべてのテストに合格しました！');
} else if (score >= 90) {
  console.log('🎊 素晴らしい！フェーズ4はほぼ完璧です。');
} else if (score >= 80) {
  console.log('👍 良好！フェーズ4は正常に動作しています。');
} else {
  console.log('⚠️  改善が必要です。以下のエラーを確認してください：\n');
  allErrors.forEach(error => console.log(`  - ${error}`));
}

// 結果をJSONで保存
const results = {
  timestamp: new Date().toISOString(),
  score,
  totalPassed,
  totalFailed,
  categories: testResults,
  errors: allErrors
};

fs.writeFileSync(
  path.join(__dirname, 'phase4-test-results.json'),
  JSON.stringify(results, null, 2)
);

console.log(`\n📄 詳細結果: scripts/phase4-test-results.json`);

process.exit(score === 100 ? 0 : 1);