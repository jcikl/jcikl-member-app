/**
 * Auto Match Service
 * 交易记录自动分类匹配服务
 * 
 * 匹配逻辑（权重调整为实际业务场景）：
 * 1. 日期匹配 (40分) - 最重要，交易通常发生在活动当天或前后
 * 2. 票价匹配 (40分) - 次重要，金额是最可靠的匹配依据
 * 3. 活动名称匹配 (20分) - 参考项，银行描述不一定包含活动名称
 * 
 * 总分 >= 80: 高置信度（可自动应用）
 * 总分 60-79: 中置信度（需人工确认）
 * 总分 < 60: 低置信度（显示分析结果，建议手动分类）
 */

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import type { Transaction } from '../types';
import type { Event, EventPricing } from '@/modules/event/types';
import type { Member } from '@/modules/member/types';

// ========== 类型定义 ==========

export interface MatchResult {
  eventId: string;
  eventName: string;
  eventDate: string;
  totalScore: number;
  nameScore: number;
  priceScore: number;
  dateScore: number;
  daysDifference: number; // 交易日期与活动日期的实际天数差异
  confidence: 'high' | 'medium' | 'low';
  matchedPriceType?: string; // 'member' | 'regular' | 'alumni' | 'earlyBird' | 'member x2' etc.
  matchedPrice?: number;
  explanation: string;
  pricing: EventPricing;
  // 会员匹配信息
  matchedMember?: {
    memberId: string;
    memberName: string;
    matchType: 'name' | 'phone' | 'email' | 'memberId'; // 匹配方式
    matchedValue: string; // 匹配到的值
  };
}

export interface AutoMatchPreviewItem {
  transaction: Transaction;
  matches: MatchResult[]; // 分数 >= 60 的匹配
  bestMatch: MatchResult | null; // 最佳自动匹配（分数 >= 60）
  topAttempt: MatchResult | null; // 最高分的尝试（可能 < 60，用于显示分析结果）
  canAutoApply: boolean; // 是否可自动应用（高置信度）
}

// ========== 核心匹配函数 ==========

/**
 * 为单个交易寻找匹配的活动
 * @param includeAllScores - 是否返回所有分数的匹配（包括<60分），用于显示分析结果
 */
export const findMatchesForTransaction = async (
  transaction: Transaction,
  events?: Event[],
  includeAllScores: boolean = false
): Promise<MatchResult[]> => {
  try {
    console.log('🔍 [findMatchesForTransaction] Starting match for transaction:', {
      id: transaction.id,
      mainDescription: transaction.mainDescription,
      subDescription: transaction.subDescription,
      amount: transaction.amount,
      transactionDate: transaction.transactionDate,
      transactionType: transaction.transactionType,
      includeAllScores,
    });
    
    // 如果没有提供活动列表，从数据库获取
    if (!events) {
      events = await getAllActiveEvents();
    }
    
    console.log(`🎯 [findMatchesForTransaction] Checking against ${events.length} events`);

    const allMatches: MatchResult[] = [];
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
          dateScore: `${dateScore.score}/40 (${dateScore.reason})`,
          priceScore: `${priceScore.score}/40 (${priceScore.type})`,
          nameScore: `${nameScore.score}/20 (${nameScore.reason})`,
          totalScore: `${totalScore}/100`,
          threshold: totalScore >= 60 ? '✅ PASS' : '❌ FAIL',
        });
        debugCount++;
      }

      // 根据 includeAllScores 决定是否保留所有匹配
      const shouldInclude = includeAllScores || totalScore >= 60;
      
      if (shouldInclude) {
        const confidence = totalScore >= 80 ? 'high' : totalScore >= 60 ? 'medium' : 'low';

        // 转换 eventDate 为 ISO 字符串（处理 Firestore Timestamp）
        let eventDateStr = event.startDate;
        if (event.startDate && typeof event.startDate === 'object') {
          // 方法1: 有 toDate() 方法
          if ('toDate' in event.startDate && typeof (event.startDate as any).toDate === 'function') {
            eventDateStr = (event.startDate as any).toDate().toISOString();
          }
          // 方法2: 原始 {seconds, nanoseconds} 格式
          else if ('seconds' in event.startDate && 'nanoseconds' in event.startDate) {
            const milliseconds = (event.startDate as any).seconds * 1000 + (event.startDate as any).nanoseconds / 1000000;
            eventDateStr = new Date(milliseconds).toISOString();
          }
        }

        allMatches.push({
          eventId: event.id,
          eventName: event.name,
          eventDate: eventDateStr,
          totalScore,
          nameScore: nameScore.score,
          priceScore: priceScore.score,
          dateScore: dateScore.score,
          daysDifference: dateScore.daysDifference,
          confidence,
          matchedPriceType: priceScore.type,
          matchedPrice: priceScore.matchedPrice,
          explanation: generateExplanation(nameScore, priceScore, dateScore),
          pricing: event.pricing,
        });
      }
    }

    // 排序逻辑：
    // 1. 如果是 includeAllScores，且最高分 < 60，优先按日期接近度排序
    // 2. 但排除日期相差过远的匹配（> 90天）
    // 3. 否则按总分排序
    const sortedMatches = allMatches.sort((a, b) => {
      // 如果包含所有分数，且分数都很低（< 60）
      if (includeAllScores && a.totalScore < 60 && b.totalScore < 60) {
        // 排除日期相差过远的匹配（> 90天）
        const aDateReasonable = a.daysDifference <= 90;
        const bDateReasonable = b.daysDifference <= 90;
        
        // 优先显示日期合理的匹配
        if (aDateReasonable !== bDateReasonable) {
          return aDateReasonable ? -1 : 1; // 日期合理的排在前面
        }
        
        // 如果都合理或都不合理，按实际天数差异排序（天数越少越好）
        if (a.daysDifference !== b.daysDifference) {
          return a.daysDifference - b.daysDifference;
        }
        // 如果天数相同，再按总分排序
        return b.totalScore - a.totalScore;
      }
      // 默认按总分排序
      return b.totalScore - a.totalScore;
    });
    
    // 如果包含所有分数，过滤掉日期不合理的匹配（> 90天）
    if (includeAllScores) {
      const reasonableMatches = sortedMatches.filter(match => match.daysDifference <= 90);
      console.log(`✅ [findMatchesForTransaction] Found ${sortedMatches.length} total matches, ${reasonableMatches.length} with reasonable dates (top score: ${sortedMatches[0]?.totalScore ?? 0}, top date score: ${sortedMatches[0]?.dateScore ?? 0})`);
      
      // 如果有日期合理的匹配，返回这些匹配；否则返回空数组（表示无合理匹配）
      return reasonableMatches.length > 0 ? reasonableMatches : [];
    } else {
      console.log(`✅ [findMatchesForTransaction] Found ${sortedMatches.length} matches (score ≥ 60)`);
    }
    
    return sortedMatches;
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
    console.log(`🎯 Found ${events.length} events (all statuses)`);

    // 3. 获取所有会员（一次性查询，避免重复）
    const members = await getAllActiveMembers();
    console.log(`👥 Found ${members.length} members (all statuses)`);

    // 4. 为每个交易寻找匹配
    const previewItems: AutoMatchPreviewItem[] = [];

    for (const transaction of uncategorizedTransactions) {
      // 先尝试找分数 >= 60 的匹配
      const matches = await findMatchesForTransaction(transaction, events, false);
      const bestMatch = matches.length > 0 ? matches[0] : null;

      // 如果没有找到自动匹配，获取所有分数的匹配来显示分析结果
      let topAttempt: MatchResult | null = null;
      if (!bestMatch) {
        const allMatches = await findMatchesForTransaction(transaction, events, true);
        topAttempt = allMatches.length > 0 ? allMatches[0] : null;
      }

      // 尝试从交易描述中匹配会员
      const matchedMember = matchMemberFromDescription(transaction, members);
      
      // 将匹配的会员信息添加到结果中
      if (matchedMember) {
        if (bestMatch) {
          bestMatch.matchedMember = matchedMember;
        }
        if (topAttempt) {
          topAttempt.matchedMember = matchedMember;
        }
        // 也更新 matches 数组中的所有匹配结果
        matches.forEach(match => {
          match.matchedMember = matchedMember;
        });
      }

      previewItems.push({
        transaction,
        matches,
        bestMatch,
        topAttempt,
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
 * 排除：
 * 1. 已有分类的交易
 * 2. 已拆分的主交易（isSplit = true）
 * 3. 虚拟交易（isVirtual = true）
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
      const data = doc.data() as Transaction;
      
      // 排除已拆分的主交易和虚拟交易
      if (!data.isSplit && !data.isVirtual) {
        transactions.push({
          ...data,
          id: doc.id,
        } as Transaction);
      }
    });

    console.log(`📋 [getUncategorizedTransactions] Found ${transactions.length} uncategorized transactions (excluded isSplit and isVirtual)`);
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
      
      // 排除已分类、已拆分的主交易和虚拟交易
      if ((!data.category || !data.txAccount) && !data.isSplit && !data.isVirtual) {
        transactions.push({
          ...data,
          id: doc.id,
        });
      }
    });

    console.log(`📋 [getUncategorizedTransactions] Found ${transactions.length} uncategorized transactions (excluded isSplit and isVirtual)`);
    return transactions;
  }
};

/**
 * 获取所有活动（取消状态限制）
 */
const getAllActiveEvents = async (): Promise<Event[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.EVENTS),
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
          status: data.status,
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

    console.log(`✅ [getAllActiveEvents] Loaded ${events.length} events (all statuses)`);
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};

/**
 * 获取所有会员（取消状态限制）
 */
const getAllActiveMembers = async (): Promise<Member[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBERS),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const members: Member[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // 🔍 调试前3个会员的数据结构
      if (members.length < 3) {
        console.log(`👤 [getAllActiveMembers] Member #${members.length + 1}:`, {
          id: doc.id,
          name: data.name,
          status: data.status,
          email: data.email,
          phone: data.phone,
          memberId: data.memberId,
        });
      }
      
      members.push({
        id: doc.id,
        ...doc.data(),
      } as Member);
    });

    console.log(`👥 [getAllActiveMembers] Loaded ${members.length} members (all statuses)`);
    return members;
  } catch (error) {
    console.error('Error fetching members:', error);
    return [];
  }
};

/**
 * 从交易描述中匹配会员
 * 根据实际 Firestore 字段优化
 */
const matchMemberFromDescription = (
  transaction: Transaction,
  members: Member[]
): MatchResult['matchedMember'] | undefined => {
  const description = (
    (transaction.mainDescription || '') +
    ' ' +
    (transaction.subDescription || '')
  ).toLowerCase();

  console.log(`👤 [matchMember] Checking transaction: ${transaction.mainDescription}`);

  for (const member of members) {
    // 1. 匹配 NRIC/护照号（最可靠，12位数字）
    const nric = member.profile?.nric || (member.profile as any)?.nricOrPassport;
    if (nric && nric.length >= 10 && description.includes(nric.toLowerCase())) {
      console.log(`✅ [matchMember] Matched by NRIC: ${member.name} (${nric})`);
      return {
        memberId: member.id,
        memberName: member.name,
        matchType: 'memberId',
        matchedValue: nric,
      };
    }

    // 2. 匹配邮箱（完整匹配）
    if (member.email && description.includes(member.email.toLowerCase())) {
      console.log(`✅ [matchMember] Matched by email: ${member.name} (${member.email})`);
      return {
        memberId: member.id,
        memberName: member.name,
        matchType: 'email',
        matchedValue: member.email,
      };
    }

    // 3. 匹配手机号码（灵活匹配，去除前导0和+60）
    if (member.phone) {
      // 处理多种手机号格式
      const phoneVariants = [
        member.phone,                           // 原始格式: "103149144"
        member.phone.replace(/^0+/, ''),       // 去除前导0: "103149144"
        `0${member.phone}`,                    // 添加0: "0103149144"
        `60${member.phone}`,                   // 添加国家代码: "60103149144"
        `+60${member.phone}`,                  // 添加+60: "+60103149144"
        member.phone.replace(/^0/, '60'),      // 替换0为60
      ];

      for (const phoneVariant of phoneVariants) {
        if (description.includes(phoneVariant.toLowerCase())) {
          console.log(`✅ [matchMember] Matched by phone: ${member.name} (${member.phone} → ${phoneVariant})`);
          return {
            memberId: member.id,
            memberName: member.name,
            matchType: 'phone',
            matchedValue: member.phone,
          };
        }
      }
    }

    // 4. 匹配会员ID（如果存在且不为空）
    if (member.memberId && member.memberId !== 'null' && description.includes(member.memberId.toLowerCase())) {
      console.log(`✅ [matchMember] Matched by memberId: ${member.name} (${member.memberId})`);
      return {
        memberId: member.id,
        memberName: member.name,
        matchType: 'memberId',
        matchedValue: member.memberId,
      };
    }

    // 5. 匹配姓名（完整匹配，至少3个字符）
    if (member.name && member.name.length >= 3) {
      const memberNameLower = member.name.toLowerCase();
      if (description.includes(memberNameLower)) {
        console.log(`✅ [matchMember] Matched by name: ${member.name}`);
        return {
          memberId: member.id,
          memberName: member.name,
          matchType: 'name',
          matchedValue: member.name,
        };
      }
    }

    // 6. 匹配身份证全名（如果与 name 不同）
    const fullNameNric = (member.profile as any)?.fullNameNric;
    if (fullNameNric && fullNameNric !== member.name && fullNameNric.length >= 3) {
      if (description.includes(fullNameNric.toLowerCase())) {
        console.log(`✅ [matchMember] Matched by fullNameNric: ${member.name} (${fullNameNric})`);
        return {
          memberId: member.id,
          memberName: member.name,
          matchType: 'name',
          matchedValue: fullNameNric,
        };
      }
    }
  }

  return undefined;
};

/**
 * 计算名称匹配得分（满分20分，作为辅助参考）
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

  // 1. 完全匹配 (20分)
  if (description.includes(eventName) || eventName.includes(description)) {
    return { score: 20, reason: '完全匹配' };
  }

  // 2. 缩写匹配 (18分)
  const acronym = event.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toLowerCase();

  if (acronym.length >= 2 && description.includes(acronym)) {
    return { score: 18, reason: `缩写匹配 "${acronym.toUpperCase()}"` };
  }

  // 3. 模糊匹配 - 移除空格和特殊字符 (15分)
  const cleanDesc = description.replace(/[-\s*]/g, '');
  const cleanName = eventName.replace(/[-\s*]/g, '');

  if (cleanDesc.includes(cleanName) || cleanName.includes(cleanDesc)) {
    return { score: 15, reason: '模糊匹配（忽略空格）' };
  }

  // 4. 关键词匹配 (5-12分)
  const keywords = eventName.split(' ').filter((w) => w.length > 3);
  const matchedKeywords = keywords.filter((keyword) =>
    description.includes(keyword.toLowerCase())
  );

  if (matchedKeywords.length > 0) {
    const score = Math.floor((matchedKeywords.length / keywords.length) * 12);
    return {
      score: Math.max(5, score), // 至少5分
      reason: `关键词匹配 ${matchedKeywords.length}/${keywords.length}`,
    };
  }

  return { score: 0, reason: '无名称匹配' };
};

/**
 * 计算票价匹配得分（满分40分，金额是最可靠的匹配依据）
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

  // 1. 精确匹配 (40分)
  for (const [type, price] of Object.entries(prices)) {
    if (amount === price) {
      return { score: 40, type: `${type}价`, matchedPrice: price };
    }
  }

  // 2. 倍数匹配 - 多张票 (33分)
  for (const [type, price] of Object.entries(prices)) {
    if (price === 0) continue; // 跳过免费票

    for (let i = 2; i <= 5; i++) {
      if (amount === price * i) {
        return { score: 33, type: `${type}价 x${i}`, matchedPrice: price };
      }
    }
  }

  // 3. 范围匹配 (20分)
  const validPrices = Object.values(prices).filter((p) => p > 0);
  if (validPrices.length > 0) {
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    if (amount >= minPrice && amount <= maxPrice) {
      return { score: 20, type: '范围内', matchedPrice: undefined };
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
): { score: number; reason: string; daysDifference: number } => {
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
    return { score: 0, reason: '日期无效', daysDifference: 99999 };
  }

  const daysDiff = Math.abs(
    Math.floor((evtDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  console.log('📊 [calculateDateScore] Days difference:', daysDiff);

  // 日期匹配得分（满分40分，最重要的匹配依据）
  if (daysDiff === 0) {
    return { score: 40, reason: '活动当天', daysDifference: daysDiff };
  }

  if (daysDiff <= 3) {
    return { score: 35, reason: `活动前后${daysDiff}天`, daysDifference: daysDiff };
  }

  if (daysDiff <= 7) {
    return { score: 30, reason: `活动前后${daysDiff}天`, daysDifference: daysDiff };
  }

  if (daysDiff <= 14) {
    return { score: 25, reason: `活动前后${daysDiff}天`, daysDifference: daysDiff };
  }

  if (daysDiff <= 30) {
    return { score: 20, reason: `活动前后${daysDiff}天`, daysDifference: daysDiff };
  }

  return { score: 0, reason: `相差${daysDiff}天，超出范围`, daysDifference: daysDiff };
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

