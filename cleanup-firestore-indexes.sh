#!/bin/bash

# Firestore Indexes Cleanup Script
# 清理重复的 Firestore 索引

echo "🧹 开始清理 Firestore 索引..."

# 备份当前配置
cp firestore.indexes.json firestore.indexes.backup.$(date +%Y%m%d_%H%M%S).json

# 应用优化配置
cp firestore.indexes.optimized.json firestore.indexes.json

echo "✅ 索引配置已优化"
echo "📋 下一步操作:"
echo "1. 检查优化后的索引配置"
echo "2. 运行: firebase deploy --only firestore:indexes"
echo "3. 验证索引部署成功"
echo "4. 监控查询性能"

echo ""
echo "⚠️  注意: 删除索引前请确保:"
echo "   - 没有查询依赖这些索引"
echo "   - 已测试所有功能正常"
echo "   - 已备份当前配置"
