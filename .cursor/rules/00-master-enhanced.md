### Summary: Critical Business Rules

| Rule Category | Key Points | Impact |
|--------------|------------|--------|
| **Member Fee Matching** | Auto-match based on name + amount + date | Automates payment verification |
| **Event Pricing** | 4-tier pricing based on member category | Fair pricing for different members |
| **Category Tasks** | Different categories have different requirements | Ensures member qualification |
| **Budget Mapping** | Keywords map transactions to budget categories | Auto-categorization for reporting |
| **Fiscal Year** | Oct 1 - Sep 30 | All financial calculations |
| **Transaction Numbering** | Sequential by account + year | Unique identifiers |
| **Approval Workflows** | Multi-step approval for key operations | Audit trail and control |

---

### 11. Awards System ↔ Member Activity Matching (奖励系统与会员活动匹配)

#### Purpose
Track member activities and automatically calculate award scores based on participation and achievements.

#### Award Types
```typescript
// 4 Main Award Systems
type AwardSystemType = 
  | 'efficient_star'              // 效率之星
  | 'star_point'                  // 星点奖
  | 'national_area_incentive'     // 国家/区域奖励
  | 'e_awards';                   // 电子奖项
```

#### Star Point Categories (4 Stars)
```typescript
type StarCategoryType = 
  | 'network_star'                // 人脉之星
  | 'experience_star'             // 体验之星
  | 'outreach_star'               // 外展之星
  | 'social_star';                // 社交之星
```

#### Senator Score System
```typescript
// In Member.profile
interface SenatorScoreData {
  senatorId?: string;                    // 参议员编号
  senatorScore?: number;                 // 当前总分
  senatorScoreHistory?: Array<{
    id: string;
    score: number;                       // 单次得分（可正可负）
    reason: string;                      // 得分原因
    awardedBy: string;                   // 授予人
    awardedDate: string;                 // 授予日期
    notes?: string;
  }>;
}
```

#### Activity → Score Matching Rules
```typescript
interface ActivityScoreMapping {
  // 活动类型与分数映射
  activityTypeScores: {
    'meeting': {
      attended: 10,                      // 出席会议 +10分
      absent: -5,                        // 缺席会议 -5分
      excused: 0                         // 请假 0分
    },
    'training': {
      completed: 20,                     // 完成培训 +20分
      partial: 10                        // 部分完成 +10分
    },
    'volunteer': {
      participated: 15,                  // 参与志愿活动 +15分
      organized: 30                      // 组织活动 +30分
    },
    'committee_role': {
      president: 100,                    // 会长 +100分
      vice_president: 50,                // 副会长 +50分
      department_head: 30,               // 部门主管 +30分
      member: 10                         // 成员 +10分
    }
  };
  
  // 指标完成度与分数
  indicatorScores: {
    target_met: number;                  // 达标分数
    exceeds_target: number;              // 超标额外分
    bonus_multiplier: number;            // 奖励倍数
  };
}
```

#### Auto-calculation Service
```typescript
// src/modules/award/services/scoreCalculationService.ts

export const calculateMemberAwardScore = async (
  memberId: string,
  year: number
): Promise<{
  totalScore: number;
  breakdown: ScoreBreakdown;
  recommendations: string[];
}> => {
  // 1. Get member activity participation
  const activities = await indicatorService.getMemberActivityParticipations(
    memberId,
    year
  );
  
  // 2. Calculate scores by activity type
  let meetingScore = 0;
  let trainingScore = 0;
  let volunteerScore = 0;
  let committeeScore = 0;
  
  activities.forEach(activity => {
    switch (activity.activityType) {
      case 'meeting':
        if (activity.status === 'attended') meetingScore += 10;
        if (activity.status === 'absent') meetingScore -= 5;
        break;
      case 'training':
        trainingScore += activity.points || 20;
        break;
      case 'volunteer':
        volunteerScore += 15;
        break;
    }
  });
  
  // 3. Get committee roles
  const member = await getMemberById(memberId);
  if (member.profile?.jciPosition) {
    committeeScore = getPositionScore(member.profile.jciPosition);
  }
  
  // 4. Calculate indicators completion
  const indicators = await indicatorService.getMemberIndicatorCompletions(
    memberId,
    year
  );
  const indicatorScore = indicators.reduce((sum, ind) => 
    sum + ind.actualScore, 0
  );
  
  const totalScore = meetingScore + trainingScore + volunteerScore + 
                     committeeScore + indicatorScore;
  
  // 5. Generate recommendations
  const recommendations: string[] = [];
  if (meetingScore < 30) {
    recommendations.push('建议参加更多会议以提升分数');
  }
  if (trainingScore === 0) {
    recommendations.push('建议完成至少一门培训课程');
  }
  
  return {
    totalScore,
    breakdown: {
      meeting: meetingScore,
      training: trainingScore,
      volunteer: volunteerScore,
      committee: committeeScore,
      indicators: indicatorScore
    },
    recommendations
  };
};

const getPositionScore = (position: string): number => {
  const scoreMap: Record<string, number> = {
    'president': 100,
    'vice_president': 50,
    'secretary_general': 50,
    'treasurer': 50,
    'department_head': 30,
    'official_member': 10
  };
  return scoreMap[position] || 0;
};
```

---

### 12. Permission System ↔ Member Category Matching (权限系统与会员类别匹配)

#### Permission Assignment Rules
```typescript
interface PermissionCategoryMapping {
  // 会员类别 → 默认角色映射
  defaultRoleMapping: {
    'official_member': ['member', 'voter'],
    'associate_member': ['member'],
    'honorary_member': ['member', 'voter', 'advisor'],
    'affiliate_member': ['member'],
    'visiting_member': ['guest'],
    'alumni': ['alumni', 'guest'],
    'guest': ['guest']
  };
  
  // JCI职位 → 系统权限映射
  positionPermissionMapping: {
    'president': [
      'system.manage',
      'member.manage',
      'finance.manage',
      'event.manage',
      'rbac.manage'
    ],
    'secretary_general': [
      'member.manage',
      'event.manage',
      'system.read'
    ],
    'treasurer': [
      'finance.manage',
      'finance.approve',
      'bill_payment.approve'
    ],
    'vice_president': [
      'member.update',
      'event.manage'
    ],
    'department_head': [
      'event.create',
      'event.update',
      'member.read'
    ],
    'official_member': [
      'event.read',
      'member.read',
      'profile.update'
    ],
    'associate_member': [
      'event.read',
      'profile.update'
    ]
  };
}
```

#### Auto-sync Permission Service
```typescript
// src/modules/permission/services/permissionSyncService.ts

export const syncMemberPermissions = async (
  memberId: string
): Promise<void> => {
  const member = await getMemberById(memberId);
  if (!member) return;
  
  // 1. Get base role from member category
  const baseRole = getDefaultRole(member.accountType);
  
  // 2. Get position-based permissions
  const positionPerms = member.profile?.jciPosition
    ? getPositionPermissions(member.profile.jciPosition)
    : [];
  
  // 3. Combine permissions
  const allPermissions = [...baseRole.permissions, ...positionPerms];
  
  // 4. Update member's effective permissions
  await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId), {
    'profile.effectivePermissions': Array.from(new Set(allPermissions)),
    'profile.roleBindings': [
      {
        roleId: baseRole.id,
        scopes: {},
        expiresAt: null
      }
    ]
  });
  
  // 5. Log permission change
  await operationLoggingService.logOperation({
    userId: 'system',
    userName: 'System',
    userEmail: 'system@jcikl.com',
    userRole: 'system',
    operation: 'PERMISSION_CHANGE',
    module: 'permission',
    action: 'sync_permissions',
    targetType: 'Member',
    targetId: memberId,
    afterData: { permissions: allPermissions },
    isReversible: false,
    isReverted: false,
    tags: ['auto-sync', 'permission'],
    severity: 'info'
  });
};
```

#### Permission Change Trigger Points
```typescript
// When to sync permissions automatically

const PERMISSION_SYNC_TRIGGERS = {
  // Trigger 1: Category approval
  on_category_approved: async (memberId: string) => {
    await syncMemberPermissions(memberId);
  },
  
  // Trigger 2: Position assignment
  on_position_assigned: async (memberId: string, position: string) => {
    await syncMemberPermissions(memberId);
  },
  
  // Trigger 3: Member status change
  on_status_change: async (memberId: string, oldStatus: string, newStatus: string) => {
    if (newStatus === 'active') {
      await syncMemberPermissions(memberId);
    } else if (newStatus === 'suspended') {
      await revokeMemberPermissions(memberId);
    }
  },
  
  // Trigger 4: Category change
  on_category_change: async (memberId: string) => {
    await syncMemberPermissions(memberId);
  }
};
```

---

### 13. Event ↔ Member Matching (活动管理与会员匹配)

#### Registration Eligibility Rules
```typescript
interface EventMemberMatchingRules {
  // 活动开放对象 → 会员类别匹配
  registrationOpenFor: {
    'Member': ['official_member', 'associate_member', 'honorary_member'],
    'Alumni': ['alumni', 'visiting_member'],
    'Friend': ['guest'],
    'All': ['*']  // All categories
  };
  
  // 活动级别 → 参与限制
  eventLevelRestrictions: {
    'Local': {
      minCategory: 'associate_member',
      requiresApproval: false
    },
    'Area': {
      minCategory: 'official_member',
      requiresApproval: true,
      approvalBy: ['president', 'vice_president']
    },
    'National': {
      minCategory: 'official_member',
      requiresApproval: true,
      approvalBy: ['president'],
      additionalRequirements: ['active_for_6_months']
    },
    'JCI': {
      minCategory: 'official_member',
      requiresApproval: true,
      requiresSelection: true,
      approvalBy: ['president', 'board']
    }
  };
}
```

#### Registration Validation Service
```typescript
// src/modules/event/services/registrationValidationService.ts

export const validateMemberEligibility = async (
  eventId: string,
  memberId: string
): Promise<{
  eligible: boolean;
  reason?: string;
  requiredActions?: string[];
}> => {
  const event = await getEvent(eventId);
  const member = await getMemberById(memberId);
  
  if (!event || !member) {
    return { eligible: false, reason: 'Event or member not found' };
  }
  
  // Check 1: Event is published
  if (event.status !== 'Published') {
    return { eligible: false, reason: '活动尚未发布' };
  }
  
  // Check 2: Registration period
  const now = new Date();
  if (event.registrationEndDate && now > event.registrationEndDate.toDate()) {
    return { eligible: false, reason: '报名已截止' };
  }
  
  // Check 3: Member category eligibility
  const memberCategory = member.accountType || 'guest';
  const allowedCategories = event.registrationOpenFor || ['Member'];
  
  const categoryMatch = allowedCategories.some(allowed => {
    const matchedCategories = EVENT_CATEGORY_MAPPING[allowed] || [];
    return matchedCategories.includes(memberCategory);
  });
  
  if (!categoryMatch) {
    return { 
      eligible: false, 
      reason: `此活动不对 ${memberCategory} 开放`,
      requiredActions: ['升级会员类别']
    };
  }
  
  // Check 4: Event level restrictions
  const levelRestriction = EVENT_LEVEL_RESTRICTIONS[event.level];
  if (levelRestriction && !meetsLevelRequirement(member, levelRestriction)) {
    return {
      eligible: false,
      reason: `需要 ${levelRestriction.minCategory} 或以上类别`,
      requiredActions: ['完成会员类别升级']
    };
  }
  
  // Check 5: Seat availability
  if (event.maxParticipants && event.totalRegistrations >= event.maxParticipants) {
    return { eligible: false, reason: '活动已满员' };
  }
  
  // Check 6: Payment verification (for new members)
  if (memberCategory.includes('member') && !member.profile?.paymentVerifiedDate) {
    return {
      eligible: false,
      reason: '会员费未支付',
      requiredActions: ['完成会员费支付', '上传支付凭证']
    };
  }
  
  return { eligible: true };
};
```

---

### 14. Member Recruitment Tracking (会员招揽记录与统计)

#### Data Model
```typescript
// In Member.profile
interface MemberProfile {
  // ... existing fields
  
  // Recruitment Info
  introducerName?: string;               // 推荐人姓名
  introducerId?: string;                 // 推荐人会员ID (NEW)
  introducerVerified?: boolean;          // 推荐关系已验证 (NEW)
  recruitmentDate?: string;              // 招揽日期 (NEW)
  recruitmentNotes?: string;             // 招揽备注 (NEW)
}

// NEW Collection: memberRecruitment
interface MemberRecruitmentRecord {
  id: string;
  recruiterId: string;                   // 招揽人ID
  recruiterName: string;                 // 招揽人姓名
  recruitedMemberId: string;             // 被招揽会员ID
  recruitedMemberName: string;           // 被招揽会员姓名
  recruitmentDate: string;               // 招揽日期
  recruitmentMethod: 'referral' | 'event' | 'network' | 'other';
  recruitmentChannel?: string;           // 招揽渠道
  
  // Status Tracking
  status: 'pending' | 'joined' | 'approved' | 'rejected';
  joinedDate?: string;                   // 加入日期
  approvedDate?: string;                 // 批准日期
  
  // Verification
  isVerified: boolean;                   // 关系已验证
  verifiedBy?: string;
  verifiedDate?: string;
  
  // Incentives
  incentiveEligible: boolean;            // 是否符合奖励条件
  incentiveAmount?: number;              // 奖励金额
  incentivePaid?: boolean;               // 奖励已发放
  
  createdAt: string;
  updatedAt: string;
}
```

#### Recruitment Statistics
```typescript
// NEW Collection: recruitmentStats
interface RecruitmentStats {
  recruiterId: string;
  recruiterName: string;
  year: number;
  month?: number;                        // Optional for monthly stats
  
  // Counts
  totalRecruits: number;                 // 总招揽数
  pendingRecruits: number;               // 待加入
  joinedRecruits: number;                // 已加入
  approvedRecruits: number;              // 已批准
  
  // Conversion Rate
  conversionRate: number;                // 转化率 (joined/total)
  approvalRate: number;                  // 批准率 (approved/joined)
  
  // Incentives
  totalIncentivesEarned: number;         // 累计奖励
  pendingIncentives: number;             // 待发奖励
  
  // Rankings
  rankInChapter?: number;                // 分会排名
  rankInRegion?: number;                 // 区域排名
  
  lastUpdated: string;
}
```

#### Recruitment Service
```typescript
// src/modules/member/services/recruitmentService.ts

class RecruitmentService {
  /**
   * Record a recruitment
   */
  async recordRecruitment(data: {
    recruiterId: string;
    recruitedMemberEmail: string;
    recruitmentMethod: string;
    notes?: string;
  }): Promise<string> {
    const recruiter = await getMemberById(data.recruiterId);
    
    const record: Omit<MemberRecruitmentRecord, 'id'> = {
      recruiterId: data.recruiterId,
      recruiterName: recruiter.name,
      recruitedMemberId: 'pending',      // Will update when member registers
      recruitedMemberName: data.recruitedMemberEmail,
      recruitmentDate: new Date().toISOString(),
      recruitmentMethod: data.recruitmentMethod as any,
      status: 'pending',
      isVerified: false,
      incentiveEligible: true,           // Default eligible
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.MEMBER_RECRUITMENT),
      cleanUndefinedValues(record)
    );
    
    return docRef.id;
  }
  
  /**
   * Link recruitment record when member registers
   */
  async linkRecruitmentOnRegistration(
    memberEmail: string,
    memberId: string
  ): Promise<void> {
    // Find pending recruitment records
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBER_RECRUITMENT),
      where('recruitedMemberName', '==', memberEmail),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const record = snapshot.docs[0];
      await updateDoc(record.ref, {
        recruitedMemberId: memberId,
        status: 'joined',
        joinedDate: new Date().toISOString()
      });
      
      // Update member's introducer info
      const member = await getMemberById(memberId);
      const recruitment = record.data() as MemberRecruitmentRecord;
      
      await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId), {
        'profile.introducerId': recruitment.recruiterId,
        'profile.introducerVerified': true,
        'profile.recruitmentDate': recruitment.recruitmentDate
      });
    }
  }
  
  /**
   * Get recruiter statistics
   */
  async getRecruiterStats(
    recruiterId: string,
    year: number
  ): Promise<RecruitmentStats> {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBER_RECRUITMENT),
      where('recruiterId', '==', recruiterId),
      where('recruitmentDate', '>=', `${year}-01-01`),
      where('recruitmentDate', '<=', `${year}-12-31`)
    );
    
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => doc.data() as MemberRecruitmentRecord);
    
    return {
      recruiterId,
      recruiterName: records[0]?.recruiterName || '',
      year,
      totalRecruits: records.length,
      pendingRecruits: records.filter(r => r.status === 'pending').length,
      joinedRecruits: records.filter(r => r.status === 'joined').length,
      approvedRecruits: records.filter(r => r.status === 'approved').length,
      conversionRate: records.filter(r => r.status === 'joined').length / records.length,
      approvalRate: records.filter(r => r.status === 'approved').length / 
                    Math.max(1, records.filter(r => r.status === 'joined').length),
      totalIncentivesEarned: records
        .filter(r => r.incentivePaid)
        .reduce((sum, r) => sum + (r.incentiveAmount || 0), 0),
      pendingIncentives: records
        .filter(r => r.incentiveEligible && !r.incentivePaid)
        .reduce((sum, r) => sum + (r.incentiveAmount || 0), 0),
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Get top recruiters leaderboard
   */
  async getTopRecruiters(
    year: number,
    limit: number = 10
  ): Promise<Array<{ name: string; recruits: number }>> {
    // Aggregate all recruitment records
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBER_RECRUITMENT),
      where('recruitmentDate', '>=', `${year}-01-01`),
      where('status', '==', 'approved')
    );
    
    const snapshot = await getDocs(q);
    const recruiterCounts = new Map<string, { name: string; count: number }>();
    
    snapshot.docs.forEach(doc => {
      const record = doc.data() as MemberRecruitmentRecord;
      const existing = recruiterCounts.get(record.recruiterId);
      
      if (existing) {
        existing.count++;
      } else {
        recruiterCounts.set(record.recruiterId, {
          name: record.recruiterName,
          count: 1
        });
      }
    });
    
    return Array.from(recruiterCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(r => ({ name: r.name, recruits: r.count }));
  }
}

export const recruitmentService = new RecruitmentService();
```

---

### 15. Member Personal Interests & Industry Matching (会员兴趣与行业匹配)

#### Interests Data Structure
```typescript
// In Member.profile (Already implemented)
interface MemberProfile {
  // Personal Interests/Hobbies (14 options)
  hobbies?: Array<
    | 'Badminton'
    | 'Golf'
    | 'Basketball'
    | 'Pickle Ball'
    | 'E-Sport MLBB'
    | 'other E-sport'
    | 'Rock Climbing'
    | 'Hiking'
    | 'Car Enthusiast'
    | 'Liquor/ Wine tasting'
    | 'Movie'
    | 'Public Speaking'
    | 'Reading'
    | 'Dancing'
    | 'Singing'
    | 'Other'
    | 'Not at this moment'
  >;
  
  // JCI-specific Interests
  jciEventInterests?: string;            // 感兴趣的JCI活动类型
  jciBenefitsExpectation?: string;       // 期望从JCI获得的资源/活动/福利
}
```

#### Industry & Business Profile
```typescript
interface MemberProfile {
  // Own Industry (Self-classification)
  ownIndustry?: Array<
    | 'Advertising, Marketing & Media'
    | 'Agriculture & Animals'
    | 'Architecture, Engineering & Construction'
    | 'Art, Entertainment & Design'
    | 'Automotive & Accessories'
    | 'Food & Beverages'
    | 'Computers & IT'
    | 'Consulting & Professional Services'
    | 'Education & Training'
    | 'Event & Hospitality'
    | 'Finance & Insurance'
    | 'Health, Wellness & Beauty'
    | 'Legal & Accounting'
    | 'Manufacturing'
    | 'Retail & E-Commerce'
    | 'Real Estate & Property Services'
    | 'Repair Services'
    | 'Security & Investigation'
    | 'Transport & Logistics'
    | 'Travel & Tourism'
    | 'Other'
  >;
  
  // Interested Industries (for networking)
  interestedIndustries?: Array<string>;  // Same options as ownIndustry
  
  // Business Categories
  categories?: Array<
    | 'Distributor'
    | 'Manufacturer'
    | 'Retailer / E-commerce'
    | 'Service Provider'
  >;
  
  // Work Details
  company?: string;                      // Company name
  departmentAndPosition?: string;        // Department & position
  companyIntro?: string;                 // Company operations & role
  
  // Career Development
  fiveYearsVision?: string;              // 5-year career vision
  activeMemberHow?: string;              // How to be an active member
  
  // Business Preferences
  acceptInternationalBusiness?: 'Yes' | 'No' | 'Willing to explore';
}
```

#### Interest-based Event Matching
```typescript
// src/modules/event/services/eventRecommendationService.ts

export const recommendEventsForMember = async (
  memberId: string,
  limit: number = 5
): Promise<Event[]> => {
  const member = await getMemberById(memberId);
  if (!member) return [];
  
  // 1. Get all published events
  const events = await eventService.getEvents({
    status: 'Published',
    startDate: new Date().toISOString()
  });
  
  // 2. Score events based on member interests
  const scoredEvents = events.map(event => {
    let score = 0;
    
    // Match hobbies (if event is hobby-related)
    if (member.profile?.hobbies) {
      const hobbyMatch = matchHobbiesToEvent(member.profile.hobbies, event);
      score += hobbyMatch * 20;
    }
    
    // Match JCI interests
    if (member.profile?.jciEventInterests) {
      const jciMatch = event.description.toLowerCase()
        .includes(member.profile.jciEventInterests.toLowerCase());
      if (jciMatch) score += 30;
    }
    
    // Match industry (for business events)
    if (event.category === 'BUSINESS_NETWORKING' && member.profile?.ownIndustry) {
      score += 25;
    }
    
    // Past attendance boost
    const hasAttendedBefore = checkPastAttendance(memberId, event.type);
    if (hasAttendedBefore) score += 15;
    
    return { event, score };
  });
  
  // 3. Return top N recommendations
  return scoredEvents
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.event);
};

const matchHobbiesToEvent = (hobbies: string[], event: Event): number => {
  const hobbyKeywords = {
    'Golf': ['golf', 'sports'],
    'Basketball': ['basketball', 'sports'],
    'Car Enthusiast': ['car', 'automotive', 'drive'],
    'Wine tasting': ['wine', 'liquor', 'tasting'],
    'Public Speaking': ['speaking', 'presentation', 'toastmaster']
  };
  
  let matches = 0;
  hobbies.forEach(hobby => {
    const keywords = hobbyKeywords[hobby] || [];
    if (keywords.some(kw => event.description.toLowerCase().includes(kw))) {
      matches++;
    }
  });
  
  return matches / Math.max(1, hobbies.length); // Normalized 0-1
};
```

#### Industry Networking Match
```typescript
// src/modules/member/services/networkingMatchService.ts

export const findNetworkingMatches = async (
  memberId: string
): Promise<Member[]> => {
  const member = await getMemberById(memberId);
  if (!member) return [];
  
  const interestedIndustries = member.profile?.interestedIndustries || [];
  if (interestedIndustries.length === 0) return [];
  
  // Find members whose industry matches your interests
  const allMembers = await memberService.getMembers({
    status: 'active',
    limit: 1000
  });
  
  const matches = allMembers.data.filter(m => {
    if (m.id === memberId) return false;
    
    const theirIndustry = m.profile?.ownIndustry || [];
    const overlap = theirIndustry.some(ind => 
      interestedIndustries.includes(ind)
    );
    
    return overlap;
  });
  
  // Score by relevance
  return matches
    .map(m => ({
      member: m,
      score: calculateNetworkingScore(member, m)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(item => item.member);
};

const calculateNetworkingScore = (member1: Member, member2: Member): number => {
  let score = 0;
  
  // Industry overlap
  const industry1 = member1.profile?.ownIndustry || [];
  const industry2 = member2.profile?.ownIndustry || [];
  const interests1 = member1.profile?.interestedIndustries || [];
  
  const overlap = industry2.filter(ind => interests1.includes(ind)).length;
  score += overlap * 30;
  
  // Hobby overlap
  const hobbies1 = member1.profile?.hobbies || [];
  const hobbies2 = member2.profile?.hobbies || [];
  const hobbyOverlap = hobbies1.filter(h => hobbies2.includes(h)).length;
  score += hobbyOverlap * 10;
  
  // Same region
  if (member1.countryRegion === member2.countryRegion) {
    score += 20;
  }
  
  return score;
};
```

---

### 16. Swiper Integration (轮播组件集成)

#### Usage in Project
```typescript
// Swiper is used for image galleries and event photo slideshows
// Reference: https://swiperjs.com/

// Installation (if needed)
// npm install swiper@latest
```

#### Implementation Examples
```typescript
// src/components/common/ImageGallery.tsx

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

interface ImageGalleryProps {
  images: string[];
  height?: number;
  autoplay?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  height = 400,
  autoplay = true
}) => {
  return (
    <Swiper
      modules={[Navigation, Pagination, Autoplay, EffectFade]}
      spaceBetween={10}
      slidesPerView={1}
      navigation
      pagination={{ clickable: true }}
      autoplay={autoplay ? {
        delay: 3000,
        disableOnInteraction: false
      } : false}
      effect="fade"
      loop
      style={{ height }}
    >
      {images.map((image, index) => (
        <SwiperSlide key={index}>
          <img
            src={image}
            alt={`Slide ${index + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};
```

#### Event Photo Carousel
```typescript
// src/modules/event/components/EventPhotoCarousel.tsx

import { Swiper, SwiperSlide } from 'swiper/react';
import { Thumbs, FreeMode } from 'swiper/modules';

export const EventPhotoCarousel: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [photos, setPhotos] = useState<string[]>([]);
  
  return (
    <>
      {/* Main Swiper */}
      <Swiper
        modules={[Thumbs]}
        thumbs={{ swiper: thumbsSwiper }}
        spaceBetween={10}
        slidesPerView={1}
        style={{ height: 500 }}
      >
        {photos.map((photo, index) => (
          <SwiperSlide key={index}>
            <img src={photo} alt={`Event ${index}`} />
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Thumbnails Swiper */}
      <Swiper
        modules={[FreeMode, Thumbs]}
        onSwiper={setThumbsSwiper}
        spaceBetween={10}
        slidesPerView={4}
        freeMode
        watchSlidesProgress
        style={{ height: 100, marginTop: 10 }}
      >
        {photos.map((photo, index) => (
          <SwiperSlide key={index}>
            <img src={photo} alt={`Thumb ${index}`} />
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  );
};
```

#### Member Profile Carousel
```typescript
// src/modules/member/components/MemberAchievementsCarousel.tsx

export const MemberAchievementsCarousel: React.FC = ({ memberId }) => {
  const achievements = useMemberAchievements(memberId);
  
  return (
    <Swiper
      modules={[Pagination, Autoplay]}
      spaceBetween={20}
      slidesPerView={3}
      pagination={{ clickable: true }}
      autoplay={{ delay: 4000 }}
      breakpoints={{
        320: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 }
      }}
    >
      {achievements.map(achievement => (
        <SwiperSlide key={achievement.id}>
          <Card hoverable>
            <Trophy />
            <Title level={4}>{achievement.name}</Title>
            <Text>{achievement.date}</Text>
          </Card>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};
```

#### Swiper Global Configuration
```typescript
// src/config/swiperConfig.ts

export const SWIPER_DEFAULTS = {
  // Image Gallery
  imageGallery: {
    spaceBetween: 10,
    slidesPerView: 1,
    navigation: true,
    pagination: { clickable: true },
    autoplay: { delay: 3000 },
    loop: true,
    effect: 'fade'
  },
  
  // Event Cards
  eventCards: {
    spaceBetween: 20,
    slidesPerView: 3,
    navigation: true,
    pagination: false,
    breakpoints: {
      320: { slidesPerView: 1 },
      768: { slidesPerView: 2 },
      1024: { slidesPerView: 3 }
    }
  },
  
  // Achievement Showcase
  achievements: {
    spaceBetween: 15,
    slidesPerView: 4,
    autoplay: { delay: 4000 },
    loop: true,
    centeredSlides: true,
    breakpoints: {
      320: { slidesPerView: 1 },
      480: { slidesPerView: 2 },
      768: { slidesPerView: 3 },
      1024: { slidesPerView: 4 }
    }
  }
};
```

#### Usage with Global Settings
```typescript
// Integrate with global settings system

// NEW Setting Keys for Swiper
'swiper-gallery-autoplay-delay': 3000
'swiper-gallery-transition-effect': 'fade' | 'slide' | 'cube'
'swiper-cards-slides-per-view': 3
'swiper-enable-navigation': true
'swiper-enable-pagination': true
```

---

### Database Collections Update
```typescript
// Add new collections to globalCollections.ts

export const GLOBAL_COLLECTIONS = {
  // ... existing collections
  
  // Recruitment Tracking
  MEMBER_RECRUITMENT: 'memberRecruitment',
  RECRUITMENT_STATS: 'recruitmentStats',
  
  // Award System
  AWARD_SCORES: 'awardScores',
  AWARD_INDICATORS: 'awardIndicators',
  INDICATOR_COMPLETIONS: 'indicatorCompletions',
  ACTIVITY_PARTICIPATIONS: 'activityParticipations'
} as const;
```

### Total Collections Update
**New Total**: 46 → **52 Collections**

---d {
    const settingsMap = new Map(
      Array.from(this.cache.entries()).map(([key, setting]) => [key, setting.value])
    );
    this.listeners.forEach(listener => listener(settingsMap));
  }
  
  private applyCSSVariables(settings: GlobalSettingDocument[]): void {
    const root = document.documentElement;
    
    settings.forEach(setting => {
      if (setting.key.startsWith('theme-')) {
        const cssVar = `--${setting.key}`;
        root.style.setProperty(cssVar, String(setting.value));
      }
    });
  }
  
  private applyToGlobalConfig(setting: GlobalSettingDocument): void {
    // Update runtime config objects
    // This allows components to use both CSS variables and JS config
    const path = setting.key.split('-');
    // Update GLOBAL_COMPONENT_CONFIG dynamically
  }
  
  private applyI18nSettings(settings: GlobalSettingDocument[]): void {
    // Update i18next configuration
    settings.forEach(setting => {
      if (setting.key.startsWith('i18n-')) {
        // Apply to i18n instance
      }
    });
  }
}

export const globalSettingsService = new GlobalSettingsService();
```

### Usage in Components

#### Using Named Presets
```typescript
// ✅ Using named table preset
import { useGlobalSettings } from '@/hooks/useGlobalSettings';

const MemberListPage: React.FC = () => {
  const { getTableConfig } = useGlobalSettings();
  
  // Use 'table-1' preset for standard lists
  const table1Config = getTableConfig('table-1');
  
  // Use 'table-2' preset for reports
  const table2Config = getTableConfig('table-2');
  
  return (
    <Table
      {...table1Config}
      dataSource={members}
      columns={columns}
    />
  );
};
```

#### Using Theme Variables
```typescript
// ✅ Using CSS variables (auto-synced)
const CustomButton = styled.button`
  background-color: var(--theme-primary-color);
  border-radius: var(--theme-border-radius-base);
  font-size: var(--theme-font-size-base);
  
  &:hover {
    background-color: var(--button-primary-hover-bg);
  }
`;
```

#### Using Data Formats
```typescript
// ✅ Using configured date format
import { useGlobalSettings } from '@/hooks/useGlobalSettings';

const TransactionList: React.FC = () => {
  const { getDateFormat } = useGlobalSettings();
  
  const displayFormat = getDateFormat('date-display-format');
  
  return (
    <Text>{dayjs(transaction.date).format(displayFormat)}</Text>
  );
};
```

### Hook Implementation
```typescript
// src/hooks/useGlobalSettings.ts

export const useGlobalSettings = () => {
  const [settings, setSettings] = useState<Map<string, any>>(new Map());
  
  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = globalSettingsService.subscribe(setSettings);
    
    // Initial load
    globalSettingsService.applySettings();
    
    return unsubscribe;
  }, []);
  
  const getTableConfig = (variant: string = 'table-1') => {
    return {
      pageSize: settings.get(`${variant}-page-size`) ?? 20,
      size: settings.get(`${variant}-size`) ?? 'middle',
      bordered: settings.get(`${variant}-bordered`) ?? false,
      showSizeChanger: settings.get(`${variant}-show-size-changer`) ?? true,
      // ... more configs
    };
  };
  
  const getButtonStyle = (variant: string = 'button-primary') => {
    return {
      backgroundColor: settings.get(`${variant}-bg`),
      color: settings.get(`${variant}-text-color`),
      borderRadius: settings.get(`${variant}-border-radius`),
      // ... more styles
    };
  };
  
  const getDateFormat = (key: string) => {
    return settings.get(key) ?? 'DD-MMM-YYYY';
  };
  
  return {
    settings,
    getTableConfig,
    getButtonStyle,
    getDateFormat,
  };
};
```

### Initial Data Seeding
```typescript
// src/scripts/seedGlobalSettings.ts

const INITIAL_SETTINGS: GlobalSettingDocument[] = [
  // Theme Colors
  {
    id: 'theme-primary-color',
    category: 'UI_THEME',
    name: '主色调',
    key: 'theme-primary-color',
    type: 'color',
    value: '#1890ff',
    defaultValue: '#1890ff',
    description: '系统主色调，用于主按钮、链接等',
    scope: 'global',
    tags: ['color', 'theme', 'primary'],
    isActive: true,
    version: 1
  },
  
  // Table Presets
  {
    id: 'table-1-page-size',
    category: 'UI_COMPONENTS',
    name: '表格1-每页显示',
    key: 'table-1-page-size',
    type: 'number',
    value: 20,
    defaultValue: 20,
    description: '标准列表表格每页显示条数',
    scope: 'global',
    tags: ['table', 'pagination'],
    isActive: true,
    version: 1
  },
  
  // Date Format
  {
    id: 'date-display-format',
    category: 'DATA_FORMAT',
    name: '日期显示格式',
    key: 'date-display-format',
    type: 'select',
    value: 'DD-MMM-YYYY',
    defaultValue: 'DD-MMM-YYYY',
    description: 'UI显示的日期格式',
    scope: 'global',
    tags: ['date', 'format'],
    validation: {
      enum: ['DD-MMM-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY']
    },
    isActive: true,
    version: 1
  },
  
  // Translation
  {
    id: 'i18n-common-save',
    category: 'I18N',
    name: '通用-保存按钮',
    key: 'i18n-common-save',
    type: 'json',
    value: {
      'zh-CN': '保存',
      'en-US': 'Save',
      'ms-MY': 'Simpan'
    },
    defaultValue: {
      'zh-CN': '保存',
      'en-US': 'Save',
      'ms-MY': 'Simpan'
    },
    description: '保存按钮的多语言翻译',
    scope: 'global',
    tags: ['i18n', 'button', 'common'],
    isActive: true,
    version: 1
  }
];

export const seedGlobalSettings = async () => {
  const batch = writeBatch(db);
  
  INITIAL_SETTINGS.forEach(setting => {
    const docRef = doc(db, GLOBAL_COLLECTIONS.GLOBAL_SETTINGS, setting.key);
    batch.set(docRef, {
      ...setting,
      lastModifiedBy: 'system',
      lastModifiedAt: new Date().toISOString()
    });
  });
  
  await batch.commit();
  console.log('Global settings seeded successfully');
};
```

### Implementation Checklist

To implement the Global Settings Management System, follow these steps:

#### Phase 1: Backend Setup
- [ ] Add `GLOBAL_SETTINGS` and `SETTING_CHANGE_LOGS` to `src/config/globalCollections.ts`
- [ ] Create `GlobalSettingDocument` type in `src/types/settings.ts`
- [ ] Implement `globalSettingsService.ts` in `src/modules/system/services/`
- [ ] Create seed script `src/scripts/seedGlobalSettings.ts`
- [ ] Run seed script to populate initial settings

#### Phase 2: Hook & Utilities
- [ ] Create `useGlobalSettings` hook in `src/hooks/`
- [ ] Implement CSS variable injector
- [ ] Add settings subscription mechanism
- [ ] Test hook with console logging

#### Phase 3: Management UI
- [ ] Create `GlobalSettingsManagementPage.tsx`
- [ ] Implement `ThemeSettingsPanel` component
- [ ] Implement `ComponentPresetsPanel` component
- [ ] Implement `DataFormatPanel` component
- [ ] Implement `ValidationPanel` component
- [ ] Implement `TranslationPanel` component
- [ ] Add live preview drawer

#### Phase 4: Integration
- [ ] Update existing components to use `useGlobalSettings`
- [ ] Replace hardcoded configs with dynamic settings
- [ ] Add permission checks for settings management page
- [ ] Test settings changes reflect in real-time

#### Phase 5: Documentation & Testing
- [ ] Document all setting keys in a reference table
- [ ] Create user guide for settings management
- [ ] Add unit tests for `globalSettingsService`
- [ ] Add E2E tests for settings page

### Best Practices

#### 1. Naming Convention Enforcement
```typescript
// Validator function
const validateSettingKey = (key: string): boolean => {
  const patterns = {
    theme: /^theme-[a-z-]+$/,
    component: /^(table|button|form|modal|list|card)-\d+-[a-z-]+$/,
    data: /^(date|number|currency|phone)-[a-z-]+-[a-z-]+$/,
    i18n: /^i18n-[a-z]+-[a-z-]+$/
  };
  
  return Object.values(patterns).some(pattern => pattern.test(key));
};
```

#### 2. Version Control
```typescript
// Track changes
interface SettingChangeLog {
  settingKey: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedAt: string;
  version: number;
}

// Auto-log changes
const logSettingChange = async (log: SettingChangeLog) => {
  await addDoc(collection(db, 'settingChangeLogs'), log);
};
```

#### 3. Environment-specific Settings
```typescript
// Support different values per environment
interface GlobalSettingDocument {
  // ... existing fields
  environments: {
    development?: any;
    staging?: any;
    production?: any;
  };
}

// Get value based on current environment
const getEnvironmentValue = (setting: GlobalSettingDocument) => {
  const env = import.meta.env.MODE;
  return setting.environments?.[env] ?? setting.value;
};
```

### Quick Reference: Pre-defined Setting Keys

#### Theme Settings (17 keys)
```typescript
'theme-primary-color'
'theme-success-color'
'theme-warning-color'
'theme-error-color'
'theme-info-color'
'theme-text-color'
'theme-text-secondary-color'
'theme-text-tertiary-color'
'theme-border-color'
'theme-background-color'
'theme-font-family'
'theme-font-size-base'
'theme-font-size-lg'
'theme-font-size-sm'
'theme-border-radius-base'
'theme-border-radius-lg'
'theme-border-radius-sm'
```

#### Component Presets (20+ keys)
```typescript
// Tables
'table-1-page-size'
'table-1-size'
'table-1-bordered'
'table-1-header-bg'
'table-2-page-size'    // For reports

// Buttons
'button-primary-bg'
'button-primary-hover-bg'
'button-secondary-bg'
'button-danger-bg'

// Forms
'form-1-layout'
'form-1-label-width'

// Modals
'modal-1-width'
'modal-1-centered'
'modal-2-width'        // For large content
```

#### Data Formats (15+ keys)
```typescript
// Date/Time
'date-display-format'
'date-api-format'
'date-filename-format'
'date-timezone'

// Numbers
'number-decimal-separator'
'number-decimal-places'

// Currency
'currency-my-symbol'
'currency-decimal-places'

// Phone
'phone-my-format'
'phone-cn-format'

// ID Formats
'member-id-format'
'transaction-id-format'
'event-id-format'
```

#### Translations (50+ keys)
```typescript
// Common
'i18n-common-save'
'i18n-common-cancel'
'i18n-common-delete'
'i18n-common-edit'
'i18n-common-create'
'i18n-common-search'

// Module-specific
'i18n-member-list-title'
'i18n-finance-transaction-create'
// ... and more
```

---

## 📊 User Activity Tracking System

### Overview
The system includes comprehensive user activity tracking for **audit trails, operation recovery, undo functionality, online user monitoring, and page view statistics**.

### 1. User Operation Logging (操作日志)

#### Purpose
- 🔍 **Audit Trail**: Track all user operations for compliance
- 🔙 **Recovery**: Restore data from operation history
- ↩️ **Undo/Redo**: Allow users to revert actions
- 🐛 **Debugging**: Investigate user-reported issues
- 📊 **Analytics**: Understand user behavior patterns

#### Data Model
```typescript
// Firestore Collection: userOperationLogs
interface UserOperationLog {
  id: string;                          // Unique log ID
  
  // User Context
  userId: string;                      // Operator ID
  userName: string;                    // Operator name
  userEmail: string;                   // Operator email
  userRole: string;                    // Operator role at time of action
  
  // Operation Details
  operation: OperationType;            // Type of operation
  module: string;                      // Module (member, finance, event, etc.)
  action: string;                      // Specific action (create, update, delete, etc.)
  targetType: string;                  // Target entity type (Member, Transaction, Event)
  targetId: string;                    // Target entity ID
  targetName?: string;                 // Target entity name (for display)
  
  // Data Snapshots
  beforeData?: any;                    // Data before operation (for undo)
  afterData?: any;                     // Data after operation (for redo)
  changes?: ChangeRecord[];            // Detailed field changes
  
  // Metadata
  timestamp: string;                   // ISO 8601 timestamp
  ipAddress?: string;                  // User IP address
  userAgent?: string;                  // Browser/device info
  sessionId?: string;                  // Session identifier
  
  // Recovery Support
  isReversible: boolean;               // Can this operation be undone?
  isReverted: boolean;                 // Has this been reverted?
  revertedAt?: string;                 // When was it reverted?
  revertedBy?: string;                 // Who reverted it?
  parentLogId?: string;                // If this is a revert, original log ID
  
  // Additional Context
  reason?: string;                     // User-provided reason
  notes?: string;                      // Additional notes
  tags: string[];                      // For filtering/searching
  severity: 'info' | 'warning' | 'critical'; // Operation importance
}

type OperationType = 
  | 'CREATE'           // Create new entity
  | 'UPDATE'           // Update existing entity
  | 'DELETE'           // Soft/hard delete
  | 'BATCH_CREATE'     // Bulk create
  | 'BATCH_UPDATE'     // Bulk update
  | 'BATCH_DELETE'     // Bulk delete
  | 'IMPORT'           // Data import
  | 'EXPORT'           // Data export
  | 'LOGIN'            // User login
  | 'LOGOUT'           // User logout
  | 'PERMISSION_CHANGE' // Permission modification
  | 'SETTINGS_CHANGE'  // Settings change
  | 'APPROVAL'         // Approve action
  | 'REJECTION'        // Reject action
  | 'CUSTOM';          // Custom operations

interface ChangeRecord {
  fieldName: string;                   // Field that changed
  fieldLabel: string;                  // Human-readable label
  oldValue: any;                       // Previous value
  newValue: any;                       // New value
  dataType: string;                    // Field data type
}
```

#### Service Implementation
```typescript
// src/services/operationLoggingService.ts

class OperationLoggingService {
  /**
   * Log a user operation
   */
  async logOperation(
    operation: Omit<UserOperationLog, 'id' | 'timestamp'>
  ): Promise<string> {
    const logEntry: UserOperationLog = {
      id: generateId(),
      ...operation,
      timestamp: new Date().toISOString(),
      tags: operation.tags || [],
      severity: operation.severity || 'info'
    };
    
    // Store in Firestore
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.USER_OPERATION_LOGS),
      cleanUndefinedValues(logEntry)
    );
    
    return docRef.id;
  }
  
  /**
   * Get operation logs with filters
   */
  async getOperationLogs(filters: {
    userId?: string;
    module?: string;
    operation?: OperationType;
    startDate?: string;
    endDate?: string;
    targetId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<UserOperationLog>> {
    const constraints: QueryConstraint[] = [];
    
    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }
    if (filters.module) {
      constraints.push(where('module', '==', filters.module));
    }
    if (filters.operation) {
      constraints.push(where('operation', '==', filters.operation));
    }
    if (filters.startDate) {
      constraints.push(where('timestamp', '>=', filters.startDate));
    }
    if (filters.endDate) {
      constraints.push(where('timestamp', '<=', filters.endDate));
    }
    
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(filters.limit || 50));
    
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.USER_OPERATION_LOGS),
      ...constraints
    );
    
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserOperationLog[];
    
    return {
      data: logs,
      total: snapshot.size,
      page: filters.page || 1,
      limit: filters.limit || 50,
      totalPages: Math.ceil(snapshot.size / (filters.limit || 50))
    };
  }
  
  /**
   * Undo an operation
   */
  async undoOperation(logId: string, undoneBy: string): Promise<void> {
    const logRef = doc(db, GLOBAL_COLLECTIONS.USER_OPERATION_LOGS, logId);
    const logSnap = await getDoc(logRef);
    
    if (!logSnap.exists()) {
      throw new Error('Operation log not found');
    }
    
    const log = logSnap.data() as UserOperationLog;
    
    if (!log.isReversible) {
      throw new Error('This operation cannot be undone');
    }
    
    if (log.isReverted) {
      throw new Error('This operation has already been reverted');
    }
    
    // Restore data to previous state
    if (log.beforeData) {
      const targetRef = doc(db, log.module, log.targetId);
      await updateDoc(targetRef, cleanUndefinedValues(log.beforeData));
    }
    
    // Mark as reverted
    await updateDoc(logRef, {
      isReverted: true,
      revertedAt: new Date().toISOString(),
      revertedBy: undoneBy
    });
    
    // Log the undo operation
    await this.logOperation({
      userId: undoneBy,
      userName: 'System',
      userEmail: '',
      userRole: 'admin',
      operation: 'CUSTOM',
      module: log.module,
      action: 'undo',
      targetType: log.targetType,
      targetId: log.targetId,
      afterData: log.beforeData,
      isReversible: false,
      isReverted: false,
      parentLogId: logId,
      tags: ['undo', 'system'],
      severity: 'warning'
    });
  }
  
  /**
   * Get operation history for a specific entity
   */
  async getEntityHistory(
    targetId: string,
    targetType: string
  ): Promise<UserOperationLog[]> {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.USER_OPERATION_LOGS),
      where('targetId', '==', targetId),
      where('targetType', '==', targetType),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserOperationLog[];
  }
  
  /**
   * Export operation logs
   */
  async exportLogs(
    filters: any,
    format: 'json' | 'csv'
  ): Promise<string> {
    const { data } = await this.getOperationLogs(filters);
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV export
      const headers = ['Timestamp', 'User', 'Module', 'Operation', 'Target', 'Action'];
      const rows = data.map(log => [
        log.timestamp,
        log.userName,
        log.module,
        log.operation,
        log.targetName || log.targetId,
        log.action
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }
}

export const operationLoggingService = new OperationLoggingService();
```

#### Automatic Logging Middleware
```typescript
// src/utils/operationLoggerMiddleware.ts

/**
 * HOC to automatically log operations
 */
export function withOperationLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: {
    module: string;
    operation: OperationType;
    targetType: string;
    getTargetId: (...args: Parameters<T>) => string;
    getBeforeData?: (...args: Parameters<T>) => Promise<any>;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const user = getCurrentUser(); // Get from auth store
    const targetId = config.getTargetId(...args);
    
    // Get data before operation (for undo support)
    const beforeData = config.getBeforeData 
      ? await config.getBeforeData(...args)
      : null;
    
    // Execute the actual operation
    const result = await fn(...args);
    
    // Log the operation
    await operationLoggingService.logOperation({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      operation: config.operation,
      module: config.module,
      action: fn.name,
      targetType: config.targetType,
      targetId,
      beforeData,
      afterData: result,
      isReversible: !!beforeData,
      isReverted: false,
      tags: [config.module, config.operation.toLowerCase()],
      severity: config.operation.includes('DELETE') ? 'critical' : 'info'
    });
    
    return result;
  }) as T;
}

// Usage example
const updateMemberWithLogging = withOperationLogging(
  memberService.updateMember,
  {
    module: 'member',
    operation: 'UPDATE',
    targetType: 'Member',
    getTargetId: (id: string) => id,
    getBeforeData: async (id: string) => await memberService.getMemberById(id)
  }
);
```

#### UI Component: Operation Log Viewer
```typescript
// src/modules/system/components/OperationLogViewer.tsx

const OperationLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<UserOperationLog[]>([]);
  const [filters, setFilters] = useState({});
  const [selectedLog, setSelectedLog] = useState<UserOperationLog | null>(null);
  
  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '用户',
      dataIndex: 'userName',
      render: (text: string, record: UserOperationLog) => (
        <Space>
          <Avatar>{text[0]}</Avatar>
          <div>
            <div>{text}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.userEmail}</Text>
          </div>
        </Space>
      )
    },
    {
      title: '模块',
      dataIndex: 'module',
      render: (text: string) => <Tag>{text}</Tag>
    },
    {
      title: '操作',
      dataIndex: 'operation',
      render: (text: OperationType) => {
        const colors: Record<string, string> = {
          CREATE: 'green',
          UPDATE: 'blue',
          DELETE: 'red',
          LOGIN: 'cyan',
          LOGOUT: 'default'
        };
        return <Tag color={colors[text] || 'default'}>{text}</Tag>;
      }
    },
    {
      title: '目标',
      dataIndex: 'targetName',
      render: (text: string, record: UserOperationLog) => (
        <div>
          <div>{text || record.targetId}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.targetType}</Text>
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: UserOperationLog) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => setSelectedLog(record)}
          >
            详情
          </Button>
          {record.isReversible && !record.isReverted && (
            <Popconfirm
              title="确定要撤销此操作吗？"
              onConfirm={() => handleUndo(record.id)}
            >
              <Button size="small" danger icon={<UndoOutlined />}>
                撤销
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];
  
  return (
    <Card title="用户操作日志">
      {/* Filters */}
      <Form layout="inline" onFinish={handleSearch}>
        <Form.Item name="userId" label="用户">
          <Select style={{ width: 200 }} allowClear>
            {/* User options */}
          </Select>
        </Form.Item>
        <Form.Item name="module" label="模块">
          <Select style={{ width: 150 }} allowClear>
            <Option value="member">会员管理</Option>
            <Option value="finance">财务管理</Option>
            <Option value="event">活动管理</Option>
          </Select>
        </Form.Item>
        <Form.Item name="operation" label="操作类型">
          <Select style={{ width: 150 }} allowClear>
            <Option value="CREATE">创建</Option>
            <Option value="UPDATE">更新</Option>
            <Option value="DELETE">删除</Option>
          </Select>
        </Form.Item>
        <Form.Item name="dateRange" label="时间范围">
          <RangePicker />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            搜索
          </Button>
        </Form.Item>
        <Form.Item>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出
          </Button>
        </Form.Item>
      </Form>
      
      {/* Table */}
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />
      
      {/* Detail Modal */}
      <Modal
        title="操作详情"
        visible={!!selectedLog}
        onCancel={() => setSelectedLog(null)}
        width={800}
        footer={null}
      >
        {selectedLog && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="操作ID">{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="时间">
              {dayjs(selectedLog.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="用户">{selectedLog.userName}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedLog.ipAddress}</Descriptions.Item>
            
            {/* Before/After Data Comparison */}
            {selectedLog.changes && (
              <Descriptions.Item label="变更内容" span={2}>
                <Table
                  size="small"
                  columns={[
                    { title: '字段', dataIndex: 'fieldLabel' },
                    { title: '修改前', dataIndex: 'oldValue' },
                    { title: '修改后', dataIndex: 'newValue' }
                  ]}
                  dataSource={selectedLog.changes}
                  pagination={false}
                />
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};
```

---

### 2. Online Users Monitoring (在线用户监控)

#### Purpose
- 📊 **Real-time Statistics**: See who's currently online
- 🚨 **Concurrent User Alerts**: Monitor system load
- 👥 **User Activity**: Track what users are doing
- 🔒 **Security**: Detect suspicious concurrent logins

#### Data Model
```typescript
// Firestore Collection: onlineUsers
interface OnlineUser {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  
  // Session Info
  sessionId: string;                   // Unique session ID
  loginTime: string;                   // ISO 8601
  lastActivityTime: string;            // ISO 8601
  
  // Device Info
  ipAddress: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  
  // Current Activity
  currentPage: string;                 // Current route
  currentModule: string;               // Current module
  currentAction?: string;              // What they're doing
  
  // Status
  status: 'active' | 'idle' | 'away';  // User status
  idleTime: number;                    // Seconds idle
}

// Firestore Collection: onlineUsersStats (singleton document)
interface OnlineUsersStats {
  id: 'stats';                         // Fixed ID
  currentOnlineCount: number;          // Real-time count
  peakOnlineCount: number;             // Peak count today
  peakOnlineTime: string;              // When peak occurred
  totalSessionsToday: number;          // Total sessions
  averageSessionDuration: number;      // Average in seconds
  lastUpdated: string;                 // ISO 8601
}
```

#### Service Implementation
```typescript
// src/services/onlineUsersService.ts

class OnlineUsersService {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionId: string = '';
  
  /**
   * Mark user as online
   */
  async markUserOnline(user: {
    userId: string;
    userName: string;
    userEmail: string;
  }): Promise<void> {
    this.sessionId = generateSessionId();
    
    const onlineUser: OnlineUser = {
      ...user,
      sessionId: this.sessionId,
      loginTime: new Date().toISOString(),
      lastActivityTime: new Date().toISOString(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      deviceType: this.getDeviceType(),
      browser: this.getBrowserName(),
      os: this.getOS(),
      currentPage: window.location.pathname,
      currentModule: this.getCurrentModule(),
      status: 'active',
      idleTime: 0
    };
    
    // Store in Firestore
    await setDoc(
      doc(db, GLOBAL_COLLECTIONS.ONLINE_USERS, this.sessionId),
      cleanUndefinedValues(onlineUser)
    );
    
    // Update stats
    await this.updateStats('increment');
    
    // Start heartbeat
    this.startHeartbeat();
  }
  
  /**
   * Mark user as offline
   */
  async markUserOffline(): Promise<void> {
    if (!this.sessionId) return;
    
    // Remove from online users
    await deleteDoc(doc(db, GLOBAL_COLLECTIONS.ONLINE_USERS, this.sessionId));
    
    // Update stats
    await this.updateStats('decrement');
    
    // Stop heartbeat
    this.stopHeartbeat();
  }
  
  /**
   * Start heartbeat to keep session alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (!this.sessionId) return;
      
      const docRef = doc(db, GLOBAL_COLLECTIONS.ONLINE_USERS, this.sessionId);
      
      await updateDoc(docRef, {
        lastActivityTime: new Date().toISOString(),
        currentPage: window.location.pathname,
        currentModule: this.getCurrentModule(),
        status: this.getUserStatus(),
        idleTime: this.getIdleTime()
      });
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Get all online users
   */
  async getOnlineUsers(): Promise<OnlineUser[]> {
    const snapshot = await getDocs(
      collection(db, GLOBAL_COLLECTIONS.ONLINE_USERS)
    );
    
    return snapshot.docs.map(doc => doc.data() as OnlineUser);
  }
  
  /**
   * Get online users count
   */
  async getOnlineCount(): Promise<number> {
    const snapshot = await getDocs(
      collection(db, GLOBAL_COLLECTIONS.ONLINE_USERS)
    );
    
    return snapshot.size;
  }
  
  /**
   * Subscribe to online users changes
   */
  subscribeToOnlineUsers(
    callback: (users: OnlineUser[]) => void
  ): () => void {
    const unsubscribe = onSnapshot(
      collection(db, GLOBAL_COLLECTIONS.ONLINE_USERS),
      (snapshot) => {
        const users = snapshot.docs.map(doc => doc.data() as OnlineUser);
        callback(users);
      }
    );
    
    return unsubscribe;
  }
  
  /**
   * Update statistics
   */
  private async updateStats(action: 'increment' | 'decrement'): Promise<void> {
    const statsRef = doc(db, GLOBAL_COLLECTIONS.ONLINE_USERS_STATS, 'stats');
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      // Initialize stats
      await setDoc(statsRef, {
        currentOnlineCount: action === 'increment' ? 1 : 0,
        peakOnlineCount: 1,
        peakOnlineTime: new Date().toISOString(),
        totalSessionsToday: 1,
        averageSessionDuration: 0,
        lastUpdated: new Date().toISOString()
      });
      return;
    }
    
    const stats = statsSnap.data() as OnlineUsersStats;
    const newCount = action === 'increment' 
      ? stats.currentOnlineCount + 1 
      : Math.max(0, stats.currentOnlineCount - 1);
    
    const updateData: Partial<OnlineUsersStats> = {
      currentOnlineCount: newCount,
      lastUpdated: new Date().toISOString()
    };
    
    // Update peak if necessary
    if (newCount > stats.peakOnlineCount) {
      updateData.peakOnlineCount = newCount;
      updateData.peakOnlineTime = new Date().toISOString();
    }
    
    if (action === 'increment') {
      updateData.totalSessionsToday = stats.totalSessionsToday + 1;
    }
    
    await updateDoc(statsRef, updateData);
  }
  
  /**
   * Cleanup stale sessions (run periodically)
   */
  async cleanupStaleSessions(): Promise<void> {
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    const snapshot = await getDocs(
      collection(db, GLOBAL_COLLECTIONS.ONLINE_USERS)
    );
    
    const batch = writeBatch(db);
    let staleCount = 0;
    
    snapshot.docs.forEach(doc => {
      const user = doc.data() as OnlineUser;
      const lastActivity = new Date(user.lastActivityTime).getTime();
      
      if (now - lastActivity > staleThreshold) {
        batch.delete(doc.ref);
        staleCount++;
      }
    });
    
    if (staleCount > 0) {
      await batch.commit();
      
      // Update stats
      const statsRef = doc(db, GLOBAL_COLLECTIONS.ONLINE_USERS_STATS, 'stats');
      await updateDoc(statsRef, {
        currentOnlineCount: increment(-staleCount)
      });
    }
  }
  
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }
  
  private getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }
  
  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }
  
  private getCurrentModule(): string {
    const path = window.location.pathname;
    if (path.includes('/members')) return 'member';
    if (path.includes('/finance')) return 'finance';
    if (path.includes('/events')) return 'event';
    return 'dashboard';
  }
  
  private getUserStatus(): 'active' | 'idle' | 'away' {
    const idleTime = this.getIdleTime();
    if (idleTime > 300) return 'away';  // 5 minutes
    if (idleTime > 60) return 'idle';   // 1 minute
    return 'active';
  }
  
  private getIdleTime(): number {
    // Implement idle time tracking
    return 0; // Placeholder
  }
  
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }
}

export const onlineUsersService = new OnlineUsersService();
```

#### UI Component: Online Users Monitor
```typescript
// src/components/OnlineUsersMonitor.tsx

const OnlineUsersMonitor: React.FC = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [stats, setStats] = useState<OnlineUsersStats | null>(null);
  
  useEffect(() => {
    // Subscribe to online users
    const unsubscribe = onlineUsersService.subscribeToOnlineUsers(setOnlineUsers);
    
    // Cleanup
    return unsubscribe;
  }, []);
  
  return (
    <Card title="在线用户" extra={<Badge count={onlineUsers.length} />}>
      <Statistic
        title="当前在线"
        value={onlineUsers.length}
        prefix={<UserOutlined />}
        suffix={<Text type="secondary">/ {stats?.peakOnlineCount} 峰值</Text>}
      />
      
      <Divider />
      
      <List
        dataSource={onlineUsers}
        renderItem={user => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar src={user.userAvatar}>{user.userName[0]}</Avatar>}
              title={user.userName}
              description={
                <Space split={<Divider type="vertical" />}>
                  <Text type="secondary">{user.currentModule}</Text>
                  <Text type="secondary">{user.deviceType}</Text>
                  <Badge
                    status={
                      user.status === 'active' ? 'success' :
                      user.status === 'idle' ? 'warning' : 'default'
                    }
                    text={user.status}
                  />
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};
```

---

### 3. Page View Statistics (网页浏览统计)

#### Purpose
- 📈 **Usage Analytics**: Track page popularity
- 🎯 **User Journey**: Understand navigation patterns
- ⏱️ **Performance Metrics**: Measure page load times
- 🔥 **Hot Spots**: Identify most visited features

#### Data Model
```typescript
// Firestore Collection: pageViews
interface PageView {
  id: string;
  
  // Page Info
  page: string;                        // Route path (e.g., /members)
  pageTitle: string;                   // Page title
  module: string;                      // Module name
  
  // User Info
  userId?: string;                     // If logged in
  userName?: string;
  sessionId: string;                   // Session identifier
  
  // Visit Details
  timestamp: string;                   // ISO 8601
  referrer?: string;                   // Previous page
  entryPage: boolean;                  // Is this entry point?
  exitPage: boolean;                   // Is this exit point?
  
  // Performance Metrics
  loadTime?: number;                   // Page load time (ms)
  timeOnPage?: number;                 // Time spent (seconds)
  
  // Device Info
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  screenResolution: string;
  
  // Interaction
  clicks: number;                      // Click count on page
  scrollDepth: number;                 // Max scroll percentage
}

// Firestore Collection: pageViewsStats
interface PageViewStats {
  page: string;                        // Page path
  date: string;                        // Date (YYYY-MM-DD)
  
  // Counts
  totalViews: number;                  // Total page views
  uniqueVisitors: number;              // Unique users
  
  // Metrics
  averageTimeOnPage: number;           // Average seconds
  averageLoadTime: number;             // Average ms
  bounceRate: number;                  // Percentage
  exitRate: number;                    // Percentage
  
  // Device Breakdown
  desktopViews: number;
  mobileViews: number;
  tabletViews: number;
  
  // Top Referrers
  topReferrers: Array<{ page: string; count: number }>;
}
```

#### Service Implementation
```typescript
// src/services/pageViewService.ts

class PageViewService {
  private currentPageView: PageView | null = null;
  private pageEntryTime: number = 0;
  
  /**
   * Track page view
   */
  async trackPageView(page: string, pageTitle: string): Promise<void> {
    // End previous page view
    if (this.currentPageView) {
      await this.endPageView();
    }
    
    const user = getCurrentUser();
    const sessionId = getSessionId();
    
    this.pageEntryTime = Date.now();
    
    this.currentPageView = {
      id: generateId(),
      page,
      pageTitle,
      module: this.getModuleFromPath(page),
      userId: user?.id,
      userName: user?.name,
      sessionId,
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
      entryPage: this.isEntryPage(),
      exitPage: false,
      deviceType: this.getDeviceType(),
      browser: this.getBrowserName(),
      os: this.getOS(),
      screenResolution: `${screen.width}x${screen.height}`,
      clicks: 0,
      scrollDepth: 0
    };
    
    // Track performance
    if (window.performance && window.performance.timing) {
      const perfData = window.performance.timing;
      this.currentPageView.loadTime = 
        perfData.loadEventEnd - perfData.navigationStart;
    }
    
    // Store in Firestore
    await addDoc(
      collection(db, GLOBAL_COLLECTIONS.PAGE_VIEWS),
      cleanUndefinedValues(this.currentPageView)
    );
    
    // Update stats
    await this.updatePageStats(page);
  }
  
  /**
   * End current page view
   */
  private async endPageView(): Promise<void> {
    if (!this.currentPageView) return;
    
    const timeOnPage = Math.floor((Date.now() - this.pageEntryTime) / 1000);
    
    const docRef = doc(db, GLOBAL_COLLECTIONS.PAGE_VIEWS, this.currentPageView.id);
    await updateDoc(docRef, {
      timeOnPage,
      exitPage: true
    });
    
    this.currentPageView = null;
  }
  
  /**
   * Track user interaction
   */
  trackClick(): void {
    if (this.currentPageView) {
      this.currentPageView.clicks++;
    }
  }
  
  trackScroll(scrollPercentage: number): void {
    if (this.currentPageView) {
      this.currentPageView.scrollDepth = Math.max(
        this.currentPageView.scrollDepth,
        scrollPercentage
      );
    }
  }
  
  /**
   * Get page views statistics
   */
  async getPageStats(
    startDate: string,
    endDate: string
  ): Promise<Record<string, PageViewStats>> {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.PAGE_VIEWS_STATS),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const snapshot = await getDocs(q);
    const stats: Record<string, PageViewStats> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as PageViewStats;
      if (!stats[data.page]) {
        stats[data.page] = data;
      } else {
        // Aggregate data
        stats[data.page].totalViews += data.totalViews;
        stats[data.page].uniqueVisitors += data.uniqueVisitors;
      }
    });
    
    return stats;
  }
  
  /**
   * Get most viewed pages
   */
  async getMostViewedPages(limit: number = 10): Promise<Array<{
    page: string;
    views: number;
  }>> {
    const today = dayjs().format('YYYY-MM-DD');
    
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.PAGE_VIEWS_STATS),
      where('date', '==', today),
      orderBy('totalViews', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data() as PageViewStats;
      return {
        page: data.page,
        views: data.totalViews
      };
    });
  }
  
  /**
   * Update page statistics
   */
  private async updatePageStats(page: string): Promise<void> {
    const today = dayjs().format('YYYY-MM-DD');
    const statsId = `${page.replace(/\//g, '_')}_${today}`;
    const statsRef = doc(db, GLOBAL_COLLECTIONS.PAGE_VIEWS_STATS, statsId);
    
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      // Create new stats
      await setDoc(statsRef, {
        page,
        date: today,
        totalViews: 1,
        uniqueVisitors: 1,
        averageTimeOnPage: 0,
        averageLoadTime: 0,
        bounceRate: 0,
        exitRate: 0,
        desktopViews: this.getDeviceType() === 'desktop' ? 1 : 0,
        mobileViews: this.getDeviceType() === 'mobile' ? 1 : 0,
        tabletViews: this.getDeviceType() === 'tablet' ? 1 : 0,
        topReferrers: []
      });
    } else {
      // Update existing stats
      await updateDoc(statsRef, {
        totalViews: increment(1),
        [`${this.getDeviceType()}Views`]: increment(1)
      });
    }
  }
  
  private getModuleFromPath(path: string): string {
    if (path.includes('/members')) return 'member';
    if (path.includes('/finance')) return 'finance';
    if (path.includes('/events')) return 'event';
    if (path.includes('/surveys')) return 'survey';
    if (path.includes('/awards')) return 'award';
    return 'system';
  }
  
  private isEntryPage(): boolean {
    return !document.referrer || 
           !document.referrer.includes(window.location.host);
  }
  
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    // Same implementation as onlineUsersService
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }
  
  private getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }
  
  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }
}

export const pageViewService = new PageViewService();
```

#### UI Component: Analytics Dashboard
```typescript
// src/modules/system/pages/AnalyticsDashboard.tsx

const AnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const [mostViewed, setMostViewed] = useState<Array<{ page: string; views: number }>>([]);
  
  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);
  
  const loadAnalytics = async () => {
    const data = await pageViewService.getMostViewedPages(10);
    setMostViewed(data);
  };
  
  return (
    <div>
      <PageHeader title="系统分析" />
      
      <Row gutter={[16, 16]}>
        {/* Overview Cards */}
        <Col span={6}>
          <Card>
            <Statistic
              title="总浏览量"
              value={12345}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="独立访客"
              value={987}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均停留时间"
              value={234}
              suffix="秒"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="跳出率"
              value={23.5}
              suffix="%"
              prefix={<ExportOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Most Viewed Pages */}
        <Col span={12}>
          <Card title="最受欢迎页面">
            <List
              dataSource={mostViewed}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar>{index + 1}</Avatar>}
                    title={item.page}
                    description={`${item.views} 次浏览`}
                  />
                  <Progress
                    percent={
                      (item.views / mostViewed[0]?.views) * 100
                    }
                    showInfo={false}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        {/* Device Breakdown */}
        <Col span={12}>
          <Card title="设备分布">
            <Pie
              data={[
                { type: '桌面', value: 60 },
                { type: '移动', value: 30 },
                { type: '平板', value: 10 }
              ]}
              angleField="value"
              colorField="type"
            />
          </Card>
        </Col>
      </Row>
      
      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="浏览趋势">
            <Line
              data={/* trend data */}
              xField="date"
              yField="views"
              smooth
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
```

---

### Integration

#### App.tsx Integration
```typescript
// src/App.tsx

const App: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  
  useEffect(() => {
    if (user) {
      // Mark user as online
      onlineUsersService.markUserOnline({
        userId: user.id,
        userName: user.name,
        userEmail: user.email
      });
      
      // Cleanup on unmount
      return () => {
        onlineUsersService.markUserOffline();
      };
    }
  }, [user]);
  
  useEffect(() => {
    // Track page views
    if (user) {
      const pageTitle = document.title;
      pageViewService.trackPageView(location.pathname, pageTitle);
    }
  }, [location.pathname, user]);
  
  // Track clicks
  useEffect(() => {
    const handleClick = () => pageViewService.trackClick();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  
  // Track scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const total = document.body.scrollHeight - window.innerHeight;
      const percentage = (scrolled / total) * 100;
      pageViewService.trackScroll(percentage);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    // ... rest of app
  );
};
```

#### Database Collections Update
```typescript
// src/config/globalCollections.ts

export const GLOBAL_COLLECTIONS = {
  // ... existing collections
  
  // Activity Tracking
  USER_OPERATION_LOGS: 'userOperationLogs',
  ONLINE_USERS: 'onlineUsers',
  ONLINE_USERS_STATS: 'onlineUsersStats',
  PAGE_VIEWS: 'pageViews',
  PAGE_VIEWS_STATS: 'pageViewsStats'
} as const;
```

---

## 🔗 Business Rules & Matching Logic (关键业务规则)

### Overview
This section documents **critical business logic** for matching transactions, member fees, event pricing, and member category requirements. These rules are **ESSENTIAL** for maintaining data integrity and business workflow consistency.

---

### 1. Transaction ↔ Member Fee Matching (交易记录与会员费匹配)

#### Purpose
Automatically identify and link transaction records to specific member accounts for membership fee payments (新会员费 vs 续费).

#### Data Structure
```typescript
// In Transaction interface
interface Transaction {
  // ... other fields
  
  membershipFeeData?: {
    matchedAccountIds: string[];          // 匹配的会员户口系统ID列表
    matchedAt: string;                    // 匹配时间
    matchedBy: string;                    // 匹配人
    membershipType: 'renewal' | 'new' | 'mixed'; // 会员类型
    renewalAccountIds?: string[];         // 续费会员ID列表
    newAccountIds?: string[];             // 新会员ID列表
  };
}
```

#### Matching Rules
```typescript
// Business Logic: How to match transactions to member accounts

interface MembershipFeeMatchingRules {
  // Rule 1: Transaction Purpose Identification
  identificationKeywords: {
    new_member: ['新会员费', '2025新会员费', 'New Member Fee'],
    renewal: ['续费会员费', '2025续费会员费', 'Renewal Fee'],
    associate: ['准会员费', 'Associate Member Fee'],
    visiting: ['访问会员费', 'Visiting Member Fee']
  };
  
  // Rule 2: Amount Matching
  standardFees: {
    official_member_new: 480,           // 正式会员新会员费
    official_member_renewal: 350,       // 正式会员续费
    associate_member: 250,              // 准会员费用
    visiting_member: 100,               // 访问会员费用
    honorary_member: 0                  // 荣誉会员免费
  };
  
  // Rule 3: Payment Date Range Validation
  validPaymentPeriod: {
    start: 'YYYY-10-01',                // 财政年开始
    end: 'YYYY+1-09-30'                 // 财政年结束
  };
  
  // Rule 4: Auto-matching Algorithm
  autoMatchSteps: [
    '1. Check transaction purpose matches fee keywords',
    '2. Verify amount matches standard fee table',
    '3. Check payment date within fiscal year',
    '4. Match payer name to member database',
    '5. Update transaction.membershipFeeData',
    '6. Update member.profile.paymentVerifiedDate',
    '7. Log matching operation'
  ];
}
```

#### Implementation Example
```typescript
// src/modules/finance/utils/membershipFeeMatching.ts

export const matchTransactionToMemberFee = async (
  transaction: Transaction
): Promise<MembershipFeeMatchResult> => {
  // Step 1: Identify membership fee type
  const feeType = identifyMembershipFeeType(transaction.transactionPurpose);
  if (!feeType) return { matched: false };
  
  // Step 2: Get candidate members
  const candidates = await findCandidateMembers({
    payerName: transaction.payerPayee,
    feeType,
    amount: transaction.income,
    paymentDate: transaction.transactionDate
  });
  
  // Step 3: Match by name similarity and amount
  const matches = candidates.filter(member => {
    const nameMatch = calculateNameSimilarity(
      transaction.payerPayee, 
      member.name
    ) > 0.8;
    
    const amountMatch = Math.abs(
      transaction.income - getExpectedFee(member.accountType, feeType)
    ) < 10; // ±10 tolerance
    
    return nameMatch && amountMatch;
  });
  
  // Step 4: Update transaction
  if (matches.length > 0) {
    await updateDoc(doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, transaction.id), {
      membershipFeeData: {
        matchedAccountIds: matches.map(m => m.id),
        matchedAt: new Date().toISOString(),
        matchedBy: getCurrentUser().id,
        membershipType: feeType === 'new' ? 'new' : 'renewal',
        renewalAccountIds: feeType === 'renewal' ? matches.map(m => m.id) : [],
        newAccountIds: feeType === 'new' ? matches.map(m => m.id) : []
      }
    });
    
    // Step 5: Update member payment status
    for (const member of matches) {
      await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, member.id), {
        'profile.paymentVerifiedDate': transaction.transactionDate,
        'profile.paymentSlipUrl': transaction.attachments?.[0],
        status: 'active'
      });
    }
    
    return { matched: true, memberIds: matches.map(m => m.id) };
  }
  
  return { matched: false };
};
```

---

### 2. Event Pricing ↔ Member Category (活动费用与会员类别匹配)

#### Multi-tier Pricing System
```typescript
interface EventPricingRules {
  // Price tiers based on member category
  pricingTiers: {
    regularPrice: number;               // 非会员价格（最高）
    earlyBirdPrice?: number;            // 早鸟价格（限时）
    memberPrice?: number;               // JCI会员价格
    alumniPrice?: number;               // JCI校友价格
    committeePrice?: number;            // 委员会成员价格（可能免费）
  };
  
  // Member category mapping to pricing tier
  categoryPriceMapping: {
    'official_member': 'memberPrice',      // 正式会员
    'associate_member': 'memberPrice',     // 准会员
    'honorary_member': 'memberPrice',      // 荣誉会员
    'affiliate_member': 'memberPrice',     // 附属会员
    'visiting_member': 'alumniPrice',      // 访问会员（校友价）
    'alumni': 'alumniPrice',               // 校友
    'guest': 'regularPrice'                // 访客（标准价）
  };
  
  // Early bird conditions
  earlyBirdRules: {
    enabled: boolean;
    deadlineType: 'fixed_date' | 'days_before';
    fixedDate?: string;                    // Fixed deadline
    daysBefore?: number;                   // N days before event
    limitedSeats?: number;                 // Limited slots
  };
  
  // Special pricing rules
  specialRules: {
    committee_free: boolean;               // 委员会成员免费
    multiple_tickets_discount: {
      enabled: boolean;
      minQuantity: number;                 // 最少购买数量
      discountPercentage: number;          // 折扣百分比
    };
    group_discount: {
      enabled: boolean;
      minGroupSize: number;
      discountPercentage: number;
    };
  };
}
```

#### Price Calculation Algorithm
```typescript
// src/modules/event/utils/pricingCalculator.ts

export const calculateEventPrice = (
  event: Event,
  member: Member,
  ticketQuantity: number = 1
): {
  originalPrice: number;
  finalPrice: number;
  appliedDiscount: string;
  breakdown: PriceBreakdown;
} => {
  // Step 1: Determine base price tier
  let basePrice = event.regularPrice || 0;
  let appliedTier = 'regular';
  
  if (member) {
    const memberCategory = member.profile?.membershipCategory || 'guest';
    
    // Check if member is committee
    if (event.committeeMembers?.some(c => c.fullName === member.name)) {
      basePrice = 0;
      appliedTier = 'committee_free';
    }
    // Check member price
    else if (event.memberPrice && isMemberCategory(memberCategory)) {
      basePrice = event.memberPrice;
      appliedTier = 'member';
    }
    // Check alumni price
    else if (event.alumniPrice && isAlumniCategory(memberCategory)) {
      basePrice = event.alumniPrice;
      appliedTier = 'alumni';
    }
  }
  
  // Step 2: Apply early bird discount
  const now = new Date();
  const registrationEnd = event.registrationEndDate?.toDate();
  
  if (event.earlyBirdPrice && registrationEnd && now < registrationEnd) {
    if (event.earlyBirdPrice < basePrice) {
      basePrice = event.earlyBirdPrice;
      appliedTier = 'early_bird';
    }
  }
  
  // Step 3: Apply quantity discount
  let discount = 0;
  if (ticketQuantity >= 5) {
    discount = 0.1; // 10% discount for 5+ tickets
    appliedTier += '_bulk';
  }
  
  const finalPrice = basePrice * ticketQuantity * (1 - discount);
  
  return {
    originalPrice: (event.regularPrice || 0) * ticketQuantity,
    finalPrice,
    appliedDiscount: appliedTier,
    breakdown: {
      basePrice,
      quantity: ticketQuantity,
      discountPercentage: discount * 100,
      discountAmount: basePrice * ticketQuantity * discount
    }
  };
};

// Helper functions
const isMemberCategory = (category: string): boolean => {
  return ['official_member', 'associate_member', 'honorary_member', 'affiliate_member']
    .includes(category);
};

const isAlumniCategory = (category: string): boolean => {
  return ['visiting_member', 'alumni'].includes(category);
};
```

---

### 3. Member Category ↔ Task Requirements (会员类别与任务要求匹配)

#### Category Task Policy System
```typescript
// Stored in: membership_task_policies collection

interface MembershipTaskPolicy {
  id: string;
  name: string;                          // Policy name
  description?: string;
  isEnabled: boolean;
  
  // Target member categories
  target: {
    type: 'accountType' | 'membershipCategory';
    values: string[];                    // e.g., ['official_member', 'associate_member']
  };
  
  // Required tasks to complete
  requirements: TaskRequirement[];
  
  createdAt: string;
  updatedAt: string;
}

type TaskRequirement = 
  | {
      type: 'event_participation';       // 活动参与
      anyType: boolean;                  // Any event or specific?
      specificTypes?: string;            // 'meeting,training'
      minCount: number;                  // Minimum participation count
    }
  | {
      type: 'course_completion';         // 课程完成
      specificTypes?: string;
      minCount: number;
    }
  | {
      type: 'committee_role';            // 委员会职位
      minCount: number;                  // At least 1
    };
```

#### Pre-defined Task Policies
```typescript
// Default task policies for different member categories

const DEFAULT_TASK_POLICIES = {
  // 正式会员任务要求
  official_member: {
    name: '正式会员任务要求',
    target: { type: 'accountType', values: ['official_member'] },
    requirements: [
      {
        type: 'event_participation',
        anyType: false,
        specificTypes: 'meeting',
        minCount: 3                      // 至少参加3次会议
      },
      {
        type: 'course_completion',
        anyType: true,
        minCount: 1                      // 至少完成1门课程
      },
      {
        type: 'committee_role',
        minCount: 1                      // 至少担任1个委员会职位
      }
    ]
  },
  
  // 准会员任务要求
  associate_member: {
    name: '准会员任务要求',
    target: { type: 'accountType', values: ['associate_member'] },
    requirements: [
      {
        type: 'event_participation',
        anyType: true,
        minCount: 2                      // 至少参加2次活动
      }
    ]
  },
  
  // 访问会员（无任务要求）
  visiting_member: {
    name: '访问会员任务要求',
    target: { type: 'accountType', values: ['visiting_member'] },
    requirements: []                     // No requirements
  }
};
```

#### Task Completion Tracking
```typescript
// In Member.profile

interface MemberProfile {
  // ... other fields
  
  taskCompletions?: Array<{
    taskId: string;
    title: string;
    type: 'event_participation' | 'committee_role' | 'course_completion';
    completed: boolean;
    completedAt?: string;
    metadata?: {
      eventId?: string;
      eventName?: string;
      courseId?: string;
      courseName?: string;
      roleId?: string;
      roleName?: string;
    };
  }>;
  
  requiredTasksCompleted?: boolean;      // Overall completion flag
}
```

#### Task Validation Service
```typescript
// src/modules/member/services/taskValidationService.ts

export const validateMemberTasks = async (
  memberId: string
): Promise<{
  isCompleted: boolean;
  requiredTasks: TaskRequirement[];
  completedTasks: TaskRequirement[];
  missingTasks: TaskRequirement[];
}> => {
  // 1. Get member data
  const member = await getMemberById(memberId);
  if (!member) throw new Error('Member not found');
  
  // 2. Get applicable task policy
  const policy = await getTaskPolicyForMember(member.accountType);
  if (!policy || policy.requirements.length === 0) {
    return {
      isCompleted: true,
      requiredTasks: [],
      completedTasks: [],
      missingTasks: []
    };
  }
  
  // 3. Check each requirement
  const completedTasks: TaskRequirement[] = [];
  const missingTasks: TaskRequirement[] = [];
  
  for (const requirement of policy.requirements) {
    const isCompleted = await checkTaskCompletion(member, requirement);
    
    if (isCompleted) {
      completedTasks.push(requirement);
    } else {
      missingTasks.push(requirement);
    }
  }
  
  return {
    isCompleted: missingTasks.length === 0,
    requiredTasks: policy.requirements,
    completedTasks,
    missingTasks
  };
};

// Check specific task completion
const checkTaskCompletion = async (
  member: Member,
  requirement: TaskRequirement
): Promise<boolean> => {
  const completions = member.profile?.taskCompletions || [];
  
  switch (requirement.type) {
    case 'event_participation': {
      const relevantCompletions = completions.filter(c => 
        c.type === 'event_participation' &&
        c.completed &&
        (requirement.anyType || requirement.specificTypes?.includes(c.metadata?.eventId || ''))
      );
      return relevantCompletions.length >= requirement.minCount;
    }
    
    case 'committee_role': {
      const roleCompletions = completions.filter(c =>
        c.type === 'committee_role' && c.completed
      );
      return roleCompletions.length >= requirement.minCount;
    }
    
    case 'course_completion': {
      const courseCompletions = completions.filter(c =>
        c.type === 'course_completion' && c.completed
      );
      return courseCompletions.length >= requirement.minCount;
    }
    
    default:
      return false;
  }
};
```

---

### 4. Budget ↔ Transaction Category Mapping (预算与交易分类映射)

#### Mapping Rules
```typescript
// src/modules/finance/services/budgetActualService.ts

const BUDGET_TO_TRANSACTION_MAPPING: Record<BudgetSubCategory, string[]> = {
  // Income Sub-categories
  'membership_subscription': [
    '会员费', 'membership', 'subscription', '会员订阅',
    '新会员费', '续费会员费', '准会员费', '访问会员费'
  ],
  'external_funding': [
    '赞助', 'sponsor', '资助', 'funding', '外部资助', 'donation'
  ],
  'project_surplus': [
    '项目', 'project', '盈余', 'surplus', '项目盈余',
    '项目收入', 'registration_fee'
  ],
  'project_floating_funds': [
    '浮动资金', 'floating', '项目浮动'
  ],
  'other_income': [
    '其他收入', 'other', '杂项收入', '银行利息', 'bank interest'
  ],
  
  // Expense Sub-categories
  'administrative_management': [
    '行政', 'administrative', '管理', 'management', '办公',
    '办公支出', 'office_expense', '审计费', '电费', '网络费'
  ],
  'projects': [
    '项目', 'project', '活动', 'event', '项目支出', 'event_expense'
  ],
  'convention_reception': [
    '大会', 'convention', '接待', 'reception', '会议', 'meeting'
  ],
  'merchandise': [
    '商品', 'merchandise', '采购', 'purchase', '物品', '制服', 'uniform'
  ],
  'pre_purchase_tickets': [
    '预购', 'pre-purchase', '门票', 'ticket', '预订', 'booking'
  ]
};
```

#### Auto-categorization Algorithm
```typescript
// Automatically categorize transactions when importing

export const categorizeTransaction = (transaction: {
  mainDescription: string;
  subDescription?: string;
  income: number;
  expense: number;
}): {
  suggestedCategory: BudgetSubCategory;
  confidence: number;
  matchedKeywords: string[];
} => {
  const fullText = (
    transaction.mainDescription + ' ' + 
    (transaction.subDescription || '')
  ).toLowerCase();
  
  let bestMatch: {
    category: BudgetSubCategory;
    score: number;
    keywords: string[];
  } = {
    category: 'other_income',
    score: 0,
    keywords: []
  };
  
  // Check each category
  for (const [category, keywords] of Object.entries(BUDGET_TO_TRANSACTION_MAPPING)) {
    const matches = keywords.filter(kw => fullText.includes(kw.toLowerCase()));
    const score = matches.length / keywords.length;
    
    if (score > bestMatch.score) {
      bestMatch = {
        category: category as BudgetSubCategory,
        score,
        keywords: matches
      };
    }
  }
  
  return {
    suggestedCategory: bestMatch.category,
    confidence: bestMatch.score,
    matchedKeywords: bestMatch.keywords
  };
};
```

---

### 5. Member Category Workflow (会员分类审核工作流)

#### Category Status Flow
```
用户注册
  ↓
Member.status = 'pending'
  ↓
[系统或管理员] 分配初始分类
  ↓
Member.profile.proposedMembershipCategory = 'official_member'
Member.profile.categoryReviewStatus = 'pending'
  ↓
[理事团审核]
  ↓
→ 批准: categoryReviewStatus = 'approved'
  Member.accountType = proposedMembershipCategory
  Member.status = 'active'
  
→ 拒绝: categoryReviewStatus = 'rejected'
  需重新提交或调整分类
```

#### Category Review Data
```typescript
interface CategoryReviewData {
  // In Member.profile
  proposedMembershipCategory?: 'active' | 'associate' | 'honorary' | 
                                'affiliate' | 'visitor' | 'alumni';
  categoryReviewStatus?: 'pending' | 'approved' | 'rejected';
  categoryReviewNotes?: string;
  categoryReviewerId?: string;
  categoryReviewedAt?: string;
  
  // Task completion check
  requiredTasksCompleted?: boolean;
}
```

#### Category Assignment Rules
```typescript
const CATEGORY_ASSIGNMENT_RULES = {
  // 正式会员 (Official Member)
  official_member: {
    requirements: {
      age: { min: 18, max: 40 },         // 年龄限制
      fee: 480,                          // 新会员费
      renewalFee: 350,                   // 续费
      tasks: {
        events: 3,                       // 至少参加3次活动
        courses: 1,                      // 完成1门课程
        committee: 1                     // 担任1个职位
      },
      voting_rights: true,               // 有投票权
      can_hold_position: true            // 可担任职位
    }
  },
  
  // 准会员 (Associate Member)
  associate_member: {
    requirements: {
      age: { min: 18, max: 40 },
      fee: 250,
      tasks: {
        events: 2                        // 至少参加2次活动
      },
      voting_rights: false,              // 无投票权
      can_hold_position: false           // 不可担任职位
    }
  },
  
  // 荣誉会员 (Honorary Member)
  honorary_member: {
    requirements: {
      nomination_required: true,         // 需要提名
      board_approval: true,              // 需理事会批准
      fee: 0,                            // 免费
      tasks: {},                         // 无任务要求
      voting_rights: true,
      can_hold_position: false
    }
  },
  
  // 访问会员 (Visiting Member)
  visiting_member: {
    requirements: {
      from_other_chapter: true,          // 必须来自其他分会
      original_chapter_verification: true, // 需原分会验证
      fee: 100,
      max_duration_months: 6,            // 最多访问6个月
      tasks: {},
      voting_rights: false,
      can_hold_position: false
    }
  }
};
```

---

### 6. Transaction Purpose Hierarchy (交易用途三层结构)

#### 3-Tier Purpose System
```typescript
// Level 0: Main Categories (主分类)
const MAIN_CATEGORIES = [
  { name: '收入类', category: 'income', level: 0 },
  { name: '支出类', category: 'expense', level: 0 },
  { name: '其他账户', category: 'other_account', level: 0 }
];

// Level 1: Business Categories (业务分类)
const BUSINESS_CATEGORIES = {
  // Under '收入类'
  income_subcategories: [
    { name: '会员费', category: 'membership_fee', level: 1, parent: '收入类' },
    { name: '项目收入', category: 'registration_fee', level: 1, parent: '收入类' },
    { name: '赞助收入', category: 'donation', level: 1, parent: '收入类' },
    { name: '其他收入', category: 'other', level: 1, parent: '收入类' }
  ],
  
  // Under '支出类'
  expense_subcategories: [
    { name: '办公支出', category: 'office_expense', level: 1, parent: '支出类' },
    { name: '项目支出', category: 'event_expense', level: 1, parent: '支出类' },
    { name: '差旅费', category: 'travel_expense', level: 1, parent: '支出类' },
    { name: '其他支出', category: 'other', level: 1, parent: '支出类' }
  ]
};

// Level 2: Specific Purposes (具体用途)
const SPECIFIC_PURPOSES = {
  // Under '会员费'
  membership_fees: [
    { name: '2025新会员费', level: 2, parent: '会员费' },
    { name: '2025续费会员费', level: 2, parent: '会员费' },
    { name: '准会员费', level: 2, parent: '会员费' },
    { name: '访问会员费', level: 2, parent: '会员费' }
  ],
  
  // Under '项目收入'
  project_income: [
    { name: '2022项目', level: 2, parent: '项目收入' },
    { name: '2023项目', level: 2, parent: '项目收入' },
    { name: '2024项目', level: 2, parent: '项目收入' },
    { name: '2025项目', level: 2, parent: '项目收入' }
  ],
  
  // Under '办公支出'
  office_expenses: [
    { name: '审计费', level: 2, parent: '办公支出' },
    { name: '电费', level: 2, parent: '办公支出' },
    { name: '网络费', level: 2, parent: '办公支出' },
    { name: '租金', level: 2, parent: '办公支出' }
  ]
};
```

#### Navigation Logic
```typescript
// User selects purpose in cascading dropdowns

Step 1: Select Main Category
  → 收入类 / 支出类 / 其他账户

Step 2: Select Business Category
  → 会员费 / 项目收入 / 赞助收入 / ...

Step 3: Select Specific Purpose
  → 2025新会员费 / 2025续费会员费 / ...
  
Final: transaction.transactionPurpose = purposeId
```

---

### 7. Fiscal Year Calculation Rules (财政年度计算规则)

#### Fiscal Year Definition
```typescript
const FISCAL_YEAR_RULES = {
  startMonth: 10,                        // October
  startDay: 1,
  endMonth: 9,                           // September
  endDay: 30,
  
  // Example:
  // FY 2024 = 2024-10-01 to 2025-09-30
  // FY 2025 = 2025-10-01 to 2026-09-30
};

// Calculate fiscal year from date
export const getFiscalYear = (date: Date | string): number => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  
  if (month >= 10) {
    return year;                         // Oct-Dec → Current year
  } else {
    return year - 1;                     // Jan-Sep → Previous year
  }
};

// Example:
// 2024-11-15 → FY 2024
// 2025-03-20 → FY 2024
// 2025-10-05 → FY 2025
```

---

### 8. Transaction Number Generation Rules (交易记录序号规则)

#### Format Specification
```
Pattern: TXN-{YYYY}-{ACCT}-{SEQ}

Components:
- TXN: Fixed prefix
- YYYY: Fiscal year (4 digits)
- ACCT: Last 4 digits of bank account number (padded with 0)
- SEQ: Sequential number within year/account (4 digits, starts at 0001)

Examples:
- TXN-2024-1234-0001  // First transaction of account ending in 1234 in FY2024
- TXN-2024-1234-0002  // Second transaction
- TXN-2025-5678-0001  // First transaction of another account in FY2025
```

#### Generation Algorithm
```typescript
// src/modules/finance/utils/transactionNumberGenerator.ts

export const generateTransactionNumber = async (
  bankAccountId: string,
  transactionDate: string
): Promise<string> => {
  // 1. Get fiscal year
  const fiscalYear = getFiscalYear(transactionDate);
  
  // 2. Get bank account
  const bankAccount = await getBankAccount(bankAccountId);
  const accountNumber = bankAccount.accountNumber || '0000';
  const lastFourDigits = accountNumber.slice(-4).padStart(4, '0');
  
  // 3. Query existing transactions for this account/year
  const prefix = `TXN-${fiscalYear}-${lastFourDigits}-`;
  const existingQuery = query(
    collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
    where('bankAccountId', '==', bankAccountId),
    where('transactionNumber', '>=', prefix),
    where('transactionNumber', '<', `TXN-${fiscalYear + 1}`)
  );
  
  const snapshot = await getDocs(existingQuery);
  
  // 4. Find highest sequence number
  let maxSeq = 0;
  snapshot.docs.forEach(doc => {
    const txnNumber = doc.data().transactionNumber;
    if (txnNumber && txnNumber.startsWith(prefix)) {
      const seqPart = txnNumber.substring(prefix.length);
      const seq = parseInt(seqPart, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });
  
  // 5. Generate new number
  const newSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `${prefix}${newSeq}`;
};
```

---

### 9. Event Registration → Transaction Flow (活动报名到交易记录流程)

#### Workflow
```
Step 1: User registers for event
  → EventRegistrationForm submitted
  
Step 2: Registration created with status='pending'
  → EventRegistration stored in Firestore
  → Includes: selectedTicket, calculatedPrice, paymentProof
  
Step 3: Admin reviews registration
  → Verify payment proof
  → Check member category
  → Validate price correctness
  
Step 4: Admin approves registration
  → EventRegistration.status = 'approved'
  → Auto-create Transaction record
  
Step 5: Transaction created
  → Transaction.income = registrationAmount
  → Transaction.transactionPurpose = '2025项目' (year-based)
  → Transaction.projectAccountId = event.projectAccountId
  → Transaction.payerPayee = registrant.userName
  → Transaction.mainDescription = `活动报名 - ${event.title}`
  
Step 6: Update bank account balance
  → bankAccount.currentBalance += transaction.income
```

#### Implementation
```typescript
// Auto-create transaction when approving registration

export const approveRegistrationAndCreateTransaction = async (
  registrationId: string,
  approvedBy: string
): Promise<string> => {
  // 1. Get registration data
  const registration = await getEventRegistration(registrationId);
  const event = await getEvent(registration.eventId);
  
  // 2. Update registration status
  await updateDoc(
    doc(db, GLOBAL_COLLECTIONS.EVENT_REGISTRATIONS, registrationId),
    {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy
    }
  );
  
  // 3. Create transaction record
  const fiscalYear = getFiscalYear(new Date());
  const transactionData: Omit<Transaction, 'id'> = {
    transactionNumber: await generateTransactionNumber(
      event.projectAccount?.bankAccountId,
      new Date().toISOString()
    ),
    bankAccountId: event.projectAccount?.bankAccountId,
    transactionDate: new Date().toISOString(),
    mainDescription: `活动报名 - ${event.title}`,
    subDescription: `报名人: ${registration.userName}`,
    income: registration.amount,
    expense: 0,
    payerPayee: registration.userName,
    transactionPurpose: `${fiscalYear}项目`,
    projectAccountId: event.projectAccountId,
    inputBy: approvedBy,
    notes: `关联报名ID: ${registrationId}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const transactionRef = await addDoc(
    collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
    cleanUndefinedValues(transactionData)
  );
  
  // 4. Update bank account balance
  await updateBankAccountBalance(
    event.projectAccount?.bankAccountId,
    registration.amount,
    'increment'
  );
  
  return transactionRef.id;
};
```

---

### 10. Member Fee Payment Verification Workflow

#### Complete Flow
```
Step 1: Member pays membership fee
  → Bank transfer to JCI account
  
Step 2: Treasurer records transaction
  → Create Transaction with:
    - transactionPurpose: '2025新会员费' or '2025续费会员费'
    - income: fee amount (480 for new, 350 for renewal)
    - payerPayee: member name
    - attachments: [payment slip URL]
  
Step 3: Auto-matching (optional)
  → System tries to match transaction to member
  → Based on: name similarity + fee amount + payment date
  → Update transaction.membershipFeeData
  
Step 4: Manual matching (if auto fails)
  → Treasurer views unmatched transactions
  → Manually select member(s)
  → Confirm match
  
Step 5: Update member status
  → member.profile.paymentVerifiedDate = transaction.date
  → member.profile.paymentSlipUrl = transaction.attachments[0]
  → member.status = 'active' (if all requirements met)
  
Step 6: Task completion check
  → Run validateMemberTasks(memberId)
  → Update member.profile.requiredTasksCompleted
  
Step 7: Final approval (if tasks completed)
  → Board reviews and approves
  → member.profile.categoryReviewStatus = 'approved'
  → member.accountType = proposedMembershipCategory
```

---

### Summary: Critical Business Rules

| Rule Category | Key Points | Impact |
|--------------|------------|--------|
| **Member Fee Matching** | Auto-match based on name + amount + date | Automates payment verification |
| **Event Pricing** | 4-tier pricing based on member category | Fair pricing for different members |
| **Category Tasks** | Different categories have different requirements | Ensures member qualification |
| **Budget Mapping** | Keywords map transactions to budget categories | Auto-categorization for reporting |
| **Fiscal Year** | Oct 1 - Sep 30 | All financial calculations |
| **Transaction Numbering** | Sequential by account + year | Unique identifiers |
| **Approval Workflows** | Multi-step approval for key operations | Audit trail and control |

---

### 11. Awards System ↔ Member Activity Matching (奖励系统与会员活动匹配)

#### Purpose
Track member activities and automatically calculate award scores based on participation and achievements.

#### Award Types
```typescript
// 4 Main Award Systems
type AwardSystemType = 
  | 'efficient_star'              // 效率之星
  | 'star_point'                  // 星点奖
  | 'national_area_incentive'     // 国家/区域奖励
  | 'e_awards';                   // 电子奖项
```

#### Star Point Categories (4 Stars)
```typescript
type StarCategoryType = 
  | 'network_star'                // 人脉之星
  | 'experience_star'             // 体验之星
  | 'outreach_star'               // 外展之星
  | 'social_star';                // 社交之星
```

#### Senator Score System
```typescript
// In Member.profile
interface SenatorScoreData {
  senatorId?: string;                    // 参议员编号
  senatorScore?: number;                 // 当前总分
  senatorScoreHistory?: Array<{
    id: string;
    score: number;                       // 单次得分（可正可负）
    reason: string;                      // 得分原因
    awardedBy: string;                   // 授予人
    awardedDate: string;                 // 授予日期
    notes?: string;
  }>;
}
```

#### Activity → Score Matching Rules
```typescript
interface ActivityScoreMapping {
  // 活动类型与分数映射
  activityTypeScores: {
    'meeting': {
      attended: 10,                      // 出席会议 +10分
      absent: -5,                        // 缺席会议 -5分
      excused: 0                         // 请假 0分
    },
    'training': {
      completed: 20,                     // 完成培训 +20分
      partial: 10                        // 部分完成 +10分
    },
    'volunteer': {
      participated: 15,                  // 参与志愿活动 +15分
      organized: 30                      // 组织活动 +30分
    },
    'committee_role': {
      president: 100,                    // 会长 +100分
      vice_president: 50,                // 副会长 +50分
      department_head: 30,               // 部门主管 +30分
      member: 10                         // 成员 +10分
    }
  };
  
  // 指标完成度与分数
  indicatorScores: {
    target_met: number;                  // 达标分数
    exceeds_target: number;              // 超标额外分
    bonus_multiplier: number;            // 奖励倍数
  };
}
```

#### Auto-calculation Service
```typescript
// src/modules/award/services/scoreCalculationService.ts

export const calculateMemberAwardScore = async (
  memberId: string,
  year: number
): Promise<{
  totalScore: number;
  breakdown: ScoreBreakdown;
  recommendations: string[];
}> => {
  // 1. Get member activity participation
  const activities = await indicatorService.getMemberActivityParticipations(
    memberId,
    year
  );
  
  // 2. Calculate scores by activity type
  let meetingScore = 0;
  let trainingScore = 0;
  let volunteerScore = 0;
  let committeeScore = 0;
  
  activities.forEach(activity => {
    switch (activity.activityType) {
      case 'meeting':
        if (activity.status === 'attended') meetingScore += 10;
        if (activity.status === 'absent') meetingScore -= 5;
        break;
      case 'training':
        trainingScore += activity.points || 20;
        break;
      case 'volunteer':
        volunteerScore += 15;
        break;
    }
  });
  
  // 3. Get committee roles
  const member = await getMemberById(memberId);
  if (member.profile?.jciPosition) {
    committeeScore = getPositionScore(member.profile.jciPosition);
  }
  
  // 4. Calculate indicators completion
  const indicators = await indicatorService.getMemberIndicatorCompletions(
    memberId,
    year
  );
  const indicatorScore = indicators.reduce((sum, ind) => 
    sum + ind.actualScore, 0
  );
  
  const totalScore = meetingScore + trainingScore + volunteerScore + 
                     committeeScore + indicatorScore;
  
  // 5. Generate recommendations
  const recommendations: string[] = [];
  if (meetingScore < 30) {
    recommendations.push('建议参加更多会议以提升分数');
  }
  if (trainingScore === 0) {
    recommendations.push('建议完成至少一门培训课程');
  }
  
  return {
    totalScore,
    breakdown: {
      meeting: meetingScore,
      training: trainingScore,
      volunteer: volunteerScore,
      committee: committeeScore,
      indicators: indicatorScore
    },
    recommendations
  };
};

const getPositionScore = (position: string): number => {
  const scoreMap: Record<string, number> = {
    'president': 100,
    'vice_president': 50,
    'secretary_general': 50,
    'treasurer': 50,
    'department_head': 30,
    'official_member': 10
  };
  return scoreMap[position] || 0;
};
```

---

### 12. Permission System ↔ Member Category Matching (权限系统与会员类别匹配)

#### Permission Assignment Rules
```typescript
interface PermissionCategoryMapping {
  // 会员类别 → 默认角色映射
  defaultRoleMapping: {
    'official_member': ['member', 'voter'],
    'associate_member': ['member'],
    'honorary_member': ['member', 'voter', 'advisor'],
    'affiliate_member': ['member'],
    'visiting_member': ['guest'],
    'alumni': ['alumni', 'guest'],
    'guest': ['guest']
  };
  
  // JCI职位 → 系统权限映射
  positionPermissionMapping: {
    'president': [
      'system.manage',
      'member.manage',
      'finance.manage',
      'event.manage',
      'rbac.manage'
    ],
    'secretary_general': [
      'member.manage',
      'event.manage',
      'system.read'
    ],
    'treasurer': [
      'finance.manage',
      'finance.approve',
      'bill_payment.approve'
    ],
    'vice_president': [
      'member.update',
      'event.manage'
    ],
    'department_head': [
      'event.create',
      'event.update',
      'member.read'
    ],
    'official_member': [
      'event.read',
      'member.read',
      'profile.update'
    ],
    'associate_member': [
      'event.read',
      'profile.update'
    ]
  };
}
```

#### Auto-sync Permission Service
```typescript
// src/modules/permission/services/permissionSyncService.ts

export const syncMemberPermissions = async (
  memberId: string
): Promise<void> => {
  const member = await getMemberById(memberId);
  if (!member) return;
  
  // 1. Get base role from member category
  const baseRole = getDefaultRole(member.accountType);
  
  // 2. Get position-based permissions
  const positionPerms = member.profile?.jciPosition
    ? getPositionPermissions(member.profile.jciPosition)
    : [];
  
  // 3. Combine permissions
  const allPermissions = [...baseRole.permissions, ...positionPerms];
  
  // 4. Update member's effective permissions
  await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId), {
    'profile.effectivePermissions': Array.from(new Set(allPermissions)),
    'profile.roleBindings': [
      {
        roleId: baseRole.id,
        scopes: {},
        expiresAt: null
      }
    ]
  });
  
  // 5. Log permission change
  await operationLoggingService.logOperation({
    userId: 'system',
    userName: 'System',
    userEmail: 'system@jcikl.com',
    userRole: 'system',
    operation: 'PERMISSION_CHANGE',
    module: 'permission',
    action: 'sync_permissions',
    targetType: 'Member',
    targetId: memberId,
    afterData: { permissions: allPermissions },
    isReversible: false,
    isReverted: false,
    tags: ['auto-sync', 'permission'],
    severity: 'info'
  });
};
```

#### Permission Change Trigger Points
```typescript
// When to sync permissions automatically

const PERMISSION_SYNC_TRIGGERS = {
  // Trigger 1: Category approval
  on_category_approved: async (memberId: string) => {
    await syncMemberPermissions(memberId);
  },
  
  // Trigger 2: Position assignment
  on_position_assigned: async (memberId: string, position: string) => {
    await syncMemberPermissions(memberId);
  },
  
  // Trigger 3: Member status change
  on_status_change: async (memberId: string, oldStatus: string, newStatus: string) => {
    if (newStatus === 'active') {
      await syncMemberPermissions(memberId);
    } else if (newStatus === 'suspended') {
      await revokeMemberPermissions(memberId);
    }
  },
  
  // Trigger 4: Category change
  on_category_change: async (memberId: string) => {
    await syncMemberPermissions(memberId);
  }
};
```

---

### 13. Event ↔ Member Matching (活动管理与会员匹配)

#### Registration Eligibility Rules
```typescript
interface EventMemberMatchingRules {
  // 活动开放对象 → 会员类别匹配
  registrationOpenFor: {
    'Member': ['official_member', 'associate_member', 'honorary_member'],
    'Alumni': ['alumni', 'visiting_member'],
    'Friend': ['guest'],
    'All': ['*']  // All categories
  };
  
  // 活动级别 → 参与限制
  eventLevelRestrictions: {
    'Local': {
      minCategory: 'associate_member',
      requiresApproval: false
    },
    'Area': {
      minCategory: 'official_member',
      requiresApproval: true,
      approvalBy: ['president', 'vice_president']
    },
    'National': {
      minCategory: 'official_member',
      requiresApproval: true,
      approvalBy: ['president'],
      additionalRequirements: ['active_for_6_months']
    },
    'JCI': {
      minCategory: 'official_member',
      requiresApproval: true,
      requiresSelection: true,
      approvalBy: ['president', 'board']
    }
  };
}
```

#### Registration Validation Service
```typescript
// src/modules/event/services/registrationValidationService.ts

export const validateMemberEligibility = async (
  eventId: string,
  memberId: string
): Promise<{
  eligible: boolean;
  reason?: string;
  requiredActions?: string[];
}> => {
  const event = await getEvent(eventId);
  const member = await getMemberById(memberId);
  
  if (!event || !member) {
    return { eligible: false, reason: 'Event or member not found' };
  }
  
  // Check 1: Event is published
  if (event.status !== 'Published') {
    return { eligible: false, reason: '活动尚未发布' };
  }
  
  // Check 2: Registration period
  const now = new Date();
  if (event.registrationEndDate && now > event.registrationEndDate.toDate()) {
    return { eligible: false, reason: '报名已截止' };
  }
  
  // Check 3: Member category eligibility
  const memberCategory = member.accountType || 'guest';
  const allowedCategories = event.registrationOpenFor || ['Member'];
  
  const categoryMatch = allowedCategories.some(allowed => {
    const matchedCategories = EVENT_CATEGORY_MAPPING[allowed] || [];
    return matchedCategories.includes(memberCategory);
  });
  
  if (!categoryMatch) {
    return { 
      eligible: false, 
      reason: `此活动不对 ${memberCategory} 开放`,
      requiredActions: ['升级会员类别']
    };
  }
  
  // Check 4: Event level restrictions
  const levelRestriction = EVENT_LEVEL_RESTRICTIONS[event.level];
  if (levelRestriction && !meetsLevelRequirement(member, levelRestriction)) {
    return {
      eligible: false,
      reason: `需要 ${levelRestriction.minCategory} 或以上类别`,
      requiredActions: ['完成会员类别升级']
    };
  }
  
  // Check 5: Seat availability
  if (event.maxParticipants && event.totalRegistrations >= event.maxParticipants) {
    return { eligible: false, reason: '活动已满员' };
  }
  
  // Check 6: Payment verification (for new members)
  if (memberCategory.includes('member') && !member.profile?.paymentVerifiedDate) {
    return {
      eligible: false,
      reason: '会员费未支付',
      requiredActions: ['完成会员费支付', '上传支付凭证']
    };
  }
  
  return { eligible: true };
};
```

---

### 14. Member Recruitment Tracking (会员招揽记录与统计)

#### Data Model
```typescript
// In Member.profile
interface MemberProfile {
  // ... existing fields
  
  // Recruitment Info
  introducerName?: string;               // 推荐人姓名
  introducerId?: string;                 // 推荐人会员ID (NEW)
  introducerVerified?: boolean;          // 推荐关系已验证 (NEW)
  recruitmentDate?: string;              // 招揽日期 (NEW)
  recruitmentNotes?: string;             // 招揽备注 (NEW)
}

// NEW Collection: memberRecruitment
interface MemberRecruitmentRecord {
  id: string;
  recruiterId: string;                   // 招揽人ID
  recruiterName: string;                 // 招揽人姓名
  recruitedMemberId: string;             // 被招揽会员ID
  recruitedMemberName: string;           // 被招揽会员姓名
  recruitmentDate: string;               // 招揽日期
  recruitmentMethod: 'referral' | 'event' | 'network' | 'other';
  recruitmentChannel?: string;           // 招揽渠道
  
  // Status Tracking
  status: 'pending' | 'joined' | 'approved' | 'rejected';
  joinedDate?: string;                   // 加入日期
  approvedDate?: string;                 // 批准日期
  
  // Verification
  isVerified: boolean;                   // 关系已验证
  verifiedBy?: string;
  verifiedDate?: string;
  
  // Incentives
  incentiveEligible: boolean;            // 是否符合奖励条件
  incentiveAmount?: number;              // 奖励金额
  incentivePaid?: boolean;               // 奖励已发放
  
  createdAt: string;
  updatedAt: string;
}
```

#### Recruitment Statistics
```typescript
// NEW Collection: recruitmentStats
interface RecruitmentStats {
  recruiterId: string;
  recruiterName: string;
  year: number;
  month?: number;                        // Optional for monthly stats
  
  // Counts
  totalRecruits: number;                 // 总招揽数
  pendingRecruits: number;               // 待加入
  joinedRecruits: number;                // 已加入
  approvedRecruits: number;              // 已批准
  
  // Conversion Rate
  conversionRate: number;                // 转化率 (joined/total)
  approvalRate: number;                  // 批准率 (approved/joined)
  
  // Incentives
  totalIncentivesEarned: number;         // 累计奖励
  pendingIncentives: number;             // 待发奖励
  
  // Rankings
  rankInChapter?: number;                // 分会排名
  rankInRegion?: number;                 // 区域排名
  
  lastUpdated: string;
}
```

#### Recruitment Service
```typescript
// src/modules/member/services/recruitmentService.ts

class RecruitmentService {
  /**
   * Record a recruitment
   */
  async recordRecruitment(data: {
    recruiterId: string;
    recruitedMemberEmail: string;
    recruitmentMethod: string;
    notes?: string;
  }): Promise<string> {
    const recruiter = await getMemberById(data.recruiterId);
    
    const record: Omit<MemberRecruitmentRecord, 'id'> = {
      recruiterId: data.recruiterId,
      recruiterName: recruiter.name,
      recruitedMemberId: 'pending',      // Will update when member registers
      recruitedMemberName: data.recruitedMemberEmail,
      recruitmentDate: new Date().toISOString(),
      recruitmentMethod: data.recruitmentMethod as any,
      status: 'pending',
      isVerified: false,
      incentiveEligible: true,           // Default eligible
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(
      collection(db, GLOBAL_COLLECTIONS.MEMBER_RECRUITMENT),
      cleanUndefinedValues(record)
    );
    
    return docRef.id;
  }
  
  /**
   * Link recruitment record when member registers
   */
  async linkRecruitmentOnRegistration(
    memberEmail: string,
    memberId: string
  ): Promise<void> {
    // Find pending recruitment records
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBER_RECRUITMENT),
      where('recruitedMemberName', '==', memberEmail),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const record = snapshot.docs[0];
      await updateDoc(record.ref, {
        recruitedMemberId: memberId,
        status: 'joined',
        joinedDate: new Date().toISOString()
      });
      
      // Update member's introducer info
      const member = await getMemberById(memberId);
      const recruitment = record.data() as MemberRecruitmentRecord;
      
      await updateDoc(doc(db, GLOBAL_COLLECTIONS.MEMBERS, memberId), {
        'profile.introducerId': recruitment.recruiterId,
        'profile.introducerVerified': true,
        'profile.recruitmentDate': recruitment.recruitmentDate
      });
    }
  }
  
  /**
   * Get recruiter statistics
   */
  async getRecruiterStats(
    recruiterId: string,
    year: number
  ): Promise<RecruitmentStats> {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBER_RECRUITMENT),
      where('recruiterId', '==', recruiterId),
      where('recruitmentDate', '>=', `${year}-01-01`),
      where('recruitmentDate', '<=', `${year}-12-31`)
    );
    
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => doc.data() as MemberRecruitmentRecord);
    
    return {
      recruiterId,
      recruiterName: records[0]?.recruiterName || '',
      year,
      totalRecruits: records.length,
      pendingRecruits: records.filter(r => r.status === 'pending').length,
      joinedRecruits: records.filter(r => r.status === 'joined').length,
      approvedRecruits: records.filter(r => r.status === 'approved').length,
      conversionRate: records.filter(r => r.status === 'joined').length / records.length,
      approvalRate: records.filter(r => r.status === 'approved').length / 
                    Math.max(1, records.filter(r => r.status === 'joined').length),
      totalIncentivesEarned: records
        .filter(r => r.incentivePaid)
        .reduce((sum, r) => sum + (r.incentiveAmount || 0), 0),
      pendingIncentives: records
        .filter(r => r.incentiveEligible && !r.incentivePaid)
        .reduce((sum, r) => sum + (r.incentiveAmount || 0), 0),
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Get top recruiters leaderboard
   */
  async getTopRecruiters(
    year: number,
    limit: number = 10
  ): Promise<Array<{ name: string; recruits: number }>> {
    // Aggregate all recruitment records
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.MEMBER_RECRUITMENT),
      where('recruitmentDate', '>=', `${year}-01-01`),
      where('status', '==', 'approved')
    );
    
    const snapshot = await getDocs(q);
    const recruiterCounts = new Map<string, { name: string; count: number }>();
    
    snapshot.docs.forEach(doc => {
      const record = doc.data() as MemberRecruitmentRecord;
      const existing = recruiterCounts.get(record.recruiterId);
      
      if (existing) {
        existing.count++;
      } else {
        recruiterCounts.set(record.recruiterId, {
          name: record.recruiterName,
          count: 1
        });
      }
    });
    
    return Array.from(recruiterCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(r => ({ name: r.name, recruits: r.count }));
  }
}

export const recruitmentService = new RecruitmentService();
```

---

### 15. Member Personal Interests & Industry Matching (会员兴趣与行业匹配)

#### Interests Data Structure
```typescript
// In Member.profile (Already implemented)
interface MemberProfile {
  // Personal Interests/Hobbies (14 options)
  hobbies?: Array<
    | 'Badminton'
    | 'Golf'
    | 'Basketball'
    | 'Pickle Ball'
    | 'E-Sport MLBB'
    | 'other E-sport'
    | 'Rock Climbing'
    | 'Hiking'
    | 'Car Enthusiast'
    | 'Liquor/ Wine tasting'
    | 'Movie'
    | 'Public Speaking'
    | 'Reading'
    | 'Dancing'
    | 'Singing'
    | 'Other'
    | 'Not at this moment'
  >;
  
  // JCI-specific Interests
  jciEventInterests?: string;            // 感兴趣的JCI活动类型
  jciBenefitsExpectation?: string;       // 期望从JCI获得的资源/活动/福利
}
```

#### Industry & Business Profile
```typescript
interface MemberProfile {
  // Own Industry (Self-classification)
  ownIndustry?: Array<
    | 'Advertising, Marketing & Media'
    | 'Agriculture & Animals'
    | 'Architecture, Engineering & Construction'
    | 'Art, Entertainment & Design'
    | 'Automotive & Accessories'
    | 'Food & Beverages'
    | 'Computers & IT'
    | 'Consulting & Professional Services'
    | 'Education & Training'
    | 'Event & Hospitality'
    | 'Finance & Insurance'
    | 'Health, Wellness & Beauty'
    | 'Legal & Accounting'
    | 'Manufacturing'
    | 'Retail & E-Commerce'
    | 'Real Estate & Property Services'
    | 'Repair Services'
    | 'Security & Investigation'
    | 'Transport & Logistics'
    | 'Travel & Tourism'
    | 'Other'
  >;
  
  // Interested Industries (for networking)
  interestedIndustries?: Array<string>;  // Same options as ownIndustry
  
  // Business Categories
  categories?: Array<
    | 'Distributor'
    | 'Manufacturer'
    | 'Retailer / E-commerce'
    | 'Service Provider'
  >;
  
  // Work Details
  company?: string;                      // Company name
  departmentAndPosition?: string;        // Department & position
  companyIntro?: string;                 // Company operations & role
  
  // Career Development
  fiveYearsVision?: string;              // 5-year career vision
  activeMemberHow?: string;              // How to be an active member
  
  // Business Preferences
  acceptInternationalBusiness?: 'Yes' | 'No' | 'Willing to explore';
}
```

#### Interest-based Event Matching
```typescript
// src/modules/event/services/eventRecommendationService.ts

export const recommendEventsForMember = async (
  memberId: string,
  limit: number = 5
): Promise<Event[]> => {
  const member = await getMemberById(memberId);
  if (!member) return [];
  
  // 1. Get all published events
  const events = await eventService.getEvents({
    status: 'Published',
    startDate: new Date().toISOString()
  });
  
  // 2. Score events based on member interests
  const scoredEvents = events.map(event => {
    let score = 0;
    
    // Match hobbies (if event is hobby-related)
    if (member.profile?.hobbies) {
      const hobbyMatch = matchHobbiesToEvent(member.profile.hobbies, event);
      score += hobbyMatch * 20;
    }
    
    // Match JCI interests
    if (member.profile?.jciEventInterests) {
      const jciMatch = event.description.toLowerCase()
        .includes(member.profile.jciEventInterests.toLowerCase());
      if (jciMatch) score += 30;
    }
    
    // Match industry (for business events)
    if (event.category === 'BUSINESS_NETWORKING' && member.profile?.ownIndustry) {
      score += 25;
    }
    
    // Past attendance boost
    const hasAttendedBefore = checkPastAttendance(memberId, event.type);
    if (hasAttendedBefore) score += 15;
    
    return { event, score };
  });
  
  // 3. Return top N recommendations
  return scoredEvents
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.event);
};

const matchHobbiesToEvent = (hobbies: string[], event: Event): number => {
  const hobbyKeywords = {
    'Golf': ['golf', 'sports'],
    'Basketball': ['basketball', 'sports'],
    'Car Enthusiast': ['car', 'automotive', 'drive'],
    'Wine tasting': ['wine', 'liquor', 'tasting'],
    'Public Speaking': ['speaking', 'presentation', 'toastmaster']
  };
  
  let matches = 0;
  hobbies.forEach(hobby => {
    const keywords = hobbyKeywords[hobby] || [];
    if (keywords.some(kw => event.description.toLowerCase().includes(kw))) {
      matches++;
    }
  });
  
  return matches / Math.max(1, hobbies.length); // Normalized 0-1
};
```

#### Industry Networking Match
```typescript
// src/modules/member/services/networkingMatchService.ts

export const findNetworkingMatches = async (
  memberId: string
): Promise<Member[]> => {
  const member = await getMemberById(memberId);
  if (!member) return [];
  
  const interestedIndustries = member.profile?.interestedIndustries || [];
  if (interestedIndustries.length === 0) return [];
  
  // Find members whose industry matches your interests
  const allMembers = await memberService.getMembers({
    status: 'active',
    limit: 1000
  });
  
  const matches = allMembers.data.filter(m => {
    if (m.id === memberId) return false;
    
    const theirIndustry = m.profile?.ownIndustry || [];
    const overlap = theirIndustry.some(ind => 
      interestedIndustries.includes(ind)
    );
    
    return overlap;
  });
  
  // Score by relevance
  return matches
    .map(m => ({
      member: m,
      score: calculateNetworkingScore(member, m)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(item => item.member);
};

const calculateNetworkingScore = (member1: Member, member2: Member): number => {
  let score = 0;
  
  // Industry overlap
  const industry1 = member1.profile?.ownIndustry || [];
  const industry2 = member2.profile?.ownIndustry || [];
  const interests1 = member1.profile?.interestedIndustries || [];
  
  const overlap = industry2.filter(ind => interests1.includes(ind)).length;
  score += overlap * 30;
  
  // Hobby overlap
  const hobbies1 = member1.profile?.hobbies || [];
  const hobbies2 = member2.profile?.hobbies || [];
  const hobbyOverlap = hobbies1.filter(h => hobbies2.includes(h)).length;
  score += hobbyOverlap * 10;
  
  // Same region
  if (member1.countryRegion === member2.countryRegion) {
    score += 20;
  }
  
  return score;
};
```

---

### 16. Swiper Integration (轮播组件集成)

#### Usage in Project
```typescript
// Swiper is used for image galleries and event photo slideshows
// Reference: https://swiperjs.com/

// Installation (if needed)
// npm install swiper@latest
```

#### Implementation Examples
```typescript
// src/components/common/ImageGallery.tsx

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

interface ImageGalleryProps {
  images: string[];
  height?: number;
  autoplay?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  height = 400,
  autoplay = true
}) => {
  return (
    <Swiper
      modules={[Navigation, Pagination, Autoplay, EffectFade]}
      spaceBetween={10}
      slidesPerView={1}
      navigation
      pagination={{ clickable: true }}
      autoplay={autoplay ? {
        delay: 3000,
        disableOnInteraction: false
      } : false}
      effect="fade"
      loop
      style={{ height }}
    >
      {images.map((image, index) => (
        <SwiperSlide key={index}>
          <img
            src={image}
            alt={`Slide ${index + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};
```

#### Event Photo Carousel
```typescript
// src/modules/event/components/EventPhotoCarousel.tsx

import { Swiper, SwiperSlide } from 'swiper/react';
import { Thumbs, FreeMode } from 'swiper/modules';

export const EventPhotoCarousel: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [photos, setPhotos] = useState<string[]>([]);
  
  return (
    <>
      {/* Main Swiper */}
      <Swiper
        modules={[Thumbs]}
        thumbs={{ swiper: thumbsSwiper }}
        spaceBetween={10}
        slidesPerView={1}
        style={{ height: 500 }}
      >
        {photos.map((photo, index) => (
          <SwiperSlide key={index}>
            <img src={photo} alt={`Event ${index}`} />
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Thumbnails Swiper */}
      <Swiper
        modules={[FreeMode, Thumbs]}
        onSwiper={setThumbsSwiper}
        spaceBetween={10}
        slidesPerView={4}
        freeMode
        watchSlidesProgress
        style={{ height: 100, marginTop: 10 }}
      >
        {photos.map((photo, index) => (
          <SwiperSlide key={index}>
            <img src={photo} alt={`Thumb ${index}`} />
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  );
};
```

#### Member Profile Carousel
```typescript
// src/modules/member/components/MemberAchievementsCarousel.tsx

export const MemberAchievementsCarousel: React.FC = ({ memberId }) => {
  const achievements = useMemberAchievements(memberId);
  
  return (
    <Swiper
      modules={[Pagination, Autoplay]}
      spaceBetween={20}
      slidesPerView={3}
      pagination={{ clickable: true }}
      autoplay={{ delay: 4000 }}
      breakpoints={{
        320: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 }
      }}
    >
      {achievements.map(achievement => (
        <SwiperSlide key={achievement.id}>
          <Card hoverable>
            <Trophy />
            <Title level={4}>{achievement.name}</Title>
            <Text>{achievement.date}</Text>
          </Card>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};
```

#### Swiper Global Configuration
```typescript
// src/config/swiperConfig.ts

export const SWIPER_DEFAULTS = {
  // Image Gallery
  imageGallery: {
    spaceBetween: 10,
    slidesPerView: 1,
    navigation: true,
    pagination: { clickable: true },
    autoplay: { delay: 3000 },
    loop: true,
    effect: 'fade'
  },
  
  // Event Cards
  eventCards: {
    spaceBetween: 20,
    slidesPerView: 3,
    navigation: true,
    pagination: false,
    breakpoints: {
      320: { slidesPerView: 1 },
      768: { slidesPerView: 2 },
      1024: { slidesPerView: 3 }
    }
  },
  
  // Achievement Showcase
  achievements: {
    spaceBetween: 15,
    slidesPerView: 4,
    autoplay: { delay: 4000 },
    loop: true,
    centeredSlides: true,
    breakpoints: {
      320: { slidesPerView: 1 },
      480: { slidesPerView: 2 },
      768: { slidesPerView: 3 },
      1024: { slidesPerView: 4 }
    }
  }
};
```

#### Usage with Global Settings
```typescript
// Integrate with global settings system

// NEW Setting Keys for Swiper
'swiper-gallery-autoplay-delay': 3000
'swiper-gallery-transition-effect': 'fade' | 'slide' | 'cube'
'swiper-cards-slides-per-view': 3
'swiper-enable-navigation': true
'swiper-enable-pagination': true
```

---

### Database Collections Update
```typescript
// Add new collections to globalCollections.ts

export const GLOBAL_COLLECTIONS = {
  // ... existing collections
  
  // Recruitment Tracking
  MEMBER_RECRUITMENT: 'memberRecruitment',
  RECRUITMENT_STATS: 'recruitmentStats',
  
  // Award System
  AWARD_SCORES: 'awardScores',
  AWARD_INDICATORS: 'awardIndicators',
  INDICATOR_COMPLETIONS: 'indicatorCompletions',
  ACTIVITY_PARTICIPATIONS: 'activityParticipations'
} as const;
```

### Total Collections Update
**New Total**: 46 → **52 Collections**

---

## 📋 Project Overview

**Name**: JCI KL Membership Management System  
**Description**: 超级国际青年商会吉隆坡分会会员管理系统  
**Type**: Enterprise-grade Web Application (Production-Ready)  
**Complexity**: ⭐⭐⭐⭐⭐ (5/5)  
**Codebase Size**: ~200+ components, 100+ services, 30,000+ LOC

---

## 🏗️ Architecture Overview

### System Architecture Pattern
**3-Tier Architecture:**
```
┌─────────────────────────────────────┐
│  Presentation Layer (UI)            │
│  - React Components                 │
│  - Ant Design UI                    │
│  - React Router                     │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Business Logic Layer               │
│  - Service Classes                  │
│  - Custom Hooks                     │
│  - State Management (Zustand)       │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Data Access Layer                  │
│  - Firebase SDK                     │
│  - Firestore CRUD                   │
│  - Firebase Auth                    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Data Persistence Layer             │
│  - Firestore Database               │
│  - Firebase Storage                 │
│  - Cloudinary                       │
└─────────────────────────────────────┘
```

### Module Architecture (8 Core Modules)
```
src/modules/
├── member/          # 会员管理 (Registration, Profiles, Categories)
├── finance/         # 财务系统 (Transactions, Budgets, Reports)
├── event/           # 活动管理 (Events, Registration, Statistics)
├── permission/      # 权限系统 (RBAC, Role Bindings)
├── survey/          # 问卷系统 (Surveys, Responses, Analytics)
├── award/           # 奖项系统 (Awards, Scores, Tracking)
├── image/           # 图片管理 (Cloudinary, Folders)
└── system/          # 系统设置 (Config, Audit Logs)
```

**Unified Module Structure:**
```
module_name/
├── components/      # Module-specific UI
├── pages/          # Module routes
├── services/       # Business logic + data access
├── hooks/          # Custom React hooks
├── types/          # TypeScript types
├── __tests__/      # Unit tests
└── index.ts        # Module exports
```

---

## 🛠️ Tech Stack (Complete)

### Frontend Core
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2.0 | UI Framework |
| TypeScript | 5.2.2 | Type System |
| Vite | 5.0.8 | Build Tool |
| Ant Design | 5.12.8 | UI Component Library |
| React Router DOM | 6.20.1 | Client-side Routing |

### State Management
| Technology | Usage |
|-----------|-------|
| Zustand | Primary (authStore, memberStore) |
| React Context | Local state (EventFormContext, SidebarContext) |
| React Query | Async state (deprecated, being removed) |

### Data & Backend (BaaS)
| Service | Purpose |
|---------|---------|
| Firebase Auth | User Authentication |
| Firestore | NoSQL Database |
| Firebase Storage | File Storage (legacy) |
| Cloudinary | Image CDN (primary) |

### Forms & Validation
| Technology | Purpose |
|-----------|---------|
| React Hook Form | Form State Management |
| Yup | Schema Validation |
| globalValidationService | Centralized Validation |

### Utilities
| Library | Purpose |
|---------|---------|
| Day.js | Date Manipulation |
| Axios | HTTP Requests |
| crypto-js | Encryption |
| XLSX | Excel Import/Export |
| pdfjs-dist | PDF Parsing |

### AI Integration (Optional)
| Service | Usage |
|---------|-------|
| OpenAI GPT | PDF Interpretation |
| Google Gemini | Alternative AI |

---

## 🎨 UI System Architecture

### Theme Configuration
```typescript
// Location: src/config/globalComponentSettings.ts
GLOBAL_COMPONENT_CONFIG.UI_THEME = {
  primaryColor: '#1890ff',           // Ant Design Blue
  colorText: 'rgba(0, 0, 0, 0.85)',
  colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
  colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
  borderRadius: 6,
  borderRadiusLG: 8,
  borderRadiusSM: 4,
  fontSize: 14,
  lineHeight: 1.5715
}
```

### Component Defaults

#### Table Configuration
```typescript
globalComponentService.getTableConfig({
  // Override defaults
  pageSize: 20,
  showSizeChanger: true,
  showQuickJumper: true,
  scroll: { x: 'max-content' },
  size: 'middle'
})
```

#### Form Configuration
```typescript
globalComponentService.getFormConfig({
  layout: 'vertical',
  validateTrigger: 'onBlur',
  scrollToFirstError: true
})
```

#### Modal Configuration
```typescript
globalComponentService.getModalConfig({
  width: 800,
  centered: true,
  destroyOnHidden: true,
  maskClosable: false
})
```

### Status Color System
```typescript
// CSS Classes (src/styles/index.css)
.status-active      // Green  - Active members, published events
.status-inactive    // Orange - Inactive, suspended
.status-pending     // Blue   - Pending approval, in progress
.status-suspended   // Red    - Disabled, cancelled, error
```

### Responsive Breakpoints
```typescript
RESPONSIVE_BREAKPOINTS = {
  xs: 480,    // Mobile Portrait
  sm: 576,    // Mobile Landscape
  md: 768,    // Tablet
  lg: 992,    // Small Desktop
  xl: 1200,   // Desktop
  xxl: 1600   // Large Display
}
```

---

## 📊 Data Architecture

### Firebase Collections (46 Total)

#### Member Domain
```typescript
GLOBAL_COLLECTIONS.MEMBERS                 // 主会员表
GLOBAL_COLLECTIONS.MEMBER_POSITIONS       // 职位记录
GLOBAL_COLLECTIONS.MEMBER_CATEGORIES      // 会员分类
GLOBAL_COLLECTIONS.MEMBER_PROFILES        // 详细资料
GLOBAL_COLLECTIONS.GLOBAL_SETTINGS        // 全局配置管理 (NEW)
GLOBAL_COLLECTIONS.SETTING_CHANGE_LOGS    // 配置变更日志 (NEW)
```

#### Finance Domain (Most Complex)
```typescript
GLOBAL_COLLECTIONS.TRANSACTIONS           // 交易记录
GLOBAL_COLLECTIONS.TRANSACTIONS_PROJECT   // 项目财政交易
GLOBAL_COLLECTIONS.BANK_ACCOUNTS          // 银行户口
GLOBAL_COLLECTIONS.TRANSACTION_PURPOSES   // 交易用途
GLOBAL_COLLECTIONS.TRANSACTION_SPLITS     // 交易拆分
GLOBAL_COLLECTIONS.BILL_PAYMENTS          // 账单支付
GLOBAL_COLLECTIONS.PAYMENT_REQUESTS       // 支付申请
GLOBAL_COLLECTIONS.PAYMENT_VOUCHERS       // 支付凭证
GLOBAL_COLLECTIONS.FINANCIAL_RECORDS      // 财务记录
```

#### Event Domain
```typescript
GLOBAL_COLLECTIONS.EVENTS                 // 活动主表
GLOBAL_COLLECTIONS.EVENT_REGISTRATIONS    // 活动报名
GLOBAL_COLLECTIONS.EVENT_PARTICIPANTS     // 参与者记录
```

#### Permission Domain (RBAC)
```typescript
GLOBAL_COLLECTIONS.RBAC_PERMISSIONS       // 权限定义
GLOBAL_COLLECTIONS.RBAC_ROLES             // 角色定义
GLOBAL_COLLECTIONS.RBAC_ROLE_BINDINGS     // 用户-角色绑定
GLOBAL_COLLECTIONS.RBAC_PERMISSION_MATRIX // 权限矩阵
```

#### System Domain
```typescript
GLOBAL_COLLECTIONS.CHAPTER_SETTINGS       // 分会设置
GLOBAL_COLLECTIONS.SYSTEM_CONFIG          // 系统配置
GLOBAL_COLLECTIONS.AUDIT_LOGS             // 审计日志
GLOBAL_COLLECTIONS.WORLD_REGIONS          // 世界区域
GLOBAL_COLLECTIONS.COUNTRIES              // 国家
GLOBAL_COLLECTIONS.NATIONAL_REGIONS       // 国家区域
GLOBAL_COLLECTIONS.LOCAL_CHAPTERS         // 地方分会
GLOBAL_COLLECTIONS.GLOBAL_SETTINGS        // 全局配置管理
GLOBAL_COLLECTIONS.SETTING_CHANGE_LOGS    // 配置变更日志
```

#### Activity Tracking Domain
```typescript
GLOBAL_COLLECTIONS.USER_OPERATION_LOGS    // 用户操作日志（审计、撤销）
GLOBAL_COLLECTIONS.ONLINE_USERS           // 在线用户列表
GLOBAL_COLLECTIONS.ONLINE_USERS_STATS     // 在线用户统计
GLOBAL_COLLECTIONS.PAGE_VIEWS             // 页面浏览记录
GLOBAL_COLLECTIONS.PAGE_VIEWS_STATS       // 页面浏览统计
```

### Core Data Models

#### Transaction (财务交易)
```typescript
interface Transaction {
  id: string;
  transactionNumber: string;        // Format: TXN-YYYY-XXXX-NNNN
  bankAccountId: string;
  transactionDate: string;          // ISO 8601
  mainDescription: string;          // Required
  subDescription?: string;
  expense: number;                  // ≥ 0
  income: number;                   // ≥ 0
  payerPayee?: string;
  transactionPurpose?: string;      // Purpose ID
  projectAccountId?: string;
  inputBy: string;
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### Member (会员)
```typescript
interface Member {
  id: string;
  email: string;
  name: string;
  phone: string;
  memberId: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  accountType?: string;
  
  // Organization Hierarchy (5 levels)
  worldRegion?: string;
  country?: string;
  countryRegion?: string;
  chapter?: string;
  chapterId?: string;
  
  // Detailed Profile (30+ fields)
  profile: {
    avatar?: string;
    birthDate?: string;           // dd-mmm-yyyy
    gender?: 'Male' | 'Female';
    senatorId?: string;
    senatorScore?: number;
    activityParticipation?: Array<{...}>;
    jciPosition?: string;
    taskCompletions?: Array<{...}>;
    effectivePermissions?: string[];
    roleBindings?: Array<{...}>;
    // ... 20+ more fields
  };
  
  joinDate: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Event (活动)
```typescript
interface Event {
  id: string;
  title: string;
  type: 'Program' | 'Skill Development' | 'Event' | 'Project';
  category: EventCategory;          // 14 categories
  level: 'Local' | 'Area' | 'National' | 'JCI';
  status: 'Draft' | 'Published' | 'Cancelled' | 'Completed';
  
  // Time (Firestore Timestamp)
  startDate: Timestamp;
  endDate: Timestamp;
  registrationStartDate?: Timestamp;
  registrationEndDate?: Timestamp;
  
  // Venue
  venue: string;
  address: string;
  isVirtual: boolean;
  virtualLink?: string;
  
  // Pricing Strategy (Multi-tier)
  isFree: boolean;
  regularPrice?: number;
  earlyBirdPrice?: number;
  memberPrice?: number;
  alumniPrice?: number;
  
  // Nested Collections
  programs: EventProgram[];
  committeeMembers: CommitteeMember[];
  trainers: EventTrainer[];
  tickets: EventTicket[];
  
  // Registration Settings
  registrationSettings: {
    isPrivate: boolean;
    collectPersonalInfo: {...};
    eventArrangements: {...};
    emergencyContact: {...};
  };
  
  projectAccountId?: string;
  totalRegistrations: number;
}
```

### Data Validation Rules

#### Email Validation
```typescript
GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.email = 
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```

#### Phone Validation (Multi-Country)
```typescript
phone: {
  MY: /^(\+?6?01)[0-46-9]-*[0-9]{7,8}$/,  // Malaysia
  CN: /^1[3-9]\d{9}$/,                     // China
  SG: /^(\+65)?[689]\d{7}$/                // Singapore
}
```

#### Date Formats
```typescript
DATE_FORMATS = {
  display: 'DD-MMM-YYYY',           // 01-Jan-2024
  api: 'YYYY-MM-DD',                // 2024-01-01
  firestore: 'ISO8601',             // 2024-01-01T00:00:00.000Z
  filename: 'YYYYMMDD'              // 20240101
}
```

#### Field Length Limits
```typescript
FIELD_LIMITS = {
  shortText: 50,      // Names
  mediumText: 200,    // Descriptions
  longText: 1000,     // Detailed descriptions
  richText: 5000      // Articles
}
```

---

## 🔐 Permission System (RBAC)

### Permission Structure
```typescript
// 4-Layer Permission Model
User (Member)
  → Role Bindings (rbac_role_bindings)
  → Roles (rbac_roles)
  → Permissions (rbac_permissions)
  → Operation Authorization
```

### Permission Modules
```typescript
PERMISSION_MODULES = {
  MEMBER_MANAGEMENT: 'member',
  EVENT_MANAGEMENT: 'event',
  FINANCE_MANAGEMENT: 'finance',
  BILL_PAYMENT: 'bill_payment',
  PROFILE_MANAGEMENT: 'profile',
  SYSTEM_ADMIN: 'system',
  AWARDS_MANAGEMENT: 'awards',
  SURVEY_MANAGEMENT: 'survey',
  RBAC_MANAGEMENT: 'rbac'
}
```

### Permission Actions
```typescript
PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',    // All CRUD
  APPROVE: 'approve',
  EXPORT: 'export',
  IMPORT: 'import',
  AUDIT: 'audit'
}
```

### Permission Check Pattern
```typescript
// Service Layer
const result = await globalPermissionService.checkPermission(
  memberId, 
  'FINANCE_MANAGEMENT', 
  'CREATE'
);

// UI Layer (Hook)
const { hasPermission, loading } = usePermission(
  memberId, 
  'FINANCE_MANAGEMENT', 
  'CREATE'
);

// UI Layer (HOC)
const ProtectedButton = withPermissionControl(
  Button, 
  'FINANCE_MANAGEMENT', 
  'CREATE'
);
```

---

## 🔄 Data Flow Patterns

### Standard CRUD Flow
```typescript
// 1. UI Component
const [data, setData] = useState([]);

// 2. Load Data
useEffect(() => {
  const fetchData = async () => {
    const result = await memberService.getMembers({
      page: 1,
      limit: 20,
      search: searchTerm
    });
    setData(result.data);
  };
  fetchData();
}, [searchTerm]);

// 3. Service Layer
export const getMembers = async (params) => {
  // Build Firestore query
  const q = query(
    collection(db, GLOBAL_COLLECTIONS.MEMBERS),
    where('status', '==', params.status),
    orderBy('createdAt', 'desc'),
    limit(params.limit)
  );
  
  // Fetch data
  const snapshot = await getDocs(q);
  
  // Transform to domain model
  return {
    data: snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })),
    total: snapshot.size,
    page: params.page,
    limit: params.limit
  };
};
```

### Data Transformation Pattern
```typescript
// Firestore Timestamp → ISO String
const safeTimestampToISO = (timestamp: any): string => {
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  return new Date().toISOString();
};

// undefined → null (MANDATORY for Firebase)
const cleanUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanUndefinedValues(value);
    }
    return cleaned;
  }
  
  return obj;
};
```

---

## 📝 Code Style Guidelines

### TypeScript Standards
```typescript
// ✅ REQUIRED: Strict mode enabled
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}

// ✅ Use explicit types
interface User {
  id: string;
  name: string;
}

// ❌ Avoid 'any'
const data: any = {}; // FORBIDDEN

// ✅ Use proper types
const data: User = { id: '1', name: 'John' };
```

### Component Patterns
```typescript
// ✅ Functional components with TypeScript
interface Props {
  memberId: string;
  onSuccess?: () => void;
}

export const MemberProfile: React.FC<Props> = ({ memberId, onSuccess }) => {
  // Component logic
};

// ✅ Named exports (not default)
export { MemberProfile };

// ✅ Arrow functions for components
const Component = () => <div>Content</div>;
```

### Import Order
```typescript
// 1. React & Third-party
import React, { useState, useEffect } from 'react';
import { Button, Form, Table } from 'antd';

// 2. Global Config (PRIORITY)
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalPermissionService } from '@/config/globalPermissions';

// 3. Types
import { Member, Transaction } from '@/types';

// 4. Services
import { memberService } from '@/modules/member/services/memberService';

// 5. Components
import { LoadingSpinner } from '@/components/LoadingSpinner';

// 6. Styles
import './styles.css';
```

### Naming Conventions
```typescript
// Components: PascalCase
MemberListPage, TransactionManagement

// Services: camelCase
memberService, financeService

// Hooks: use prefix
usePermissions, useMemberCategory

// Constants: UPPER_SNAKE_CASE
GLOBAL_COLLECTIONS, MAX_FILE_SIZE

// Types/Interfaces: PascalCase
Member, Transaction, BankAccount
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Undefined Values to Firebase
```typescript
// ❌ WRONG: Will throw error
await setDoc(doc(db, 'members', id), {
  name: memberData.name,
  phone: memberData.phone,  // Could be undefined
  avatar: memberData.avatar // Could be undefined
});

// ✅ CORRECT: Clean undefined values
await setDoc(doc(db, 'members', id), 
  cleanUndefinedValues({
    name: memberData.name,
    phone: memberData.phone ?? null,
    avatar: memberData.avatar ?? null
  })
);

// ✅ BETTER: Spread with conditional
await setDoc(doc(db, 'members', id), {
  name: memberData.name,
  ...(memberData.phone && { phone: memberData.phone }),
  ...(memberData.avatar && { avatar: memberData.avatar })
});
```

### Issue 2: Hardcoded Collection Names
```typescript
// ❌ WRONG: Hardcoded string
const membersRef = collection(db, 'members');

// ✅ CORRECT: Use global config
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
const membersRef = collection(db, GLOBAL_COLLECTIONS.MEMBERS);
```

### Issue 3: Missing Permission Checks
```typescript
// ❌ WRONG: No permission check
const handleDelete = async () => {
  await memberService.deleteMember(id);
};

// ✅ CORRECT: Check permission first
import { globalPermissionService } from '@/config/globalPermissions';

const handleDelete = async () => {
  const result = await globalPermissionService.checkPermission(
    currentUserId,
    'MEMBER_MANAGEMENT',
    'DELETE'
  );
  
  if (!result.hasPermission) {
    message.error('权限不足');
    return;
  }
  
  await memberService.deleteMember(id);
};
```

### Issue 4: Service Layer Too Large
```typescript
// ❌ PROBLEM: financeService.ts > 3000 lines

// ✅ SOLUTION: Split into focused services
// transactionService.ts
export const createTransaction = async (data) => {...};
export const updateTransaction = async (id, data) => {...};

// bankAccountService.ts
export const getBankAccounts = async () => {...};
export const updateBankAccountBalance = async (id, amount) => {...};

// budgetService.ts
export const createBudget = async (data) => {...};

// financialReportService.ts
export const generateReport = async (params) => {...};
```

### Issue 5: Timestamp Conversion Errors
```typescript
// ❌ WRONG: Direct date usage
const event = {
  startDate: new Date()  // Will fail in Firestore
};

// ✅ CORRECT: Use Firestore Timestamp
import { Timestamp } from 'firebase/firestore';

const event = {
  startDate: Timestamp.fromDate(new Date())
};

// ✅ Reading from Firestore
const eventDoc = await getDoc(docRef);
const eventData = {
  ...eventDoc.data(),
  startDate: safeTimestampToISO(eventDoc.data().startDate)
};
```

---

## 🎯 Development Workflow

### Before Starting Development
1. **Check Global Settings**
   ```typescript
   // Does this feature need config?
   // Check: src/config/global*.ts
   ```

2. **Review Module Structure**
   ```bash
   # Follow established pattern
   src/modules/[module_name]/
     ├── components/
     ├── pages/
     ├── services/
     └── types/
   ```

3. **Check Existing Similar Features**
   ```bash
   # Search for similar implementations
   grep -r "similar_feature_name" src/
   ```

### During Development
1. **Use Global Configs**
   ```typescript
   ✅ globalComponentService.getTableConfig()
   ✅ globalValidationService.validateEmail()
   ✅ globalDateService.formatDate()
   ❌ Inline configuration
   ```

2. **Follow Type Safety**
   ```typescript
   ✅ Explicit types on all functions
   ✅ No 'any' types
   ✅ Use existing types from @/types
   ```

3. **Implement Permission Checks**
   ```typescript
   ✅ Check permissions before operations
   ✅ Use usePermission hook in UI
   ✅ Handle permission denied gracefully
   ```

### Before Commit
1. **Run Compliance Check**
   ```typescript
   await globalSettingsCommander.checkFileCompliance(filePath);
   // Target: ≥ 90/100
   ```

2. **Run Type Check**
   ```bash
   npm run type-check
   ```

3. **Test Primary Flow**
   - Login → Navigate → Perform Action → Verify Result

4. **Update Consumers**
   - If you changed a service, update all components using it
   - If you changed a type, update all references

---

## 📚 Key Files Reference

### Global Configuration
```
src/config/
├── globalCollections.ts       # Firebase collection IDs
├── globalPermissions.ts        # RBAC permission system
├── globalSystemSettings.ts     # System-wide settings
├── globalComponentSettings.ts  # UI component defaults
├── globalValidationSettings.ts # Validation rules
├── globalDateSettings.ts       # Date formats
├── globalSettingsCommander.ts  # Compliance checker
└── index.ts                    # Unified exports
```

### Core Services
```
src/services/
├── firebase.ts                 # Firebase initialization
├── authService.ts              # User authentication
├── databaseWriteService.ts     # Generic DB writes
├── dataValidationService.ts    # Data validation
└── categoryService.ts          # Category management
```

### Module Services (Examples)
```
src/modules/finance/services/
├── financeService.ts           # Core finance operations
├── budgetActualService.ts      # Budget management
├── projectAccountService.ts    # Project accounts
└── financialReportService.ts   # Report generation

src/modules/member/services/
├── memberService.ts            # Member CRUD
└── membershipTaskPolicyService.ts # Task policies

src/modules/event/services/
├── eventService.ts             # Event operations
└── EventFormValidator.ts       # Form validation
```

### Type Definitions
```
src/types/
├── index.ts                    # Common types (Member, Event, User)
├── finance.ts                  # Finance domain types
├── event.ts                    # Event domain types
├── rbac.ts                     # Permission types
└── awards.ts                   # Award types
```

---

## 🔍 Architecture Decision Records (ADRs)

### ADR-001: Use Zustand over Redux
**Decision**: Primary state management is Zustand  
**Reason**: Lighter, simpler API, less boilerplate  
**Impact**: Redux Toolkit is being removed

### ADR-002: Global Configuration System
**Decision**: All configs centralized in `src/config/global*.ts`  
**Reason**: DRY principle, single source of truth  
**Impact**: No hardcoded values allowed

### ADR-003: No Repository Layer (Current)
**Decision**: Services directly call Firebase  
**Reason**: Simplicity for BaaS architecture  
**Impact**: Tight coupling to Firebase  
**Future**: Consider Repository pattern for flexibility

### ADR-004: Firestore Security Rules Temporary
**Decision**: Open rules until 2025-10-10  
**Reason**: Development convenience  
**Impact**: **CRITICAL: Must update before expiry**

### ADR-005: Module-Based Architecture
**Decision**: Feature modules over layer-based  
**Reason**: Better scalability and team autonomy  
**Impact**: Each module is self-contained

---

## 📋 Checklists

### New Feature Checklist
- [ ] Create feature in appropriate module
- [ ] Define TypeScript types in `types/`
- [ ] Implement service layer with global config imports
- [ ] Add permission checks
- [ ] Create UI components using global component config
- [ ] Add form validation using global validation rules
- [ ] Test with different user roles
- [ ] Update affected consumers
- [ ] Run compliance check (≥90/100)
- [ ] Manual E2E test

### Code Review Checklist
- [ ] No hardcoded strings/numbers (use global config)
- [ ] All Firebase calls use `GLOBAL_COLLECTIONS.*`
- [ ] No `undefined` values sent to Firebase
- [ ] Permission checks present where needed
- [ ] TypeScript strict mode passes
- [ ] Component follows naming conventions
- [ ] Service layer is focused (<500 lines)
- [ ] Error handling is comprehensive
- [ ] No console.log in production code

### Refactoring Checklist
- [ ] Identify all consumers of changing component
- [ ] Write tests before refactoring (if none exist)
- [ ] Make changes incrementally
- [ ] Verify each step doesn't break functionality
- [ ] Update all consumers
- [ ] Run full compliance check
- [ ] Document breaking changes

---

## 🚀 Quick Start Commands

```bash
# Development
npm run dev                # Start dev server (port 3000)

# Build
npm run build              # Production build with type check
npm run build:fast         # Build without type check

# Quality
npm run type-check         # TypeScript validation
npm run lint               # ESLint check

# Firebase
npm run firebase:emulators # Start local Firebase
npm run firebase:deploy    # Deploy Firestore rules

# Utilities
npm run init:events        # Initialize event data
npm run init:global-settings # Initialize global settings (NEW)
```

---

## 📊 Performance Targets

### Load Time
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Largest Contentful Paint: < 2.5s

### Runtime Performance
- List rendering (1000 items): < 200ms
- Form submission: < 500ms
- Page navigation: < 100ms

### Bundle Size
- Initial bundle: < 500KB (gzipped)
- Lazy-loaded routes: < 200KB each
- Total app size: < 2MB

---

## 🔒 Security Guidelines

### Authentication
```typescript
// ✅ Always check auth state
const { user } = useAuthStore();
if (!user) return <Navigate to="/login" />;

// ✅ Verify permissions
const { hasPermission } = usePermission(user.id, module, action);
```

### Input Validation
```typescript
// ✅ Validate on both client and server
const schema = globalValidationService.createSchema({
  email: 'email',
  phone: 'phone',
  password: 'password'
});

// ✅ Sanitize before Firestore
const sanitized = cleanUndefinedValues(formData);
```

### XSS Prevention
```typescript
// ✅ Use Ant Design components (auto-escaped)
<Typography.Text>{userInput}</Typography.Text>

// ❌ Don't use dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

---

## 🎓 Learning Resources

### Internal Documentation
- `docs/getting-started/README.md` - Project overview
- `docs/features/` - Feature-specific docs
- `docs/technical/architecture/` - Architecture details

### External Resources
- [Ant Design](https://ant.design) - UI component library
- [Firebase Docs](https://firebase.google.com/docs) - Backend services
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [React Hook Form](https://react-hook-form.com) - Form handling

---

## 🔄 Migration Path (Future)

### Phase 1: Code Quality (1-2 months)
- [ ] Unified collection ID references (100%)
- [ ] Split large service files (<500 lines each)
- [ ] Add unit tests (>30% coverage)
- [ ] Implement global error handling

### Phase 2: Architecture (2-3 months)
- [ ] Introduce Repository pattern
- [ ] Implement internationalization (i18n)
- [ ] Performance optimization (virtualization, lazy loading)
- [ ] Increase test coverage (>60%)

### Phase 3: Scalability (3-6 months)
- [ ] API abstraction layer
- [ ] Event-driven architecture
- [ ] Microservices preparation
- [ ] Monitoring & observability

---

## ⚡ Emergency Procedures

### Firestore Rules Expiry (2025-10-10)
```bash
# URGENT: Update production rules
firebase deploy --only firestore:rules

# Backup current data
firebase firestore:export backup-$(date +%Y%m%d)
```

### Production Incident
1. **Rollback**: `git revert [commit]` + redeploy
2. **Check Logs**: Firebase Console > Firestore > Usage
3. **Notify Team**: Report in team channel
4. **Post-mortem**: Document in `docs/technical/troubleshooting/`

### Data Corruption
1. **Stop writes**: Disable affected features
2. **Export data**: `firebase firestore:export`
3. **Analyze**: Check transaction logs
4. **Restore**: From last known good backup
5. **Verify**: Run data integrity checks

---

## 📝 Final Notes

### Critical Reminders
1. **NEVER** hardcode collection IDs - use `GLOBAL_COLLECTIONS.*`
2. **ALWAYS** convert `undefined` to `null` before Firebase writes
3. **ALWAYS** check permissions before sensitive operations
4. **ALWAYS** use global validation for forms
5. **ALWAYS** run compliance check before commit (≥90/100)

### Support Contacts
- **Technical Issues**: Check `docs/technical/troubleshooting/`
- **Architecture Questions**: Review this document
- **Emergency**: Follow emergency procedures above

---

## 📖 Quick Reference Tables

### Business Rules Summary

#### Member Fee Standards
| Member Category | New Member Fee | Renewal Fee | Tasks Required |
|----------------|---------------|-------------|----------------|
| Official Member | RM 480 | RM 350 | 3 events + 1 course + 1 committee role |
| Associate Member | RM 250 | RM 200 | 2 events |
| Honorary Member | RM 0 | RM 0 | None |
| Visiting Member | RM 100 | RM 100 | None |

#### Event Pricing Tiers
| Member Category | Price Tier | Typical Discount |
|----------------|-----------|------------------|
| Official/Associate/Honorary | `memberPrice` | ~30% off regular |
| Visiting/Alumni | `alumniPrice` | ~20% off regular |
| Committee Member | FREE | 100% off |
| Guest/Non-member | `regularPrice` | No discount |
| Early Bird (All) | `earlyBirdPrice` | ~15% off base price |

#### Transaction Purpose Hierarchy
```
Level 0 (Main)     Level 1 (Business)        Level 2 (Specific)
────────────────────────────────────────────────────────────────
收入类             → 会员费                  → 2025新会员费
                                            → 2025续费会员费
                                            → 准会员费
                   → 项目收入                → 2022项目
                                            → 2023项目
                                            → 2024项目
                   → 赞助收入                → 企业赞助
                                            → 个人捐赠

支出类             → 办公支出                → 审计费
                                            → 电费
                                            → 租金
                   → 项目支出                → 活动费用
                                            → 场地租赁
```

#### Fiscal Year Calendar
| Period | Fiscal Year | Example Dates |
|--------|-------------|---------------|
| Oct-Dec | Current Year | 2024-10-01 to 2024-12-31 = FY 2024 |
| Jan-Sep | Previous Year | 2025-01-01 to 2025-09-30 = FY 2024 |

#### Transaction Number Format
| Component | Format | Example | Notes |
|-----------|--------|---------|-------|
| Prefix | TXN | TXN | Fixed |
| Year | YYYY | 2024 | Fiscal year |
| Account | XXXX | 1234 | Last 4 digits of account |
| Sequence | NNNN | 0001 | Sequential, resets per year |
| **Full** | TXN-YYYY-XXXX-NNNN | TXN-2024-1234-0001 | Complete format |

### Configuration Keys Quick Reference

#### Theme (17 keys)
```
theme-primary-color, theme-success-color, theme-warning-color, theme-error-color,
theme-text-color, theme-font-size-base, theme-border-radius-base, ...
```

#### Components (20+ keys)
```
table-1-page-size, table-1-size, button-primary-bg, button-secondary-bg,
form-1-layout, modal-1-width, list-1-item-padding, card-1-shadow, ...
```

#### Data Formats (15+ keys)
```
date-display-format, date-api-format, number-decimal-separator,
currency-my-symbol, phone-my-format, member-id-format, ...
```

### New Collections Added (5)
1. `userOperationLogs` - Audit trail and undo support
2. `onlineUsers` - Real-time online user list
3. `onlineUsersStats` - Online statistics
4. `pageViews` - Page view tracking
5. `pageViewsStats` - Aggregated page statistics

### Critical Implementation Notes

#### MUST Implement Before Production
- [ ] Enable operation logging for all critical operations (CREATE, UPDATE, DELETE)
- [ ] Integrate online user tracking in App.tsx
- [ ] Add page view tracking to router
- [ ] Set up periodic cleanup for stale sessions (every 5 minutes)
- [ ] Configure Firestore indexes for new collections
- [ ] Update Firestore security rules for new collections
- [ ] Test undo functionality thoroughly
- [ ] Implement member fee auto-matching
- [ ] Configure event pricing rules
- [ ] Validate member category task requirements

#### Performance Considerations
- Operation logs: Enable batch writing for bulk operations
- Online users: Use Firestore real-time listeners efficiently
- Page views: Aggregate stats daily to reduce document reads
- Auto-matching: Run as background job, not real-time

#### Security Considerations
- Operation logs: Limit access to admin only
- Online users: Don't expose IP addresses to non-admins
- Page views: Anonymize data after 90 days
- Undo operations: Require elevated permissions

---

**Remember**: This is a production system serving real users. Code quality, security, and reliability are paramount. When in doubt, refer to global configs and existing patterns.

**Version**: 2.0  
**Last Updated**: 2025-01-13  
**Next Review**: 2025-04-13  
**Total Collections**: 46 Firestore collections  
**Total Configuration Keys**: 100+  
**Total Business Rules**: 10 critical rules documented

