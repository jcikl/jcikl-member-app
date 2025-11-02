/**
 * Member Detail View Component
 * 会员详情视图组件
 * 
 * 共享组件，用于会员详情页面和个人资料页面
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tag, 
  Avatar, 
  Space, 
  Button, 
  message,
  Row,
  Col,
  Typography,
  Tabs,
  Empty,
  Table,
  Divider,
  Input,
  Select,
  Form,
  DatePicker,
} from 'antd';
import dayjs from 'dayjs';
import {
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { updateMember } from '../../services/memberService';
import type { Member } from '../../types';
import { 
  MEMBER_STATUS_OPTIONS, 
  MEMBER_CATEGORY_OPTIONS, 
  MEMBER_LEVEL_OPTIONS 
} from '../../types';
import { getMemberFeesByMemberId } from '@/modules/finance/services/memberFeeService';
import { getTransactions } from '@/modules/finance/services/transactionService';
import type { MemberFee } from '@/modules/finance/types';
import type { Transaction } from '@/modules/finance/types';
import { TaskProgressCard } from '../TaskProgressCard';
import { getHobbyOptions, updateHobbyOptionsFromSelection, extractMissingOptionsFromMemberData } from '@/services/dynamicOptionsService';
import './styles.css';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface MemberDetailViewProps {
  member: Member;
  currentUserId: string;
  onUpdate?: (updatedMember: Member) => void;
  showEditButton?: boolean;
}

/**
 * Member Detail View Component
 */
export const MemberDetailView: React.FC<MemberDetailViewProps> = ({
  member,
  currentUserId,
  onUpdate,
  showEditButton = true,
}) => {
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hobbyOptions, setHobbyOptions] = useState<string[]>([]);
  const [customHobby, setCustomHobby] = useState('');
  const [sessionNewHobbies, setSessionNewHobbies] = useState<string[]>([]); // 本次会话新增的兴趣爱好

  // ========== Load Dynamic Options ==========
  useEffect(() => {
    const loadHobbyOptions = async () => {
      const options = await getHobbyOptions();
      setHobbyOptions(options);
    };
    loadHobbyOptions();
  }, []);

  // ========== Global Editing Functions ==========
  
  /**
   * Safely convert date value to dayjs object
   */
  const safeDateToDayjs = (dateValue: any): dayjs.Dayjs | null => {
    if (!dateValue) return null;
    // Check for empty object
    if (typeof dateValue === 'object' && Object.keys(dateValue).length === 0) return null;
    
    try {
      // Handle string
      if (typeof dateValue === 'string' && dateValue) {
        const parsed = dayjs(dateValue);
        return parsed.isValid() ? parsed : null;
      }
      // Handle Firestore Timestamp
      if (typeof dateValue === 'object' && 'seconds' in dateValue) {
        const parsed = dayjs(dateValue.seconds * 1000);
        return parsed.isValid() ? parsed : null;
      }
    } catch {
      return null;
    }
    return null;
  };
  
  const handleStartEdit = async () => {
    if (!member) return;
    
    // Extract member's existing hobbies
    const memberHobbies = (() => {
      const h = member.profile.hobbies;
      if (!h) return [];
      if (Array.isArray(h)) return h;
      if (typeof h === 'string') {
        return h.split(',').map((s) => s.trim()).filter((s) => s);
      }
      return [];
    })();
    
    // Use service to find hobbies that are in member's data but not in global options
    if (memberHobbies.length > 0) {
      const missingHobbies = await extractMissingOptionsFromMemberData(memberHobbies);
      if (missingHobbies.length > 0) {
        setSessionNewHobbies(missingHobbies);
        console.log('📝 [MemberDetailView] 发现会员已有但不在全局选项中的兴趣爱好:', missingHobbies);
      }
    }
    
    // Initialize form with current member data
    const formData: any = {
      // Top-level fields
      name: member.profile.name || member.name || '',
      email: member.profile.email || member.email || '',
      phone: member.profile.phone || member.phone || '',
      status: (member as any).profile?.status || member.status || '',
      level: (member as any).profile?.level || member.level || '',
      
      // Profile fields
      fullNameNric: member.profile.fullNameNric || '',
      nricOrPassport: member.profile.nricOrPassport || '',
      gender: member.profile.gender || '',
      alternativePhone: member.profile.alternativePhone || '',
      whatsappGroup: (member as any).profile?.whatsappGroup === 'Yes' || (member as any).profile?.whatsappGroup === true ? 'Yes' : 'No',
      nationality: member.profile.nationality || 'Malaysia',
      race: (() => {
        const r = member.profile.race;
        if (!r) return '';
        if (['Chinese', 'Indian', 'Malay'].includes(r)) return r;
        return 'Other';
      })(),
      raceOther: (() => {
        const r = member.profile.race;
        if (!r) return '';
        if (['Chinese', 'Indian', 'Malay'].includes(r)) return '';
        return r;
      })(),
      birthDate: safeDateToDayjs(member.profile.birthDate),
      profilePhotoUrl: member.profile.profilePhotoUrl || '',
      linkedin: member.profile.linkedin || '',
      hobbies: (() => {
        const h = member.profile.hobbies;
        if (!h) return [];
        if (Array.isArray(h)) return h;
        if (typeof h === 'string') {
          // Try to parse if it's a comma-separated string
          return h.split(',').map((s) => s.trim()).filter((s) => s);
        }
        return [];
      })(),
      
      // Address fields
      address: (() => {
        const addr = member.profile.address;
        if (!addr) return '';
        if (typeof addr === 'string') return addr;
        if (typeof addr === 'object') {
          const parts = [
            addr.street,
            addr.city,
            addr.state,
            addr.postcode,
            addr.country,
          ].filter(Boolean);
          return parts.join(', ');
        }
        return '';
      })(),
      
      // Emergency Contact fields
      emergencyContactName: member.profile.emergencyContact?.name || '',
      emergencyContactPhone: member.profile.emergencyContact?.phone || '',
      emergencyContactRelationship: member.profile.emergencyContact?.relationship || '',
      
      // Social Media fields
      facebook: member.profile.socialMedia?.facebook || '',
      instagram: member.profile.socialMedia?.instagram || '',
      wechat: member.profile.socialMedia?.wechat || '',
      
      // Business fields
      company: (member as any).business?.company || member.profile.company || '',
      departmentAndPosition: (member as any).business?.departmentAndPosition || member.profile.departmentAndPosition || '',
      companyWebsite: (member as any).business?.companyWebsite || '',
      companyIntro: (member as any).business?.companyIntro || '',
      acceptInternationalBusiness: (member as any).business?.acceptInternationalBusiness || '',
      ownIndustry: Array.isArray((member as any).business?.ownIndustry) ? (member as any).business.ownIndustry : [],
      interestedIndustries: Array.isArray((member as any).business?.interestedIndustries) ? (member as any).business.interestedIndustries : [],
      businessCategories: Array.isArray((member as any).business?.businessCategories) ? (member as any).business.businessCategories : [],
      
      // JCI Career fields
      memberId: (member as any).jciCareer?.memberId || member.memberId || '',
      category: (member as any).jciCareer?.category || member.category || '',
      chapter: (member as any).jciCareer?.chapter || member.chapter || '',
      chapterId: (member as any).jciCareer?.chapterId || member.chapterId || '',
      joinDate: safeDateToDayjs((member as any).jciCareer?.joinDate || member.joinDate),
      paymentDate: safeDateToDayjs((member as any).jciCareer?.paymentDate),
      paymentVerifiedDate: safeDateToDayjs((member as any).jciCareer?.paymentVerifiedDate),
      endorsementDate: safeDateToDayjs((member as any).jciCareer?.endorsementDate),
      senatorId: (member as any).jciCareer?.senatorId || '',
      worldRegion: (member as any).jciCareer?.worldRegion || '',
      countryRegion: (member as any).jciCareer?.countryRegion || '',
      country: (member as any).jciCareer?.country || '',
      introducerName: (member as any).jciCareer?.introducerName || '',
      jciPosition: (member as any).jciCareer?.jciPosition || '',
      membershipCategory: (member as any).jciCareer?.membershipCategory || '',
      jciBenefitsExpectation: (member as any).jciCareer?.jciBenefitsExpectation || '',
      jciEventInterests: (member as any).jciCareer?.jciEventInterests || '',
      activeMemberHow: (member as any).jciCareer?.activeMemberHow || '',
      fiveYearsVision: (member as any).jciCareer?.fiveYearsVision || '',
      paymentSlipUrl: (member as any).jciCareer?.paymentSlipUrl || '',
      
      // Clothing & Items fields
      shirtSize: member.profile.shirtSize || '',
      jacketSize: member.profile.jacketSize || '',
      nameToBeEmbroidered: member.profile.nameToBeEmbroidered || '',
      tshirtReceivingStatus: member.profile.tshirtReceivingStatus || '',
      cutting: member.profile.cutting || '',
    };
    
    form.setFieldsValue(formData);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.resetFields();
    setCustomHobby('');
    setSessionNewHobbies([]); // 清空本次会话新增的选项
  };

  const handleSaveAll = async () => {
    if (!member || !currentUserId) return;
    
    try {
      setSaving(true);
      const values = form.getFieldsValue();
      console.log('📝 [MemberDetailView] Form values:', values);
      
      // Prepare update data - 使用统一的字段映射，避免重复
      const updateData: any = {};
      
      // Top-level fields
      if (values.name !== undefined) updateData.name = values.name;
      if (values.email !== undefined) updateData.email = values.email;
      if (values.phone !== undefined) updateData.phone = values.phone;
      if (values.status !== undefined) updateData.status = values.status;
      if (values.level !== undefined) updateData.level = values.level;
      if (values.chapter !== undefined) updateData.chapter = values.chapter;
      if (values.chapterId !== undefined) updateData.chapterId = values.chapterId;
      
      // Profile fields with dot notation
      if (values.fullNameNric !== undefined) updateData['profile.fullNameNric'] = values.fullNameNric || '';
      if (values.nricOrPassport !== undefined) updateData['profile.nricOrPassport'] = values.nricOrPassport || '';
      if (values.gender !== undefined) updateData['profile.gender'] = values.gender || '';
      if (values.alternativePhone !== undefined) updateData['profile.alternativePhone'] = values.alternativePhone || '';
      if (values.whatsappGroup !== undefined) updateData['profile.whatsappGroup'] = values.whatsappGroup || '';
      if (values.nationality !== undefined) updateData['profile.nationality'] = values.nationality || '';
      if (values.race !== undefined) {
        // If "Other" is selected, use raceOther value; otherwise use race value
        const raceValue = values.race === 'Other' ? (values.raceOther || 'Other') : values.race;
        updateData['profile.race'] = raceValue || '';
      }
      if (values.birthDate !== undefined && values.birthDate !== null && values.birthDate !== '') {
        updateData['profile.birthDate'] = values.birthDate.format ? values.birthDate.format('YYYY-MM-DD') : values.birthDate;
      }
      if (values.profilePhotoUrl !== undefined) updateData['profile.profilePhotoUrl'] = values.profilePhotoUrl || '';
      if (values.hobbies !== undefined) {
        const hobbiesArray = Array.isArray(values.hobbies) ? values.hobbies : [];
        updateData['profile.hobbies'] = hobbiesArray;
        
        // 异步更新全局兴趣爱好选项（不阻塞保存）
        if (hobbiesArray.length > 0) {
          updateHobbyOptionsFromSelection(hobbiesArray, hobbyOptions, currentUserId).catch((err) => {
            console.warn('Failed to update hobby options:', err);
          });
        }
      }
      
      // Address field
      if (values.address !== undefined) updateData['profile.address'] = values.address || '';
      
      // Emergency Contact fields
      if (values.emergencyContactName !== undefined || values.emergencyContactPhone !== undefined || values.emergencyContactRelationship !== undefined) {
        updateData['profile.emergencyContact'] = {
          name: values.emergencyContactName || '',
          phone: values.emergencyContactPhone || '',
          relationship: values.emergencyContactRelationship || '',
        };
      }
      
      // Social Media fields
      if (values.linkedin !== undefined || values.facebook !== undefined || values.instagram !== undefined || values.wechat !== undefined) {
        updateData['profile.linkedin'] = values.linkedin || '';
        updateData['profile.socialMedia'] = {
          facebook: values.facebook || '',
          instagram: values.instagram || '',
          wechat: values.wechat || '',
        };
      }
      
      // Clothing & Items fields
      if (values.shirtSize !== undefined) updateData['profile.shirtSize'] = values.shirtSize || '';
      if (values.jacketSize !== undefined) updateData['profile.jacketSize'] = values.jacketSize || '';
      if (values.nameToBeEmbroidered !== undefined) updateData['profile.nameToBeEmbroidered'] = values.nameToBeEmbroidered || '';
      if (values.tshirtReceivingStatus !== undefined) updateData['profile.tshirtReceivingStatus'] = values.tshirtReceivingStatus || '';
      if (values.cutting !== undefined) updateData['profile.cutting'] = values.cutting || '';
      
      // Business fields
      if (values.company !== undefined) {
        updateData['business.company'] = values.company || '';
      }
      if (values.departmentAndPosition !== undefined) {
        updateData['business.departmentAndPosition'] = values.departmentAndPosition || '';
      }
      if (values.companyWebsite !== undefined) updateData['business.companyWebsite'] = values.companyWebsite || '';
      if (values.companyIntro !== undefined) updateData['business.companyIntro'] = values.companyIntro || '';
      if (values.acceptInternationalBusiness !== undefined) updateData['business.acceptInternationalBusiness'] = values.acceptInternationalBusiness || '';
      if (values.ownIndustry !== undefined) {
        updateData['business.ownIndustry'] = Array.isArray(values.ownIndustry) ? values.ownIndustry : [];
      }
      if (values.interestedIndustries !== undefined) {
        updateData['business.interestedIndustries'] = Array.isArray(values.interestedIndustries) ? values.interestedIndustries : [];
      }
      if (values.businessCategories !== undefined) {
        updateData['business.businessCategories'] = Array.isArray(values.businessCategories) ? values.businessCategories : [];
        console.log('📦 [MemberDetailView] businessCategories:', values.businessCategories, '→', updateData['business.businessCategories']);
      }
      
      // JCI Career fields - 日期字段统一转换为YYYY-MM-DD字符串格式
      if (values.memberId !== undefined) updateData['jciCareer.memberId'] = values.memberId || '';
      if (values.joinDate !== undefined && values.joinDate !== null && values.joinDate !== '') {
        updateData['jciCareer.joinDate'] = values.joinDate.format ? values.joinDate.format('YYYY-MM-DD') : values.joinDate;
      }
      if (values.senatorId !== undefined) updateData['jciCareer.senatorId'] = values.senatorId || '';
      if (values.worldRegion !== undefined) updateData['jciCareer.worldRegion'] = values.worldRegion || '';
      if (values.countryRegion !== undefined) updateData['jciCareer.countryRegion'] = values.countryRegion || '';
      if (values.country !== undefined) updateData['jciCareer.country'] = values.country || '';
      if (values.introducerName !== undefined) updateData['jciCareer.introducerName'] = values.introducerName || '';
      if (values.jciPosition !== undefined) updateData['jciCareer.jciPosition'] = values.jciPosition || '';
      if (values.membershipCategory !== undefined) updateData['jciCareer.membershipCategory'] = values.membershipCategory || '';
      if (values.jciBenefitsExpectation !== undefined) updateData['jciCareer.jciBenefitsExpectation'] = values.jciBenefitsExpectation || '';
      if (values.jciEventInterests !== undefined) updateData['jciCareer.jciEventInterests'] = values.jciEventInterests || '';
      if (values.activeMemberHow !== undefined) updateData['jciCareer.activeMemberHow'] = values.activeMemberHow || '';
      if (values.fiveYearsVision !== undefined) updateData['jciCareer.fiveYearsVision'] = values.fiveYearsVision || '';
      if (values.paymentDate !== undefined && values.paymentDate !== null && values.paymentDate !== '') {
        updateData['jciCareer.paymentDate'] = values.paymentDate.format ? values.paymentDate.format('YYYY-MM-DD') : values.paymentDate;
      }
      if (values.paymentSlipUrl !== undefined) updateData['jciCareer.paymentSlipUrl'] = values.paymentSlipUrl || '';
      if (values.paymentVerifiedDate !== undefined && values.paymentVerifiedDate !== null && values.paymentVerifiedDate !== '') {
        updateData['jciCareer.paymentVerifiedDate'] = values.paymentVerifiedDate.format ? values.paymentVerifiedDate.format('YYYY-MM-DD') : values.paymentVerifiedDate;
      }
      if (values.endorsementDate !== undefined && values.endorsementDate !== null && values.endorsementDate !== '') {
        updateData['jciCareer.endorsementDate'] = values.endorsementDate.format ? values.endorsementDate.format('YYYY-MM-DD') : values.endorsementDate;
      }
      
      console.log('📝 [MemberDetailView] 准备更新数据:', updateData);
      
      const updated = await updateMember(member.id, updateData, currentUserId);
      setIsEditing(false);
      setCustomHobby('');
      setSessionNewHobbies([]); // 清空本次会话新增的选项
      message.success('保存成功');
      
      // 保存成功后刷新兴趣爱好选项列表（新增选项已被保存到Firestore）
      if (values.hobbies && Array.isArray(values.hobbies) && values.hobbies.length > 0) {
        const refreshedOptions = await getHobbyOptions();
        setHobbyOptions(refreshedOptions);
      }
      
      if (onUpdate) {
        onUpdate(updated);
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ========== Helper Functions ==========
  
  /**
   * Type guard for Firestore Timestamp
   */
  const isFirestoreTimestamp = (val: unknown): val is { seconds: number; nanoseconds: number } => {
    return (
      val !== null &&
      val !== undefined &&
      typeof val === 'object' &&
      'seconds' in val &&
      'nanoseconds' in val
    );
  };
  
  /**
   * Render field - editable in edit mode, read-only otherwise
   */
  const renderField = (
    fieldName: string,
    label: string,
    value: string | undefined | null | any,
    type: 'text' | 'select' | 'multiselect' | 'tags' | 'textarea' | 'date' | 'buttonGroup' | 'buttonGroupMultiple' = 'text',
    options?: Array<{ label: string; value: string }> | string[],
    align: 'middle' | 'top' = 'middle'
  ) => {
    // Safely convert value to string
    let displayValue = '-';
    if (value !== null && value !== undefined) {
      if (typeof value === 'string') {
        displayValue = value || '-';
      } else if (typeof value === 'number') {
        displayValue = String(value);
      } else if (typeof value === 'object' && Object.keys(value).length === 0) {
        displayValue = '-';
      } else {
        displayValue = String(value);
      }
    }

    if (isEditing) {
      return (
        <Row gutter={[8, 8]} align={align}>
          <Col flex="120px">
            <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
          </Col>
          <Col flex="auto">
            {type === 'buttonGroup' && options ? (
              <div style={{ width: '100%' }}>
                <Form.Item name={fieldName} hidden>
                  <Input />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues[fieldName] !== currentValues[fieldName]}>
                  {({ getFieldValue, setFieldValue }) => {
                    const currentValue = getFieldValue(fieldName);
                    return (
                      <Space.Compact size="small" style={{ width: '100%', display: 'flex' }}>
                        {options.map((option) => (
                          <Button
                            key={option.value}
                            type={currentValue === option.value ? 'primary' : 'default'}
                            onClick={() => setFieldValue(fieldName, option.value)}
                            style={{ flex: 1 }}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </Space.Compact>
                    );
                  }}
                </Form.Item>
              </div>
            ) : type === 'buttonGroupMultiple' && options ? (
              <div style={{ width: '100%' }}>
                <Form.Item name={fieldName} hidden>
                  <Input />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues[fieldName] !== currentValues[fieldName]}>
                  {({ getFieldValue, setFieldValue }) => {
                    const currentValue = getFieldValue(fieldName);
                    const values = Array.isArray(currentValue) ? currentValue : [];
                    const optionsCount = options.length;
                    
                    // For many options (>10), use wrapped layout; for few options (<=10), use compact layout
                    if (optionsCount > 10) {
                      return (
                        <Space wrap size="small" style={{ width: '100%' }}>
                          {options.map((option) => (
                            <Button
                              key={option.value}
                              type={values.includes(option.value) ? 'primary' : 'default'}
                              size="small"
                              onClick={() => {
                                const newValues = values.includes(option.value)
                                  ? values.filter((v) => v !== option.value)
                                  : [...values, option.value];
                                setFieldValue(fieldName, newValues);
                              }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </Space>
                      );
                    } else {
                      return (
                        <Space.Compact size="small" style={{ width: '100%', display: 'flex' }}>
                          {options.map((option) => (
                            <Button
                              key={option.value}
                              type={values.includes(option.value) ? 'primary' : 'default'}
                              onClick={() => {
                                const newValues = values.includes(option.value)
                                  ? values.filter((v) => v !== option.value)
                                  : [...values, option.value];
                                setFieldValue(fieldName, newValues);
                              }}
                              style={{ flex: 1 }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </Space.Compact>
                      );
                    }
                  }}
                </Form.Item>
              </div>
            ) : type === 'select' && options ? (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <Select
                  options={Array.isArray(options) && options.length > 0 && typeof options[0] === 'string' 
                    ? options.map((opt) => ({ label: opt, value: opt }))
                    : options as Array<{ label: string; value: string }>}
                  style={{ width: '100%' }}
                  size="small"
                />
              </Form.Item>
            ) : type === 'multiselect' && options ? (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <Select
                  mode="multiple"
                  options={Array.isArray(options) && options.length > 0 && typeof options[0] === 'string' 
                    ? options.map((opt) => ({ label: opt, value: opt }))
                    : options as Array<{ label: string; value: string }>}
                  style={{ width: '100%' }}
                  size="small"
                  placeholder="请选择"
                />
              </Form.Item>
            ) : type === 'tags' && options ? (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <Select
                  mode="tags"
                  options={Array.isArray(options) && options.length > 0 && typeof options[0] === 'string' 
                    ? options.map((opt) => ({ label: opt, value: opt }))
                    : options as Array<{ label: string; value: string }>}
                  style={{ width: '100%' }}
                  size="small"
                  placeholder="请选择或输入自定义选项"
                  maxTagCount="responsive"
                />
              </Form.Item>
            ) : type === 'textarea' ? (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <TextArea
                  rows={3}
                  size="small"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            ) : type === 'date' ? (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <DatePicker
                  style={{ width: '100%' }}
                  size="small"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            ) : (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <Input
                  style={{ width: '100%' }}
                  size="small"
                />
              </Form.Item>
            )}
          </Col>
        </Row>
      );
    }

    // Format date for display
    let formattedValue = displayValue;
    if (type === 'date' && value && value !== '-') {
      try {
        const date = dayjs(value);
        if (date.isValid()) {
          formattedValue = date.format('YYYY-MM-DD');
        }
      } catch {
        // Keep original value if parsing fails
      }
    }
    
    // Handle Firestore Timestamp objects
    if (isFirestoreTimestamp(value)) {
      try {
        const date = dayjs(value.seconds * 1000);
        if (date.isValid()) {
          formattedValue = type === 'date' ? date.format('YYYY-MM-DD') : date.format('YYYY-MM-DD HH:mm:ss');
        } else {
          formattedValue = '-';
        }
      } catch {
        formattedValue = '-';
      }
    }

    // Special rendering for buttonGroupMultiple in view mode
    if (type === 'buttonGroupMultiple' && options) {
      // Parse selected values from display string or array
      let selectedValues: string[] = [];
      if (Array.isArray(value)) {
        selectedValues = value;
      } else if (typeof value === 'string' && value && value !== '-') {
        selectedValues = value.split(',').map(s => s.trim()).filter(s => s);
      }
      
      return (
        <Row gutter={[8, 8]} align={align}>
          <Col flex="120px">
            <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
          </Col>
          <Col flex="auto">
            <Space wrap size="small">
              {options.map((option) => {
                const optionValue = typeof option === 'string' ? option : option.value;
                const optionLabel = typeof option === 'string' ? option : option.label;
                const isSelected = selectedValues.includes(optionValue);
                
                return (
                  <Button
                    key={optionValue}
                    type={isSelected ? 'primary' : 'default'}
                    size="small"
                    disabled={!isSelected}
                    style={{
                      opacity: isSelected ? 1 : 0.5,
                      cursor: 'default',
                    }}
                  >
                    {optionLabel}
                  </Button>
                );
              })}
            </Space>
          </Col>
        </Row>
      );
    }

    return (
      <Row gutter={[8, 8]} align={align}>
        <Col flex="120px">
          <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
        </Col>
        <Col flex="auto">
          <span style={{ fontSize: 13, color: '#000' }}>{formattedValue}</span>
        </Col>
      </Row>
    );
  };
  
  const getStatusLabel = (status: string) => {
    const option = MEMBER_STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.label || status;
  };
  
  const getCategoryLabel = (category: string) => {
    const option = MEMBER_CATEGORY_OPTIONS.find(opt => opt.value === category);
    return option?.label || category;
  };
  
  const getLevelLabel = (level: string) => {
    const option = MEMBER_LEVEL_OPTIONS.find(opt => opt.value === level);
    return option?.label || level;
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'success',
      inactive: 'default',
      pending: 'processing',
      suspended: 'error',
    };
    return colors[status] || 'default';
  };
  
  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      bronze: 'default',
      silver: 'blue',
      gold: 'gold',
      platinum: 'purple',
      diamond: 'magenta',
    };
    return colors[level] || 'default';
  };

  // 会费标签页组件
  const MemberFeesTab: React.FC<{ memberId: string }> = ({ memberId }) => {
    const [loadingFees, setLoadingFees] = useState(false);
    const [fees, setFees] = useState<MemberFee[]>([]);
    const [fallbackTxns, setFallbackTxns] = useState<Transaction[]>([]);

    useEffect(() => {
      const loadFees = async () => {
        setLoadingFees(true);
        try {
          const data = await getMemberFeesByMemberId(memberId);
          setFees(data);

          // 如果没有会费记录，尝试读取已关联的交易作为回退展示
          if (!data || data.length === 0) {
            const txnResult = await getTransactions({
              page: 1,
              limit: 50,
              category: 'member-fees',
              includeVirtual: true,
              sortBy: 'transactionDate',
              sortOrder: 'desc',
            });
            const related = txnResult.data.filter((t: any) => (t as any)?.metadata?.memberId === memberId);
            setFallbackTxns(related as Transaction[]);
          } else {
            setFallbackTxns([]);
          }
        } catch (e) {
          message.error('加载会费记录失败');
        } finally {
          setLoadingFees(false);
        }
      };
      loadFees();
    }, [memberId]);

    const columns = [
      { title: '类型', dataIndex: 'feeType', key: 'feeType', width: 120 },
      { title: '金额', dataIndex: 'expectedAmount', key: 'expectedAmount', width: 100, align: 'right' as const, render: (v: number) => `RM ${Number(v || 0).toFixed(2)}` },
      { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (s: string) => {
          const map: Record<string, { color: string; text: string }> = {
            paid: { color: 'success', text: '已付' },
            unpaid: { color: 'warning', text: '未付' },
            partial: { color: 'processing', text: '部分付款' },
            overdue: { color: 'error', text: '逾期' },
            waived: { color: 'default', text: '豁免' },
            cancelled: { color: 'default', text: '取消' },
          };
          const cfg = map[s] || { color: 'default', text: s };
          return <Tag color={cfg.color}>{cfg.text}</Tag>;
        }
      },
      { title: '到期日', dataIndex: 'dueDate', key: 'dueDate', width: 120, render: (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
      { title: '付款日', dataIndex: 'paymentDate', key: 'paymentDate', width: 120, render: (d?: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
    ];

    if (fees && fees.length > 0) {
      return (
        <Table
          size="small"
          rowKey="id"
          loading={loadingFees}
          columns={columns as any}
          dataSource={fees}
          pagination={false}
        />
      );
    }

    // 回退：显示已关联的交易提示
    const txColumns = [
      { title: '日期', dataIndex: 'transactionDate', key: 'transactionDate', width: 120, render: (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
      { title: '描述', dataIndex: 'mainDescription', key: 'mainDescription', width: 220 },
      { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' as const, render: (v: number, r: any) => `${r.transactionType === 'income' ? '+' : '-'}RM ${(v ?? 0).toFixed(2)}` },
      { title: '二次分类', dataIndex: 'txAccount', key: 'txAccount', width: 140 },
      { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    ];

    return (
      <div>
        <div style={{ marginBottom: 8, color: '#999' }}>
          未找到正式"会费记录"。已为您显示与该会员关联的"会员费交易记录"。
        </div>
        <Table
          size="small"
          rowKey="id"
          loading={loadingFees}
          columns={txColumns as any}
          dataSource={fallbackTxns}
          pagination={false}
        />
      </div>
    );
  };

  // ========== Render ==========
  
  // 统一的 Row gutter 配置
  const ROW_GUTTER: [number, number] = [16, 16];  // 标签页层面的 gutter
  
  // Log avatar display
  console.log(`👤 [MemberDetailView] Rendering member profile:`, {
    memberId: member.id,
    memberName: member.name || member.profile?.name,
    hasProfileAvatar: !!member.profile?.avatar,
    avatarUrl: member.profile?.avatar,
    isCloudinaryAvatar: member.profile?.avatar?.includes('cloudinary.com'),
  });
  
  return (
    <div className="member-detail-view">
      {/* Profile Card */}
      <Card className="profile-card" style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
            <Avatar
              size={120}
              src={member.profile.avatar}
              icon={<UserOutlined />}
              onError={() => {
                console.error(`❌ [MemberDetailView] Avatar image failed to load:`, {
                  url: member.profile.avatar,
                  memberId: member.id,
                });
                return true;
              }}
            />
          </Col>
          <Col xs={24} sm={18}>
            <Title level={2} style={{ marginBottom: 8 }}>
              {member.profile.name || member.name}
            </Title>
            <Space size="middle" wrap>
              <Tag color={getStatusColor(((member as any).profile?.status))}>
                {getStatusLabel(((member as any).profile?.status) as any)}
              </Tag>
              {member.category && (
                <Tag color="blue">{getCategoryLabel(member.category)}</Tag>
              )}
              <Tag color={getLevelColor(((member as any).profile?.level) as any)}>
                {getLevelLabel(((member as any).profile?.level) as any)}
              </Tag>
            </Space>
            <div style={{ marginTop: 16 }}>
              <Space direction="vertical" size="small">
                <Text>
                  <MailOutlined /> {((member as any).profile?.email) || '-'}
                </Text>
                <Text>
                  <PhoneOutlined /> {((member as any).profile?.phone) || '-'}
                </Text>
                {(((member as any).jciCareer?.chapter) || member.chapter) && (
                  <Text>
                    <BankOutlined /> {((member as any).jciCareer?.chapter) || '-'}
                  </Text>
                )}
              </Space>
            </div>
          </Col>
        </Row>
      </Card>
      
      {/* Tabs */}
      <Card style={{ marginBottom: 16 }}>
        <Tabs
          tabBarExtraContent={
            showEditButton ? (
              isEditing ? (
                <Space size="small">
                  <Button 
                    icon={<CheckOutlined />} 
                    type="primary"
                    loading={saving}
                    onClick={handleSaveAll}
                  >
                    保存
                  </Button>
                  <Button 
                    icon={<CloseOutlined />} 
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    取消
                  </Button>
                </Space>
              ) : (
                <Button 
                  icon={<EditOutlined />} 
                  onClick={handleStartEdit}
                >
                  编辑
                </Button>
              )
            ) : null
          }
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <Row gutter={ROW_GUTTER} align="stretch">
                  <Col xs={24} md={14}>
      {/* Basic Information */}
                    <Card title="基本信息" bordered={true} style={{ height: '100%' }}>
                      <Form form={form}>
                        {/* 基本信息 */}
                        <Divider orientation="left" style={{ margin: '8px 0 16px 0', fontSize: '14px', fontWeight: 'bold' }}>基本信息</Divider>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('name', '姓名', member.profile.name || member.name)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('fullNameNric', '身份证全名', member.profile.fullNameNric)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('nricOrPassport', '身份证(或护照)', member.profile.nricOrPassport)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('gender', '性别', member.profile.gender, 'buttonGroup', [
                              { label: 'Male', value: 'Male' },
                              { label: 'Female', value: 'Female' },
                            ])}
                          </Col>
                          <Col xs={24} md={24}>
                            {renderField('race', '种族', (() => {
                              const r = member.profile.race;
                              if (!r) return '';
                              if (['Chinese', 'Indian', 'Malay'].includes(r)) return r;
                              return 'Other';
                            })(), 'buttonGroup', [
                              { label: 'Chinese', value: 'Chinese' },
                              { label: 'Indian', value: 'Indian' },
                              { label: 'Malay', value: 'Malay' },
                              { label: 'Other', value: 'Other' },
                            ])}
                          </Col>
                          {isEditing && (
                            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.race !== curr.race}>
                              {({ getFieldValue }) => {
                                const raceValue = getFieldValue('race');
                                if (raceValue === 'Other') {
                                  return (
                                    <Col xs={24} md={24}>
                                      <Row gutter={[8, 8]} align="middle">
                                        <Col flex="120px">
                                          <span style={{ fontSize: 13, color: '#666' }}>请输入种族</span>
                                        </Col>
                                        <Col flex="auto">
                                          <Form.Item name="raceOther" style={{ marginBottom: 0, width: '100%' }}>
                                            <Input
                                              style={{ width: '100%' }}
                                              size="small"
                                              placeholder="请输入具体种族名称"
                                            />
                                          </Form.Item>
                                        </Col>
                                      </Row>
                                    </Col>
                                  );
                                }
                                return null;
                              }}
                            </Form.Item>
                          )}
                          {!isEditing && member.profile.race && !['Chinese', 'Indian', 'Malay'].includes(member.profile.race) && (
                            <Col xs={24} md={24}>
                              <Row gutter={[8, 8]} align="middle">
                                <Col flex="120px">
                                  <span style={{ fontSize: 13, color: '#666' }}>其他种族</span>
                                </Col>
                                <Col flex="auto">
                                  <span style={{ fontSize: 13, color: '#000' }}>{member.profile.race}</span>
                                </Col>
                              </Row>
                            </Col>
                          )}
                          <Col xs={24} md={12}>
                            {renderField('nationality', '国籍', member.profile.nationality || 'Malaysia', 'select', [
                              { label: 'Malaysia', value: 'Malaysia' },
                              { label: 'Singapore', value: 'Singapore' },
                              { label: 'China', value: 'China' },
                              { label: 'Indonesia', value: 'Indonesia' },
                              { label: 'Thailand', value: 'Thailand' },
                              { label: 'Philippines', value: 'Philippines' },
                              { label: 'Vietnam', value: 'Vietnam' },
                              { label: 'India', value: 'India' },
                              { label: 'Bangladesh', value: 'Bangladesh' },
                              { label: 'Myanmar', value: 'Myanmar' },
                              { label: 'United Kingdom', value: 'United Kingdom' },
                              { label: 'United States', value: 'United States' },
                              { label: 'Australia', value: 'Australia' },
                              { label: 'Canada', value: 'Canada' },
                              { label: 'Japan', value: 'Japan' },
                              { label: 'South Korea', value: 'South Korea' },
                              { label: 'Taiwan', value: 'Taiwan' },
                              { label: 'Hong Kong', value: 'Hong Kong' },
                              { label: 'Other', value: 'Other' },
                            ])}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('birthDate', '出生日期', (() => {
                              const bd = member.profile.birthDate;
                              if (!bd) return '';
                              // Check for empty object
                              if (typeof bd === 'object' && Object.keys(bd).length === 0) return '';
                              if (typeof bd === 'string') return bd;
                              if (typeof bd === 'object' && 'seconds' in bd) {
                                try {
                                  return dayjs((bd as any).seconds * 1000).format('YYYY-MM-DD');
                                } catch {
                                  return '';
                                }
                              }
                              return '';
                            })(), 'date')}
                          </Col>
                          <Col xs={24}>
                            {renderField('hobbies', '兴趣爱好', (() => {
                              const h = member.profile.hobbies;
                              if (!h) return '';
                              if (Array.isArray(h)) return h.join(', ');
                              if (typeof h === 'string') return h;
                              return '';
                            })(), 'buttonGroupMultiple', 
                            // 合并原始选项和本次会话新增的选项
                            [...hobbyOptions, ...sessionNewHobbies]
                              .sort((a, b) => a.localeCompare(b))
                              .map(opt => ({ label: opt, value: opt }))
                            )}
                          </Col>
                          {isEditing && (
                            <Col xs={24}>
                              <Row gutter={[8, 8]} align="middle" style={{ marginTop: 8 }}>
                                <Col flex="120px">
                                  <span style={{ fontSize: 13, color: '#666' }}>添加自定义</span>
                                </Col>
                                <Col flex="auto">
                                  <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                      size="small"
                                      placeholder="输入新的兴趣爱好，按回车或点击添加"
                                      value={customHobby}
                                      onChange={(e) => setCustomHobby(e.target.value)}
                                      onPressEnter={() => {
                                        const trimmedHobby = customHobby.trim();
                                        if (trimmedHobby) {
                                          const currentHobbies = form.getFieldValue('hobbies') || [];
                                          if (!currentHobbies.includes(trimmedHobby)) {
                                            // 添加到表单
                                            form.setFieldValue('hobbies', [...currentHobbies, trimmedHobby]);
                                            
                                            // 如果不在原始选项列表中，记录为本次会话新增
                                            if (!hobbyOptions.includes(trimmedHobby) && !sessionNewHobbies.includes(trimmedHobby)) {
                                              setSessionNewHobbies([...sessionNewHobbies, trimmedHobby]);
                                            }
                                            
                                            setCustomHobby('');
                                            message.success(`✅ 已添加: ${trimmedHobby}`);
                                          } else {
                                            message.warning('该兴趣爱好已在您的选择中');
                                          }
                                        }
                                      }}
                                    />
                                    <Button
                                      size="small"
                                      type="primary"
                                      onClick={() => {
                                        const trimmedHobby = customHobby.trim();
                                        if (trimmedHobby) {
                                          const currentHobbies = form.getFieldValue('hobbies') || [];
                                          if (!currentHobbies.includes(trimmedHobby)) {
                                            // 添加到表单
                                            form.setFieldValue('hobbies', [...currentHobbies, trimmedHobby]);
                                            
                                            // 如果不在原始选项列表中，记录为本次会话新增
                                            if (!hobbyOptions.includes(trimmedHobby) && !sessionNewHobbies.includes(trimmedHobby)) {
                                              setSessionNewHobbies([...sessionNewHobbies, trimmedHobby]);
                                            }
                                            
                                            setCustomHobby('');
                                            message.success(`✅ 已添加: ${trimmedHobby}`);
                                          } else {
                                            message.warning('该兴趣爱好已在您的选择中');
                                          }
                                        }
                                      }}
                                    >
                                      添加
                                    </Button>
                                  </Space.Compact>
                                </Col>
                              </Row>
                            </Col>
                          )}
                        </Row>
                        
                        {/* 职业与商业信息 */}
                        <Divider orientation="left" style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>职业与商业信息</Divider>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('company', '公司', (member as any).business?.company || member.profile.company)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('companyWebsite', '公司网站', (member as any).business?.companyWebsite)}
                          </Col>
                          <Col xs={24}>
                            {renderField('companyIntro', '公司介绍', (member as any).business?.companyIntro, 'textarea', undefined, 'top')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('departmentAndPosition', '部门与职位', (member as any).business?.departmentAndPosition || member.profile.departmentAndPosition)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('acceptInternationalBusiness', '接受国际业务', (member as any).business?.acceptInternationalBusiness, 'buttonGroup', [
                              { label: 'Yes', value: 'Yes' },
                              { label: 'No', value: 'No' },
                              { label: 'Willing to explore', value: 'Willing to explore' },
                            ])}
                          </Col>
                          <Col xs={24}>
                            {renderField('businessCategories', '商业类别', Array.isArray((member as any).business?.businessCategories) ? (member as any).business.businessCategories.join(', ') : '', 'buttonGroupMultiple', [
                              { label: 'Manufacturer', value: 'Manufacturer' },
                              { label: 'Distributor', value: 'Distributor' },
                              { label: 'Service Provider', value: 'Service Provider' },
                              { label: 'Retailer', value: 'Retailer' },
                            ])}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('ownIndustry', '所属行业', Array.isArray((member as any).business?.ownIndustry) ? (member as any).business.ownIndustry.join(', ') : '', 'multiselect', [
                              { label: 'Advertising, Marketing & Media', value: 'Advertising, Marketing & Media' },
                              { label: 'Agriculture & Animals', value: 'Agriculture & Animals' },
                              { label: 'Architecture, Engineering & Construction', value: 'Architecture, Engineering & Construction' },
                              { label: 'Art, Entertainment & Design', value: 'Art, Entertainment & Design' },
                              { label: 'Automotive & Accessories', value: 'Automotive & Accessories' },
                              { label: 'Food & Beverages', value: 'Food & Beverages' },
                              { label: 'Computers & IT', value: 'Computers & IT' },
                              { label: 'Consulting & Professional Services', value: 'Consulting & Professional Services' },
                              { label: 'Education & Training', value: 'Education & Training' },
                              { label: 'Event & Hospitality', value: 'Event & Hospitality' },
                              { label: 'Finance & Insurance', value: 'Finance & Insurance' },
                              { label: 'Health, Wellness & Beauty', value: 'Health, Wellness & Beauty' },
                              { label: 'Legal & Accounting', value: 'Legal & Accounting' },
                              { label: 'Manufacturing', value: 'Manufacturing' },
                              { label: 'Retail & E-Commerce', value: 'Retail & E-Commerce' },
                              { label: 'Real Estate & Property Services', value: 'Real Estate & Property Services' },
                              { label: 'Repair Services', value: 'Repair Services' },
                              { label: 'Security & Investigation', value: 'Security & Investigation' },
                              { label: 'Transport & Logistics', value: 'Transport & Logistics' },
                              { label: 'Travel & Tourism', value: 'Travel & Tourism' },
                            ])}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('interestedIndustries', '感兴趣行业', Array.isArray((member as any).business?.interestedIndustries) ? (member as any).business.interestedIndustries.join(', ') : '', 'multiselect', [
                              { label: 'Advertising, Marketing & Media', value: 'Advertising, Marketing & Media' },
                              { label: 'Agriculture & Animals', value: 'Agriculture & Animals' },
                              { label: 'Architecture, Engineering & Construction', value: 'Architecture, Engineering & Construction' },
                              { label: 'Art, Entertainment & Design', value: 'Art, Entertainment & Design' },
                              { label: 'Automotive & Accessories', value: 'Automotive & Accessories' },
                              { label: 'Food & Beverages', value: 'Food & Beverages' },
                              { label: 'Computers & IT', value: 'Computers & IT' },
                              { label: 'Consulting & Professional Services', value: 'Consulting & Professional Services' },
                              { label: 'Education & Training', value: 'Education & Training' },
                              { label: 'Event & Hospitality', value: 'Event & Hospitality' },
                              { label: 'Finance & Insurance', value: 'Finance & Insurance' },
                              { label: 'Health, Wellness & Beauty', value: 'Health, Wellness & Beauty' },
                              { label: 'Legal & Accounting', value: 'Legal & Accounting' },
                              { label: 'Manufacturing', value: 'Manufacturing' },
                              { label: 'Retail & E-Commerce', value: 'Retail & E-Commerce' },
                              { label: 'Real Estate & Property Services', value: 'Real Estate & Property Services' },
                              { label: 'Repair Services', value: 'Repair Services' },
                              { label: 'Security & Investigation', value: 'Security & Investigation' },
                              { label: 'Transport & Logistics', value: 'Transport & Logistics' },
                              { label: 'Travel & Tourism', value: 'Travel & Tourism' },
                            ])}
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={10}>
                    {/* 联系信息 */}
                    <Card title="联系信息" bordered={true} style={{ height: '100%' }}>
                      <Form form={form}>
                        {/* 个人联系方式 */}
                        <Divider orientation="left" style={{ margin: '8px 0 16px 0', fontSize: '14px', fontWeight: 'bold' }}>个人联系方式</Divider>
                        <Row gutter={[12, 12]}>
                          <Col xs={24}>
                            {renderField('phone', '电话', member.profile.phone)}
                          </Col>
                          <Col xs={24}>
                            {renderField('alternativePhone', '备用电话', member.profile.alternativePhone)}
                          </Col>
                          <Col xs={24}>
                            {renderField('whatsappGroup', 'WhatsApp群组', (member as any).profile?.whatsappGroup, 'buttonGroup', [
                              { label: 'Yes', value: 'Yes' },
                              { label: 'No', value: 'No' },
                            ])}
                          </Col>
                          <Col xs={24}>
                            {renderField('email', '邮箱', member.profile.email || member.email)}
                          </Col>
                          <Col xs={24}>
                            {renderField('address', '地址', (() => {
                              const addr = member.profile.address;
                              if (!addr) return '';
                              if (typeof addr === 'string') return addr;
                              if (typeof addr === 'object') {
                                const parts = [
                                  addr.street,
                                  addr.city,
                                  addr.state,
                                  addr.postcode,
                                  addr.country,
                                ].filter(Boolean);
                                return parts.join(', ');
                              }
                              return '';
                            })(), 'textarea', undefined, 'top')}
                          </Col>
                        </Row>
                        
                        {/* 社交媒体 */}
                        <Divider orientation="left" style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>社交媒体</Divider>
                        <Row gutter={[12, 12]}>
                          <Col xs={24}>
                            {renderField('linkedin', 'LinkedIn', member.profile.linkedin)}
                          </Col>
                          <Col xs={24}>
                            {renderField('facebook', 'Facebook', member.profile.socialMedia?.facebook)}
                          </Col>
                          <Col xs={24}>
                            {renderField('instagram', 'Instagram', member.profile.socialMedia?.instagram)}
                          </Col>
                          <Col xs={24}>
                            {renderField('wechat', '微信', member.profile.socialMedia?.wechat)}
                          </Col>
                        </Row>
                        
                        {/* 紧急联络人 */}
                        <Divider orientation="left" style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>紧急联络人</Divider>
                        <Row gutter={[12, 12]}>
                          <Col xs={24}>
                            {renderField('emergencyContactName', '紧急联络人姓名', member.profile.emergencyContact?.name)}
                          </Col>
                          <Col xs={24}>
                            {renderField('emergencyContactPhone', '紧急联络人电话', member.profile.emergencyContact?.phone)}
                          </Col>
                          <Col xs={24}>
                            {renderField('emergencyContactRelationship', '紧急联络人关系', member.profile.emergencyContact?.relationship)}
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24}>
                    {/* 服装与物品 */}
                    <Card title="服装与物品" bordered={true}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={6}>
                            {renderField('cutting', '裁剪/版型', member.profile.cutting, 'buttonGroup', [
                              { label: 'Unisex', value: 'Unisex' },
                              { label: 'Lady Cut', value: 'Lady Cut' },
                            ])}
                          </Col>
                          <Col xs={24} md={6}>
                            {renderField('shirtSize', 'T恤尺寸', member.profile.shirtSize, 'buttonGroup', [
                              { label: 'XS', value: 'XS' },
                              { label: 'S', value: 'S' },
                              { label: 'M', value: 'M' },
                              { label: 'L', value: 'L' },
                              { label: 'XL', value: 'XL' },
                              { label: '2XL', value: '2XL' },
                              { label: '3XL', value: '3XL' },
                              { label: '5XL', value: '5XL' },
                              { label: '7XL', value: '7XL' },
                            ])}
                          </Col>
                          <Col xs={24} md={6}>
                            {renderField('jacketSize', '夹克尺寸', member.profile.jacketSize, 'buttonGroup', [
                              { label: 'XS', value: 'XS' },
                              { label: 'S', value: 'S' },
                              { label: 'M', value: 'M' },
                              { label: 'L', value: 'L' },
                              { label: 'XL', value: 'XL' },
                              { label: '2XL', value: '2XL' },
                              { label: '3XL', value: '3XL' },
                              { label: '5XL', value: '5XL' },
                              { label: '7XL', value: '7XL' },
                            ])}
                          </Col>
                          <Col xs={24} md={6}>
                            {renderField('nameToBeEmbroidered', '刺绣名称', member.profile.nameToBeEmbroidered)}
                          </Col>
                          <Col xs={24} md={6}>
                            {renderField('tshirtReceivingStatus', 'T恤领取状态', member.profile.tshirtReceivingStatus, 'select', [
                              { label: 'NA', value: 'NA' },
                              { label: 'Requested', value: 'Requested' },
                              { label: 'Sent', value: 'Sent' },
                              { label: 'Delivered', value: 'Delivered' },
                              { label: 'Received', value: 'Received' },
                            ])}
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24}>
                    {/* 会籍日期与元数据 */}
                    <Card title="会籍日期与元数据" bordered={true}>
                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>创建时间</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>
                                {(() => {
                                  const createdAt = (member as any).profile?.createdAt;
                                  if (!createdAt) return '-';
                                  try {
                                    // Handle Firestore Timestamp
                                    if (typeof createdAt === 'object' && 'seconds' in createdAt) {
                                      return new Date(createdAt.seconds * 1000).toLocaleString('zh-CN');
                                    }
                                    // Handle string/number
                                    return new Date(createdAt).toLocaleString('zh-CN');
                                  } catch {
                                    return '-';
                                  }
                                })()}
                              </span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>更新时间</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>
                                {(() => {
                                  const updatedAt = (member as any).profile?.updatedAt;
                                  if (!updatedAt) return '-';
                                  try {
                                    // Handle Firestore Timestamp
                                    if (typeof updatedAt === 'object' && 'seconds' in updatedAt) {
                                      return new Date(updatedAt.seconds * 1000).toLocaleString('zh-CN');
                                    }
                                    // Handle string/number
                                    return new Date(updatedAt).toLocaleString('zh-CN');
                                  } catch {
                                    return '-';
                                  }
                                })()}
                              </span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>账户类型</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{(member as any).profile?.accountType || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>个人状态</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{(member as any).profile?.status || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>会员ID</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{member.jciCareer?.memberId || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>个人级别</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{(member as any).profile?.level || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>加入(旧)</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{(member as any).profile?.joinedDate || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>类别标签</span>
                            </Col>
                            <Col flex="auto">
                              {Array.isArray((member as any).profile?.categories) && (member as any).profile.categories.length > 0 ? (
                                <Space wrap>
                                  {((member as any).profile.categories as string[]).map((c: string) => <Tag key={c}>{c}</Tag>)}
                                </Space>
                              ) : (
                                <span style={{ fontSize: 13, color: '#000' }}>-</span>
                              )}
                            </Col>
                          </Row>
                        </Col>
                      </Row>
      </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'jci',
              label: 'JCI发展',
              children: (
                <Row gutter={ROW_GUTTER} align="stretch">
                  <Col xs={24} md={8}>
      {/* Organization Information */}
                    <Card title="组织信息" bordered={true} style={{ height: '100%' }}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24}>
                            {renderField('worldRegion', '世界地区', (member as any).jciCareer?.worldRegion)}
                          </Col>
                          <Col xs={24}>
                            {renderField('countryRegion', '国家地区', (member as any).jciCareer?.countryRegion)}
                          </Col>
                          <Col xs={24}>
                            {renderField('country', '国家', (member as any).jciCareer?.country)}
                          </Col>
                          <Col xs={24}>
                            {renderField('chapter', '分会', (member as any).jciCareer?.chapter || member.chapter)}
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={16}>
                    <Card title="JCI 会籍与任期" bordered={true} style={{ height: '100%' }}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('joinDate', '加入日期(JCI)', (member as any).jciCareer?.joinDate || member.joinDate, 'date')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('category', 'JCI 类别', (member as any).jciCareer?.category || member.category)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('introducerName', '介绍人', (member as any).jciCareer?.introducerName)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('jciPosition', 'JCI 职位', (member as any).jciCareer?.jciPosition)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('membershipCategory', '会员类别', (member as any).jciCareer?.membershipCategory)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('senatorId', '参议员编号', (member as any).jciCareer?.senatorId)}
                          </Col>
                        </Row>
                        <Divider style={{ margin: '16px 0' }} />
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('jciBenefitsExpectation', 'JCI 期望', (member as any).jciCareer?.jciBenefitsExpectation, 'textarea', undefined, 'top')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('jciEventInterests', 'JCI 兴趣', (member as any).jciCareer?.jciEventInterests, 'textarea', undefined, 'top')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('activeMemberHow', '成为活跃会员方式', (member as any).jciCareer?.activeMemberHow, 'textarea', undefined, 'top')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('fiveYearsVision', '五年愿景', (member as any).jciCareer?.fiveYearsVision, 'textarea', undefined, 'top')}
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24}>
                    <Card title="支付与背书" bordered={true}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('paymentDate', '付款日期', (member as any).jciCareer?.paymentDate, 'date')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('paymentSlipUrl', '付款凭证链接', (member as any).jciCareer?.paymentSlipUrl)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('paymentVerifiedDate', '付款验证日期', (member as any).jciCareer?.paymentVerifiedDate, 'date')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('endorsementDate', '背书日期', (member as any).jciCareer?.endorsementDate, 'date')}
                          </Col>
                        </Row>
                      </Form>
      </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'activities',
              label: '活动',
              children: (
                <Empty description="活动功能开发中" />
              ),
            },
            {
              key: 'tasks',
              label: '任务',
              children: <TaskProgressCard member={member} />,
            },
            {
              key: 'member-fees',
              label: '会费',
              children: member ? (
                <div style={{ padding: '16px 0' }}>
                  <MemberFeesTab memberId={member.id} />
                </div>
              ) : (
                <Empty description="会员信息缺失" />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default MemberDetailView;

