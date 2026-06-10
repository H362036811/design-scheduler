import { useState, useCallback, useEffect } from 'react';
import { DesignTask, Notification, TaskPriority, TaskStatus, TeamMember, Requester, SchedulerState } from '@/types';
import { initialMembers, initialTasks, initialRequesters } from '@/data/initialData';
import { insertTaskWithPostpone, recomputeSchedule, generateId } from '@/lib/scheduler';
import { addDays, format, parseISO } from 'date-fns';

const MEMBER_COLORS = [
  'hsl(230, 65%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(170, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(350, 65%, 55%)',
  'hsl(200, 70%, 50%)',
  'hsl(50, 75%, 50%)',
  'hsl(320, 60%, 50%)',
  'hsl(140, 55%, 45%)',
  'hsl(15, 75%, 55%)',
];

// ===== localStorage 持久化 =====
const STORAGE_KEY = 'ds_scheduler_state';

function loadState(): SchedulerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SchedulerState;
      if (parsed.tasks && parsed.members) {
        return {
          tasks: parsed.tasks.map(t => ({ ...t, parallel: t.parallel ?? false })),
          members: parsed.members,
          requesters: parsed.requesters || initialRequesters,
          notifications: parsed.notifications || [],
        };
      }
    }
  } catch {
    // ignore
  }
  return {
    tasks: initialTasks,
    members: initialMembers,
    requesters: initialRequesters,
    notifications: [],
  };
}

function saveState(state: SchedulerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useScheduler() {
  const initial = loadState();

  const [tasks, setTasks] = useState<DesignTask[]>(initial.tasks);
  const [members, setMembers] = useState<TeamMember[]>(initial.members);
  const [requesters, setRequesters] = useState<Requester[]>(initial.requesters);
  const [notifications, setNotifications] = useState<Notification[]>(initial.notifications);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    saveState({ tasks, members, requesters, notifications });
  }, [tasks, members, requesters, notifications]);

  const getMemberById = useCallback((id: string) => {
    if (!id) return undefined;
    return members.find(m => m.id === id);
  }, [members]);

  const getRequesterById = useCallback((id: string) => {
    if (!id) return undefined;
    return requesters.find(r => r.id === id);
  }, [requesters]);

  const getTasksForMember = useCallback((memberId: string) => {
    return tasks.filter(t => t.assigneeId === memberId);
  }, [tasks]);

  // ===== 任务操作 =====

  // 普通用户创建任务（可建议承接人，待管理员确认分配）
  const addTask = useCallback((
    title: string,
    description: string,
    assigneeId: string,
    requesterId: string,
    priority: TaskPriority,
    startDate: string,
    durationDays: number,
    createdBy: string,
    suggestedAssigneeId?: string,
    parallel: boolean = false,
  ) => {
    const start = parseISO(startDate);
    const end = addDays(start, durationDays - 1);

    const newTask: DesignTask = {
      id: generateId(),
      title,
      description,
      assigneeId,  // 普通用户传空字符串，管理员分配时传具体id
      requesterId,
      suggestedAssigneeId,
      createdBy,
      priority,
      status: 'pending' as TaskStatus,
      startDate,
      endDate: format(end, 'yyyy-MM-dd'),
      durationDays,
      parallel,
      createdAt: new Date().toISOString(),
    };

    if (assigneeId) {
      // 管理员直接分配了承接人，走插入排班逻辑
      const requester = requesters.find(r => r.id === requesterId);
      const result = insertTaskWithPostpone(tasks, newTask, requester?.name || '未知');
      const recomputed = recomputeSchedule(result.updatedTasks, assigneeId);
      setTasks(recomputed);
      setNotifications(prev => [...result.notifications, ...prev]);
      return {
        newTask,
        postponedCount: result.postponedTasks.length,
        postponedTasks: result.postponedTasks,
      };
    } else {
      // 普通用户创建，待分配，直接加入列表
      setTasks(prev => [...prev, newTask]);
      // 通知管理员有新任务待分配
      const suggestionText = suggestedAssigneeId
        ? `，建议由${getMemberById(suggestedAssigneeId)?.name || '未知'}承接`
        : '';
      const adminNotif: Notification = {
        id: `notif-${Date.now()}-pending`,
        type: 'task_assigned' as const,
        title: '新任务待分配',
        message: `用户创建了新任务「${title}」${suggestionText}，等待您分配承接人。`,
        taskId: newTask.id,
        toUserId: 'u_admin',
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [adminNotif, ...prev]);
      return {
        newTask,
        postponedCount: 0,
        postponedTasks: [] as DesignTask[],
      };
    }
  }, [tasks, requesters, getMemberById]);

  // 管理员分配承接人（给待分配的任务指定承接人并插入排班）
  // 可同时修改排班时间和并行模式
  const assignTask = useCallback((
    taskId: string,
    assigneeId: string,
    overrides?: { startDate?: string; durationDays?: number; parallel?: boolean },
  ): { success: boolean; message: string; postponedCount?: number } => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: '任务不存在' };
    if (task.assigneeId) return { success: false, message: '该任务已分配承接人' };

    // 先从列表中移除旧任务
    const remainingTasks = tasks.filter(t => t.id !== taskId);
    // 创建带承接人的新任务，可覆盖排班时间和并行标记
    const startDate = overrides?.startDate || task.startDate;
    const durationDays = overrides?.durationDays || task.durationDays;
    const parallel = overrides?.parallel !== undefined ? overrides.parallel : task.parallel;
    const end = addDays(parseISO(startDate), durationDays - 1);

    const assignedTask: DesignTask = {
      ...task,
      assigneeId,
      startDate,
      durationDays,
      parallel,
      endDate: format(end, 'yyyy-MM-dd'),
    };

    const requester = requesters.find(r => r.id === task.requesterId);
    const result = insertTaskWithPostpone(remainingTasks, assignedTask, requester?.name || '未知');
    const recomputed = recomputeSchedule(result.updatedTasks, assigneeId);

    // 找到插入后的最终任务数据（日期可能已被重新计算）
    const finalTask = recomputed.find(t => t.id === taskId);

    setTasks(recomputed);

    // 通知任务发起人：管理员已确认分配
    const assignedMember = getMemberById(assigneeId);
    const isSuggested = task.suggestedAssigneeId === assigneeId;
    const requesterNotif: Notification = {
      id: `notif-${Date.now()}-confirmed`,
      type: 'assignment_confirmed' as const,
      title: '任务分配已确认',
      message: `您提交的任务「${task.title}」已由管理员${isSuggested ? '确认' : '重新调整'}分配给${assignedMember?.name || '未知'}${finalTask ? `，排班时间：${finalTask.startDate} ~ ${finalTask.endDate}` : ''}。`,
      taskId: task.id,
      toUserId: task.createdBy,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [...result.notifications, requesterNotif, ...prev]);

    return {
      success: true,
      message: `已将任务分配给 ${assignedMember?.name || '未知'}`,
      postponedCount: result.postponedTasks.length,
    };
  }, [tasks, requesters, getMemberById]);

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status } : t
    ));
    // 如果标记为已完成，通知任务发起人
    if (status === 'completed') {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.createdBy) {
        const member = getMemberById(task.assigneeId);
        const notif: Notification = {
          id: `notif-${Date.now()}-completed`,
          type: 'task_completed',
          title: '任务已完成',
          message: `设计师${member?.name || '未知'}已完成您发起的任务「${task.title}」。`,
          taskId: task.id,
          fromUserId: task.assigneeId,
          toUserId: task.createdBy,
          read: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications(prev => [notif, ...prev]);
      }
    }
  }, [tasks, getMemberById]);

  const updateTask = useCallback((taskId: string, updates: Partial<Omit<DesignTask, 'id' | 'createdAt'>>) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const merged = { ...t, ...updates };
      if (updates.startDate || updates.durationDays) {
        const end = addDays(parseISO(merged.startDate), merged.durationDays - 1);
        merged.endDate = format(end, 'yyyy-MM-dd');
      }
      return merged;
    }));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  // ===== 团队成员操作 =====
  const addMember = useCallback((name: string, role: string) => {
    const id = generateId();
    const avatar = name.slice(0, 1) + (name.length > 1 ? name.slice(-1) : '');
    const colorIndex = members.length % MEMBER_COLORS.length;
    const newMember: TeamMember = {
      id,
      name,
      role,
      avatar: avatar.toUpperCase(),
      color: MEMBER_COLORS[colorIndex],
    };
    setMembers(prev => [...prev, newMember]);
    return newMember;
  }, [members.length]);

  const updateMember = useCallback((id: string, updates: Partial<Pick<TeamMember, 'name' | 'role'>>) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, ...updates };
      if (updates.name) {
        updated.avatar = updates.name.slice(0, 1) + (updates.name.length > 1 ? updates.name.slice(-1) : '');
        updated.avatar = updated.avatar.toUpperCase();
      }
      return updated;
    }));
  }, []);

  const deleteMember = useCallback((id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    if (selectedMember === id) {
      setSelectedMember(null);
    }
  }, [selectedMember]);

  // ===== 任务发起人操作 =====
  const addRequester = useCallback((name: string, role: string) => {
    const id = generateId();
    const newRequester: Requester = { id, name, role };
    setRequesters(prev => [...prev, newRequester]);
    return newRequester;
  }, []);

  const updateRequester = useCallback((id: string, updates: Partial<Pick<Requester, 'name' | 'role'>>) => {
    setRequesters(prev => prev.map(r =>
      r.id === id ? { ...r, ...updates } : r
    ));
  }, []);

  const deleteRequester = useCallback((id: string) => {
    setRequesters(prev => prev.filter(r => r.id !== id));
  }, []);

  // ===== 通知操作 =====
  const markNotificationRead = useCallback((notifId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notifId ? { ...n, read: true } : n
    ));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // 根据当前用户过滤通知
  const getNotificationsForUser = useCallback((userId: string, isAdmin: boolean, memberId?: string) => {
    if (isAdmin) return notifications;
    // 普通用户：看到发给自己的 + 自己创建的任务相关的 + 分配给自己的任务相关的
    return notifications.filter(n => {
      if (n.toUserId === userId) return true;
      // 设计师：toUserId 是 memberId 的通知也属于该设计师
      if (memberId && n.toUserId === memberId) return true;
      // 如果通知关联了任务，检查该任务是否与该用户相关
      if (n.taskId) {
        const task = tasks.find(t => t.id === n.taskId);
        if (task && task.createdBy === userId) return true;
        if (memberId && task && task.assigneeId === memberId) return true;
      }
      return false;
    });
  }, [notifications, tasks]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // 根据当前用户过滤可见任务
  // 管理员：全部；设计师（有memberId）：分配给自己的+自己创建的；发起人：仅自己创建的
  const getFilteredTasks = useCallback((userId: string, isAdmin: boolean, memberId?: string) => {
    let visibleTasks: DesignTask[];
    if (isAdmin) {
      visibleTasks = tasks;
    } else if (memberId) {
      // 设计师：看到分配给自己的任务 + 自己创建的任务
      visibleTasks = tasks.filter(t => t.assigneeId === memberId || t.createdBy === userId);
    } else {
      // 任务发起人：只能看到自己创建的任务
      visibleTasks = tasks.filter(t => t.createdBy === userId);
    }
    // 再按选中的成员过滤
    if (selectedMember) {
      visibleTasks = visibleTasks.filter(t => t.assigneeId === selectedMember);
    }
    return visibleTasks;
  }, [tasks, selectedMember]);

  return {
    tasks,
    members,
    requesters,
    notifications,
    selectedMember,
    setSelectedMember,
    unreadCount,
    addTask,
    assignTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addMember,
    updateMember,
    deleteMember,
    addRequester,
    updateRequester,
    deleteRequester,
    markNotificationRead,
    markAllNotificationsRead,
    getMemberById,
    getRequesterById,
    getTasksForMember,
    getFilteredTasks,
    getNotificationsForUser,
  };
}
