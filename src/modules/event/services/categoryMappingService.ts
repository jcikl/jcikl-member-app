/**
 * Category Mapping Service
 * 类别映射服务(方案4：自动匹配 + 人工确认)
 */

import { globalSystemService } from '@/config/globalSystemSettings';

// 关键词映射规则
const CATEGORY_MAPPING = {
  // 收入类别关键词
  income: {
    ticket: ['报名', '票务', '参加费', '注册', '入场', 'registration', 'ticket', 'entry'],
    sponsorship: ['赞助', 'sponsor', '捐助', '资助'],
    donation: ['捐款', '捐献', '善款', 'donation', 'gift'],
    'other-income': ['其他收入', 'misc', 'other'],
  },
  // 支出类别关键词
  expense: {
    venue: ['场地', '租金', '会议室', '场馆', 'venue', 'rental', 'hall', 'room'],
    food: ['餐饮', '午餐', '茶点', '饮料', '晚餐', 'food', 'catering', 'lunch', 'dinner', 'snack'],
    marketing: ['宣传', '广告', '海报', '推广', '市场', 'marketing', 'promotion', 'banner', 'ad'],
    equipment: ['设备', '租赁', '音响', '投影', '器材', 'equipment', 'projector', 'audio', 'rental'],
    materials: ['物料', '印刷', '讲义', '材料', '证书', 'materials', 'printing', 'handout', 'certificate'],
    transportation: ['交通', '车费', '油费', '停车', 'transport', 'petrol', 'parking', 'travel'],
    'other-expense': ['其他支出', 'misc', 'other'],
  },
};

export interface CategoryMatchResult {
  category: string | null;
  confidence: number;
  matchedKeyword: string | null;
  suggestionReason?: string;
}

/**
 * 自动匹配类别(关键词匹配)
 */
export const autoMatchCategory = (
  description: string,
  type: 'income' | 'expense'
): CategoryMatchResult => {
  const lowerDesc = description.toLowerCase();
  const categories = CATEGORY_MAPPING[type];
  
  let bestMatch: { category: string; confidence: number; keyword: string } | null = null;
  
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        // 计算置信度：关键词长度占描述长度的比例
        const confidence = Math.min((keyword.length / description.length) * 2, 1);
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { category, confidence, keyword };
        }
      }
    }
  }
  
  if (bestMatch) {
    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      matchedKeyword: bestMatch.keyword,
      suggestionReason: `匹配到关键词: "${bestMatch.keyword}"`,
    };
  }
  
  return {
    category: null,
    confidence: 0,
    matchedKeyword: null,
    suggestionReason: '未找到匹配的关键词',
  };
};

/**
 * 批量自动匹配类别
 */
export const batchAutoMatchCategories = (
  transactions: Array<{ 
    id: string; 
    description: string; 
    transactionType: 'income' | 'expense';
  }>
): Array<{
  id: string;
  description: string;
  transactionType: 'income' | 'expense';
  matchResult: CategoryMatchResult;
  needsReview: boolean;
}> => {
  return transactions.map(txn => {
    const matchResult = autoMatchCategory(txn.description, txn.transactionType);
    
    return {
      ...txn,
      matchResult,
      needsReview: matchResult.confidence < 0.8, // 置信度<80%需要人工审核
    };
  });
};

/**
 * 获取类别建议(给用户审核界面使用)
 */
export const getCategorySuggestions = (
  description: string,
  type: 'income' | 'expense',
  topN: number = 3
): Array<{category: string; confidence: number; reason: string}> => {
  const lowerDesc = description.toLowerCase();
  const categories = CATEGORY_MAPPING[type];
  const suggestions: Array<{category: string; confidence: number; reason: string; keyword: string}> = [];
  
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        const confidence = Math.min((keyword.length / description.length) * 2, 1);
        suggestions.push({
          category,
          confidence,
          keyword,
          reason: `包含关键词: "${keyword}"`,
        });
      }
    }
  }
  
  // 按置信度排序，取前N个
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN)
    .map(({ category, confidence, reason }) => ({ category, confidence, reason }));
};

/**
 * 添加自定义关键词映射(可扩展功能)
 */
export const addCustomKeyword = (
  type: 'income' | 'expense',
  category: string,
  keyword: string
) => {
  const categoryMap = CATEGORY_MAPPING[type] as Record<string, string[]>;
  
  if (categoryMap[category]) {
    if (!categoryMap[category].includes(keyword)) {
      categoryMap[category].push(keyword);
      
      globalSystemService.log('info', 'Custom keyword added', 'categoryMappingService', {
        type,
        category,
        keyword,
      });
    }
  }
};

console.log('✅ Category Mapping Service Loaded');

