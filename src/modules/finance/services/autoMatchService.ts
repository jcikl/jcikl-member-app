/**
 * Auto Match Service
 * 交易记录自动分类匹配服务
 * 
 * 匹配逻辑：
 * 1. 活动名称匹配 (60分)
 * 2. 票价匹配 (30分)
 * 3. 日期匹配 (10分)
 * 总分 >= 80: 高置信度
 * 总分 60-79: 中置信度
 * 总分 < 60: 低置信度（不展示）
 */

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import type { Transaction } from '../types';
import type { Event, EventPricing } from '@/modules/event/types';

// ========== 类型定义 ==========

export interface MatchResult {
  eventId: string;
  eventName: string;
  eventDate: string;
  totalScore: number;
  nameScore: number;
  priceScore: number;
  dateScore: number;
  confidence: 'high' | 'medium' | 'low';
  matchedPriceType?: string; // 'member' | 'regular' | 'alumni' | 'earlyBird' | 'member x2' etc.
  matchedPrice?: number;
  explanation: string;
  pricing: EventPricing;
}

export interface AutoMatchPreviewItem {
  transaction: Transaction;
  matches: MatchResult[];
  bestMatch: MatchResult | null;
  canAutoApply: boolean; // 是否可自动应用（高置信度）
}

// ========== 核心匹配函数 ==========

/**
 * 为单个交易寻找匹配的活动
 */
export const findMatchesForTransaction = async (
  transaction: Transaction,
  events?: Event[]
): Promise<MatchResult[]> => {
  try {
    console.log('🔍 [findMatchesForTransaction] Starting match for transaction:', {
      id: transaction.id,
      mainDescription: transaction.mainDescription,
      subDescription: transaction.subDescription,
      amount: transaction.amount,
      transactionDate: transaction.transactionDate,
      transactionType: transaction.transactionType,
    });
    
    // 如果没有提供活动列表，从数据库获取
    if (!events) {
      events = await getAllActiveEvents();
    }
    
    console.log(`🎯 [findMatchesForTransaction] Checking against ${events.length} events`);

    const matches: MatchResult[] = [];
    let debugCount = 0;

    for (const event of events) {
      // 🔍 调试前3个活动的字段
      if (debugCount < 3) {
        console.log(`🎯 [findMatchesForTransaction] Event #${debugCount + 1} fields:`, {
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          startDateType: typeof event.startDate,
          pricing: event.pricing,
        });
      }
      
      // 计算各项得分
      const nameScore = calculateNameScore(transaction, event);
      const priceScore = calculatePriceScore(transaction.amount, event.pricing);
      const dateScore = calculateDateScore(transaction.transactionDate, event.startDate);

      const totalScore = nameScore.score + priceScore.score + dateScore.score;
      
      // 🔍 调试前3个匹配结果
      if (debugCount < 3 || totalScore >= 60) {
        console.log(`📊 [Match #${debugCount + 1}] ${event.name}:`, {
          nameScore: `${nameScore.score}/60 (${nameScore.reason})`,
          priceScore: `${priceScore.score}/30 (${priceScore.type})`,
          dateScore: `${dateScore.score}/10 (${dateScore.reason})`,
          totalScore: `${totalScore}/100`,
          threshold: totalScore >= 60 ? '✅ PASS' : '❌ FAIL',
        });
        debugCount++;
      }

      // 只保留得分 >= 60 的匹配
      if (totalScore >= 60) {
        const confidence = totalScore >= 80 ? 'high' : totalScore >= 60 ? 'medium' : 'low';

        matches.push({
          eventId: event.id,
          eventName: event.name,
          eventDate: event.startDate,
          totalScore,
          nameScore: nameScore.score,
          priceScore: priceScore.score,
          dateScore: dateScore.score,
          confidence,
          matchedPriceType: priceScore.type,
          matchedPrice: priceScore.matchedPrice,
          explanation: generateExplanation(nameScore, priceScore, dateScore),
          pricing: event.pricing,
        });
      }
    }

    console.log(`✅ [findMatchesForTransaction] Found ${matches.length} matches (score ≥ 60)`);
    
    // 按总分排序（降序）
    return matches.sort((a, b) => b.totalScore - a.totalScore);
  } catch (error) {
    console.error('Error finding matches for transaction:', error);
    return [];
  }
};

/**
 * 批量自动匹配未分类的交易
 */
export const autoMatchUncategorizedTransactions = async (): Promise<AutoMatchPreviewItem[]> => {
  try {
    // 1. 获取所有未分类的交易（category 为空或 txAccount 为空）
    const uncategorizedTransactions = await getUncategorizedTransactions();
    console.log(`🔍 Found ${uncategorizedTransactions.length} uncategorized transactions`);

    // 2. 获取所有活动（一次性查询，避免重复）
    const events = await getAllActiveEvents();
    console.log(`🎯 Found ${events.length} active events`);

    // 3. 为每个交易寻找匹配
    const previewItems: AutoMatchPreviewItem[] = [];

    for (const transaction of uncategorizedTransactions) {
      const matches = await findMatchesForTransaction(transaction, events);
      const bestMatch = matches.length > 0 ? matches[0] : null;

      previewItems.push({
        transaction,
        matches,
        bestMatch,
        canAutoApply: bestMatch ? bestMatch.confidence === 'high' : false,
      });
    }

    console.log(`✅ Generated ${previewItems.length} preview items`);
    return previewItems;
  } catch (error) {
    console.error('Error in auto match:', error);
    throw error;
  }
};

// ========== 辅助函数 ==========

/**
 * 获取所有未分类的交易
 */
const getUncategorizedTransactions = async (): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('category', 'in', [null, undefined, ''])
    );

    const snapshot = await getDocs(q);
    const transactions: Transaction[] = [];

    snapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
      } as Transaction);
    });

    return transactions;
  } catch (error) {
    // Firebase 不支持对 undefined 的查询，改用客户端过滤
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      orderBy('transactionDate', 'desc')
    );

    const snapshot = await getDocs(q);
    const transactions: Transaction[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as Transaction;
      if (!data.category || !data.txAccount) {
        transactions.push({
          ...data,
          id: doc.id,
        });
      }
    });

    return transactions;
  }
};

/**
 * 获取所有活动状态的活动
 */
const getAllActiveEvents = async (): Promise<Event[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.EVENTS),
      where('status', '==', 'Published'),
      orderBy('startDate', 'desc')
    );

    const snapshot = await getDocs(q);
    const events: Event[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // 🔍 调试前3个活动的数据结构
      if (events.length < 3) {
        console.log(`🎯 [getAllActiveEvents] Event #${events.length + 1}:`, {
          id: doc.id,
          name: data.name,
          startDate: data.startDate,
          startDateType: typeof data.startDate,
          hasToDate: data.startDate && typeof data.startDate === 'object' && 'toDate' in data.startDate,
          rawData: data.startDate,
        });
      }
      
      events.push({
        id: doc.id,
        ...data,
      } as Event);
    });

    console.log(`✅ [getAllActiveEvents] Loaded ${events.length} active events`);
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};

/**
 * 计算名称匹配得分
 */
const calculateNameScore = (
  transaction: Transaction,
  event: Event
): { score: number; reason: string } => {
  const description = (
    (transaction.mainDescription || '') +
    ' ' +
    (transaction.subDescription || '')
  )
    .toLowerCase()
    .trim();

  const eventName = event.name.toLowerCase().trim();

  // 1. 完全匹配 (60分)
  if (description.includes(eventName) || eventName.includes(description)) {
    return { score: 60, reason: '完全匹配' };
  }

  // 2. 缩写匹配 (55分)
  const acronym = event.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toLowerCase();

  if (acronym.length >= 2 && description.includes(acronym)) {
    return { score: 55, reason: `缩写匹配 "${acronym.toUpperCase()}"` };
  }

  // 3. 模糊匹配 - 移除空格和特殊字符 (45分)
  const cleanDesc = description.replace(/[-\s*]/g, '');
  const cleanName = eventName.replace(/[-\s*]/g, '');

  if (cleanDesc.includes(cleanName) || cleanName.includes(cleanDesc)) {
    return { score: 45, reason: '模糊匹配（忽略空格）' };
  }

  // 4. 关键词匹配 (20-40分)
  const keywords = eventName.split(' ').filter((w) => w.length > 3);
  const matchedKeywords = keywords.filter((keyword) =>
    description.includes(keyword.toLowerCase())
  );

  if (matchedKeywords.length > 0) {
    const score = Math.floor((matchedKeywords.length / keywords.length) * 40);
    return {
      score,
      reason: `关键词匹配 ${matchedKeywords.length}/${keywords.length}`,
    };
  }

  return { score: 0, reason: '无名称匹配' };
};

/**
 * 计算票价匹配得分
 */
const calculatePriceScore = (
  amount: number,
  pricing: EventPricing
): { score: number; type: string; matchedPrice?: number } => {
  const prices = {
    member: pricing.memberPrice,
    regular: pricing.regularPrice,
    alumni: pricing.alumniPrice,
    earlyBird: pricing.earlyBirdPrice,
    committee: pricing.committeePrice,
  };

  // 1. 精确匹配 (30分)
  for (const [type, price] of Object.entries(prices)) {
    if (amount === price) {
      return { score: 30, type: `${type}价`, matchedPrice: price };
    }
  }

  // 2. 倍数匹配 - 多张票 (25分)
  for (const [type, price] of Object.entries(prices)) {
    if (price === 0) continue; // 跳过免费票

    for (let i = 2; i <= 5; i++) {
      if (amount === price * i) {
        return { score: 25, type: `${type}价 x${i}`, matchedPrice: price };
      }
    }
  }

  // 3. 范围匹配 (15分)
  const validPrices = Object.values(prices).filter((p) => p > 0);
  if (validPrices.length > 0) {
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    if (amount >= minPrice && amount <= maxPrice) {
      return { score: 15, type: '范围内', matchedPrice: undefined };
    }
  }

  return { score: 0, type: '无匹配', matchedPrice: undefined };
};

/**
 * 计算日期匹配得分
 */
const calculateDateScore = (
  transactionDate: string,
  eventDate: string
): { score: number; reason: string } => {
  console.log('📅 [calculateDateScore] Input:', {
    transactionDate,
    eventDate,
    txDateType: typeof transactionDate,
    evtDateType: typeof eventDate,
  });

  // 处理可能的 Firestore Timestamp 对象
  let txDateStr = transactionDate;
  let evtDateStr = eventDate;

  // 如果是 Firestore Timestamp 对象，转换为字符串
  // 方法1: 有 toDate() 方法的 Timestamp 对象
  if (transactionDate && typeof transactionDate === 'object' && 'toDate' in transactionDate && typeof (transactionDate as any).toDate === 'function') {
    txDateStr = (transactionDate as any).toDate().toISOString();
    console.log('🔄 [Method 1] Converted transaction timestamp to string:', txDateStr);
  }
  // 方法2: 有 seconds 和 nanoseconds 字段的原始 Firestore Timestamp
  else if (transactionDate && typeof transactionDate === 'object' && 'seconds' in transactionDate && 'nanoseconds' in transactionDate) {
    const milliseconds = (transactionDate as any).seconds * 1000 + (transactionDate as any).nanoseconds / 1000000;
    txDateStr = new Date(milliseconds).toISOString();
    console.log('🔄 [Method 2] Converted transaction timestamp to string:', txDateStr);
  }

  if (eventDate && typeof eventDate === 'object' && 'toDate' in eventDate && typeof (eventDate as any).toDate === 'function') {
    evtDateStr = (eventDate as any).toDate().toISOString();
    console.log('🔄 [Method 1] Converted event timestamp to string:', evtDateStr);
  }
  // 方法2: 有 seconds 和 nanoseconds 字段的原始 Firestore Timestamp
  else if (eventDate && typeof eventDate === 'object' && 'seconds' in eventDate && 'nanoseconds' in eventDate) {
    const milliseconds = (eventDate as any).seconds * 1000 + (eventDate as any).nanoseconds / 1000000;
    evtDateStr = new Date(milliseconds).toISOString();
    console.log('🔄 [Method 2] Converted event timestamp to string:', evtDateStr);
  }

  const txDate = new Date(txDateStr);
  const evtDate = new Date(evtDateStr);

  // 验证日期是否有效
  const txDateValid = !isNaN(txDate.getTime());
  const evtDateValid = !isNaN(evtDate.getTime());

  console.log('📅 [calculateDateScore] Parsed dates:', {
    txDate: txDateValid ? txDate.toISOString() : 'INVALID',
    evtDate: evtDateValid ? evtDate.toISOString() : 'INVALID',
    txDateValid,
    evtDateValid,
  });

  if (!txDateValid || !evtDateValid) {
    console.error('❌ [calculateDateScore] Invalid date(s):', {
      transactionDate: txDateStr,
      eventDate: evtDateStr,
      txDateValid,
      evtDateValid,
    });
    return { score: 0, reason: '日期无效' };
  }

  const daysDiff = Math.abs(
    Math.floor((evtDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  console.log('📊 [calculateDateScore] Days difference:', daysDiff);

  if (daysDiff === 0) {
    return { score: 10, reason: '活动当天' };
  }

  if (daysDiff <= 7) {
    return { score: 8, reason: `活动前后${daysDiff}天` };
  }

  if (daysDiff <= 30) {
    return { score: 5, reason: `活动前后${daysDiff}天` };
  }

  return { score: 0, reason: `相差${daysDiff}天，超出范围` };
};

/**
 * 生成匹配说明
 */
const generateExplanation = (
  nameResult: { score: number; reason: string },
  priceResult: { score: number; type: string },
  dateResult: { score: number; reason: string }
): string => {
  const parts: string[] = [];

  if (nameResult.score > 0) {
    parts.push(`名称: ${nameResult.reason}`);
  }

  if (priceResult.score > 0) {
    parts.push(`票价: ${priceResult.type}`);
  }

  if (dateResult.score > 0) {
    parts.push(`日期: ${dateResult.reason}`);
  }

  return parts.join('; ');
};

/**
 * 生成匹配统计
 */
export const generateMatchStatistics = (
  previewItems: AutoMatchPreviewItem[]
): {
  total: number;
  hasMatch: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  noMatch: number;
} => {
  const stats = {
    total: previewItems.length,
    hasMatch: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    noMatch: 0,
  };

  for (const item of previewItems) {
    if (item.bestMatch) {
      stats.hasMatch++;

      if (item.bestMatch.confidence === 'high') {
        stats.highConfidence++;
      } else if (item.bestMatch.confidence === 'medium') {
        stats.mediumConfidence++;
      } else {
        stats.lowConfidence++;
      }
    } else {
      stats.noMatch++;
    }
  }

  return stats;
};

console.log('✅ Auto Match Service Loaded');

