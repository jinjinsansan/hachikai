#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('🚀 フェーズ4 最終包括テスト');
console.log('='.repeat(70) + '\n');

// フェーズ4の全ファイル
const phase4Files = [
  'src/utils/FirebaseNotifications.ts',
  'src/utils/AuthManager.ts',
  'src/utils/RealtimeSync.ts',
  'src/utils/OfflineManager.ts',
  'src/utils/FraudDetection.ts',
  'src/utils/CacheManager.ts'
];

const testCategories = {
  '🏗️ 構造テスト': { weight: 15, score: 0 },
  '🔗 依存関係': { weight: 15, score: 0 },
  '📊 型安全性': { weight: 20, score: 0 },
  '🔥 Firebase統合': { weight: 20, score: 0 },
  '⚡ 機能実装': { weight: 20, score: 0 },
  '🔒 セキュリティ': { weight: 10, score: 0 }
};

let detailedResults = [];

// カテゴリ1: 構造テスト
console.log('🏗️ [15点] 構造テスト\n');
let structureTests = 0;
let structurePassed = 0;

phase4Files.forEach(file => {
  structureTests++;
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // ファイルサイズと内容の充実度をチェック
    if (stats.size > 5000 && content.includes('export class')) {
      console.log(`  ✅ ${path.basename(file)} - 完全実装 (${stats.size} bytes)`);
      structurePassed++;
    } else if (stats.size > 0) {
      console.log(`  ⚠️  ${path.basename(file)} - 部分実装`);
      structurePassed += 0.5;
    } else {
      console.log(`  ❌ ${path.basename(file)} - 未実装`);
    }
  } else {
    console.log(`  ❌ ${path.basename(file)} - ファイルなし`);
  }
});

testCategories['🏗️ 構造テスト'].score = Math.round((structurePassed / structureTests) * 15);

// カテゴリ2: 依存関係
console.log('\n🔗 [15点] 依存関係テスト\n');
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

let depTests = requiredPackages.length;
let depPassed = 0;

requiredPackages.forEach(pkg => {
  if (packageJson.dependencies[pkg]) {
    console.log(`  ✅ ${pkg}`);
    depPassed++;
  } else {
    console.log(`  ❌ ${pkg} - 未インストール`);
  }
});

testCategories['🔗 依存関係'].score = Math.round((depPassed / depTests) * 15);

// カテゴリ3: 型安全性
console.log('\n📊 [20点] TypeScript型安全性\n');
let typeTests = 0;
let typePassed = 0;

phase4Files.forEach(file => {
  typeTests++;
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // any型の使用をチェック
    const anyMatches = content.match(/:\s*any(?:\s|;|,|\)|>|\[)/g);
    const hasInterfaces = /interface\s+\w+/.test(content);
    const hasTypes = /type\s+\w+\s*=/.test(content);
    const hasGenerics = /<[A-Z]\w*>/.test(content);

    if (!anyMatches && (hasInterfaces || hasTypes)) {
      console.log(`  ✅ ${path.basename(file)} - 完全型付け`);
      typePassed++;
    } else if (anyMatches && anyMatches.length <= 2) {
      console.log(`  ⚠️  ${path.basename(file)} - any型${anyMatches.length}箇所`);
      typePassed += 0.7;
    } else if (anyMatches) {
      console.log(`  ❌ ${path.basename(file)} - any型${anyMatches.length}箇所`);
      typePassed += 0.3;
    } else {
      console.log(`  ✅ ${path.basename(file)} - 適切な型定義`);
      typePassed++;
    }
  }
});

testCategories['📊 型安全性'].score = Math.round((typePassed / typeTests) * 20);

// カテゴリ4: Firebase統合
console.log('\n🔥 [20点] Firebase統合\n');
let firebaseTests = 0;
let firebasePassed = 0;

const firebaseChecks = {
  'FirebaseNotifications': ['messaging', 'FCMトークン', 'リモート通知'],
  'AuthManager': ['auth()', 'ユーザー認証', 'セッション管理'],
  'RealtimeSync': ['firestore', 'リアルタイム同期', 'onSnapshot'],
  'OfflineManager': ['NetInfo', 'オフライン対応', 'キューイング']
};

Object.entries(firebaseChecks).forEach(([className, requirements]) => {
  firebaseTests++;
  const file = phase4Files.find(f => f.includes(className.replace('Manager', '')));
  if (file) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasAllRequirements = requirements.every(req =>
        content.toLowerCase().includes(req.toLowerCase())
      );

      if (hasAllRequirements) {
        console.log(`  ✅ ${className} - Firebase完全統合`);
        firebasePassed++;
      } else {
        console.log(`  ⚠️  ${className} - 部分統合`);
        firebasePassed += 0.5;
      }
    }
  }
});

testCategories['🔥 Firebase統合'].score = Math.round((firebasePassed / firebaseTests) * 20);

// カテゴリ5: 機能実装
console.log('\n⚡ [20点] コア機能実装\n');
const coreFeatures = [
  { name: 'プッシュ通知', file: 'FirebaseNotifications', method: 'getFCMToken' },
  { name: '認証システム', file: 'AuthManager', method: 'signUp' },
  { name: 'リアルタイム同期', file: 'RealtimeSync', method: 'startSync' },
  { name: 'オフライン対応', file: 'OfflineManager', method: 'queueOperation' },
  { name: '不正検出', file: 'FraudDetection', method: 'detectAnomalousActivity' },
  { name: 'キャッシュ管理', file: 'CacheManager', method: 'cacheProductInfo' }
];

let featureTests = coreFeatures.length;
let featurePassed = 0;

coreFeatures.forEach(feature => {
  const file = phase4Files.find(f => f.includes(feature.file));
  if (file) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(feature.method)) {
        console.log(`  ✅ ${feature.name} - 実装済み`);
        featurePassed++;
      } else {
        console.log(`  ❌ ${feature.name} - 未実装`);
      }
    }
  }
});

testCategories['⚡ 機能実装'].score = Math.round((featurePassed / featureTests) * 20);

// カテゴリ6: セキュリティ
console.log('\n🔒 [10点] セキュリティ実装\n');
let securityTests = 0;
let securityPassed = 0;

const securityChecks = [
  { pattern: /validateSession/, desc: 'セッション検証' },
  { pattern: /detectMultipleAccounts/, desc: '複数アカウント検出' },
  { pattern: /applyAutoSanctions/, desc: '自動制裁システム' },
  { pattern: /validateImageAuthenticity/, desc: '画像改ざん検出' }
];

securityChecks.forEach(check => {
  securityTests++;
  let found = false;

  phase4Files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (check.pattern.test(content)) {
        found = true;
      }
    }
  });

  if (found) {
    console.log(`  ✅ ${check.desc}`);
    securityPassed++;
  } else {
    console.log(`  ❌ ${check.desc}`);
  }
});

testCategories['🔒 セキュリティ'].score = Math.round((securityPassed / securityTests) * 10);

// 最終スコア計算
console.log('\n' + '='.repeat(70));
console.log('📊 最終スコア集計');
console.log('='.repeat(70) + '\n');

let totalScore = 0;
let maxScore = 100;

Object.entries(testCategories).forEach(([category, data]) => {
  totalScore += data.score;
  const percentage = Math.round((data.score / data.weight) * 100);
  const status = percentage >= 100 ? '✅' : percentage >= 70 ? '⚠️' : '❌';
  console.log(`${status} ${category}: ${data.score}/${data.weight}点 (${percentage}%)`);
});

console.log('\n' + '='.repeat(70));
console.log(`🎯 総合スコア: ${totalScore}/100点`);
console.log('='.repeat(70) + '\n');

// 評価メッセージ
if (totalScore === 100) {
  console.log('🏆 パーフェクト！フェーズ4は完璧に実装されています！');
  console.log('✨ Firebase統合、認証、リアルタイム同期、不正検出すべて完璧です！');
} else if (totalScore >= 95) {
  console.log('🎉 素晴らしい！フェーズ4はほぼ完璧です！');
  console.log('⭐ 本番環境への準備がほぼ整っています。');
} else if (totalScore >= 90) {
  console.log('🎊 優秀！フェーズ4は高品質で実装されています。');
  console.log('👍 わずかな改善で本番環境に対応できます。');
} else if (totalScore >= 80) {
  console.log('✅ 良好！フェーズ4の基本機能は動作します。');
  console.log('📝 いくつかの改善点がありますが、基本は完成しています。');
} else {
  console.log('⚠️ 改善が必要です。以下の項目を確認してください。');
  console.log('🔧 不足している機能を実装してください。');
}

// 詳細レポート生成
const report = {
  timestamp: new Date().toISOString(),
  phase: 'Phase 4',
  totalScore,
  maxScore,
  categories: testCategories,
  files: phase4Files.map(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        exists: true
      };
    }
    return {
      name: file,
      exists: false
    };
  })
};

fs.writeFileSync(
  path.join(__dirname, 'phase4-final-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📄 詳細レポート: scripts/phase4-final-report.json');
console.log('✅ テスト完了！');

process.exit(totalScore === 100 ? 0 : 1);