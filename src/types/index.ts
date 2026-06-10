export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'paused';

// ===== 用户认证 =====
export interface AppUser {
  id: string;
  username: string;         // 登录账号（拼音或英文）
  passwordHash: string;     // 简单哈希存储
  displayName: string;      // 显示名称（中文）
  isAdmin: boolean;
  memberId?: string;        // 关联的 TeamMember id（设计师角色）
  requesterId?: string;     // 关联的 Requester id（任务发起人角色）
  createdAt: string;
}

export interface AuthState {
  currentUser: AppUser | null;
  isLoggedIn: boolean;
}

export interface DesignTask {
  id: string;
  title: string;
  description: string;
  assigneeId: string;             // 承接人，空字符串表示待管理员分配
  suggestedAssigneeId?: string;   // 任务发起人建议的承接人（ memberId ）
  requesterId: string;            // 任务发起人
  createdBy: string;        // 创建者的 AppUser.id
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  durationDays: number;     // 工期天数
  parallel: boolean;        // 是否可并行（并行任务时间可重叠，不触发顺延）
  createdAt: string;
  postponedBy?: number;     // 被顺延的天数
  originalEndDate?: string; // 顺延前的原始结束日期
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;           // 甘特图条颜色标识
}

export interface Requester {
  id: string;
  name: string;
  role: string;
}

export interface Notification {
  id: string;
  type: 'task_assigned' | 'task_postponed' | 'task_completed' | 'task_inserted' | 'assignment_confirmed';
  title: string;
  message: string;
  taskId?: string;
  fromUserId?: string;
  toUserId?: string;
  read: boolean;
  createdAt: string;
}

export interface SchedulerState {
  tasks: DesignTask[];
  members: TeamMember[];
  requesters: Requester[];
  notifications: Notification[];
}
