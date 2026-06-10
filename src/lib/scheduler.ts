import { DesignTask, Notification } from '@/types';
import { addDays, parseISO, isBefore, isAfter, format } from 'date-fns';

/**
 * 核心排班算法：插入新任务时，自动顺延同一承接人后续任务
 *
 * 逻辑：
 * 1. 找到该承接人所有与新任务时间重叠或在其之后的任务
 * 2. 计算顺延天数
 * 3. 将后续任务的开始和结束日期都顺延
 * 4. 生成通知
 */
export function insertTaskWithPostpone(
  existingTasks: DesignTask[],
  newTask: DesignTask,
  requesterName: string,
): {
  updatedTasks: DesignTask[];
  postponedTasks: DesignTask[];
  notifications: Notification[];
} {
  const postponedTasks: DesignTask[] = [];
  const notifications: Notification[] = [];

  // 计算新任务占用的日期范围
  const newStart = parseISO(newTask.startDate);
  const newEnd = parseISO(newTask.endDate);

  // 找到同一承接人的所有现有任务（排除并行任务，并行任务不参与顺延）
  const sameAssigneeTasks = existingTasks.filter(
    t => t.assigneeId === newTask.assigneeId && t.id !== newTask.id && !t.parallel
  );

  // 并行任务不触发顺延，直接跳过
  if (newTask.parallel) {
    const updatedTasks = [...existingTasks, newTask];

    // 生成新任务分配通知
    notifications.push({
      id: `notif-${Date.now()}-new`,
      type: 'task_assigned',
      title: '新设计任务分配（并行）',
      message: `${requesterName} 向您分配了新并行任务「${newTask.title}」，工期 ${newTask.durationDays} 天（${newTask.startDate} ~ ${newTask.endDate}），此任务允许与其他任务时间重叠。`,
      taskId: newTask.id,
      fromUserId: newTask.requesterId,
      toUserId: newTask.assigneeId,
      read: false,
      createdAt: new Date().toISOString(),
    });

    // 通知任务发起人：任务已成功插入
    notifications.push({
      id: `notif-${Date.now()}-confirm`,
      type: 'task_inserted',
      title: '任务插入成功',
      message: `您发起的并行任务「${newTask.title}」已成功插入排班表，此任务允许与其他任务并行。`,
      taskId: newTask.id,
      fromUserId: newTask.assigneeId,
      toUserId: newTask.requesterId,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return { updatedTasks, postponedTasks: [], notifications };
  }

  // 找出需要顺延的任务：与新任务有时间冲突或在新任务之后开始的任务（仅非并行任务）
  const tasksToPostpone = sameAssigneeTasks.filter(t => {
    const tStart = parseISO(t.startDate);
    // 任务开始日期 >= 新任务开始日期，且开始日期在新任务结束之前或等于
    // 或者任务的时间范围与新任务有重叠
    const tEnd = parseISO(t.endDate);
    const hasOverlap = !(isAfter(tStart, newEnd) || isBefore(tEnd, newStart));
    const startsAfterNew = !isBefore(tStart, newStart);
    return hasOverlap || startsAfterNew;
  });

  // 按开始日期排序
  tasksToPostpone.sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );

  // 计算顺延天数并更新
  let updatedTasks = [...existingTasks];
  // newTask.durationDays 用于通知消息中

  for (const task of tasksToPostpone) {
    const taskStart = parseISO(task.startDate);
    const taskEnd = parseISO(task.endDate);

    // 检查是否有重叠
    const hasOverlap = !(isAfter(taskStart, newEnd) || isBefore(taskEnd, newStart));

    if (hasOverlap) {
      // 有重叠：将任务开始日期设为新任务结束日期的下一个工作日
      const newTaskEndPlusOne = addDays(newEnd, 1);
      const postponeDays = Math.max(
        1,
        Math.ceil((newTaskEndPlusOne.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24))
      );

      const updatedTask: DesignTask = {
        ...task,
        startDate: format(addDays(taskStart, postponeDays), 'yyyy-MM-dd'),
        endDate: format(addDays(taskEnd, postponeDays), 'yyyy-MM-dd'),
        postponedBy: (task.postponedBy || 0) + postponeDays,
        originalEndDate: task.originalEndDate || task.endDate,
      };

      updatedTasks = updatedTasks.map(t =>
        t.id === task.id ? updatedTask : t
      );
      postponedTasks.push(updatedTask);

      // 生成通知给任务发起人
      notifications.push({
        id: `notif-${Date.now()}-${task.id}`,
        type: 'task_postponed',
        title: '任务工期顺延通知',
        message: `由于新任务「${newTask.title}」的插入，您发起的任务「${task.title}」工期已顺延 ${postponeDays} 天，新的结束日期为 ${format(addDays(taskEnd, postponeDays), 'yyyy年MM月dd日')}。`,
        taskId: task.id,
        fromUserId: newTask.assigneeId,
        toUserId: task.requesterId,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 添加新任务到列表
  updatedTasks.push(newTask);

  // 生成新任务分配通知
  notifications.push({
    id: `notif-${Date.now()}-new`,
    type: 'task_assigned',
    title: '新设计任务分配',
    message: `${requesterName} 向您分配了新任务「${newTask.title}」，工期 ${newTask.durationDays} 天（${newTask.startDate} ~ ${newTask.endDate}）。`,
    taskId: newTask.id,
    fromUserId: newTask.requesterId,
    toUserId: newTask.assigneeId,
    read: false,
    createdAt: new Date().toISOString(),
  });

  // 通知任务发起人：任务已成功插入
  notifications.push({
    id: `notif-${Date.now()}-confirm`,
    type: 'task_inserted',
    title: '任务插入成功',
    message: `您发起的任务「${newTask.title}」已成功插入排班表${postponedTasks.length > 0 ? `，${postponedTasks.length} 个相关任务已自动顺延` : ''}。`,
    taskId: newTask.id,
    fromUserId: newTask.assigneeId,
    toUserId: newTask.requesterId,
    read: false,
    createdAt: new Date().toISOString(),
  });

  return { updatedTasks, postponedTasks, notifications };
}

/**
 * 重新排序同一承接人的任务，确保没有重叠（并行任务不参与顺延计算）
 */
export function recomputeSchedule(
  tasks: DesignTask[],
  assigneeId: string,
): DesignTask[] {
  // 仅非并行任务参与排序顺延
  const assigneeTasks = tasks
    .filter(t => t.assigneeId === assigneeId && !t.parallel)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  let result = [...tasks];

  for (let i = 1; i < assigneeTasks.length; i++) {
    const prev = assigneeTasks[i - 1];
    const curr = assigneeTasks[i];
    const prevEnd = parseISO(prev.endDate);
    const currStart = parseISO(curr.startDate);

    if (isBefore(currStart, addDays(prevEnd, 1))) {
      const daysToAdd = Math.ceil(
        (addDays(prevEnd, 1).getTime() - currStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const newStart = addDays(currStart, daysToAdd);
      const newEnd = addDays(parseISO(curr.endDate), daysToAdd);

      result = result.map(t =>
        t.id === curr.id
          ? {
              ...t,
              startDate: format(newStart, 'yyyy-MM-dd'),
              endDate: format(newEnd, 'yyyy-MM-dd'),
              postponedBy: (t.postponedBy || 0) + daysToAdd,
              originalEndDate: t.originalEndDate || t.endDate,
            }
          : t
      );

      // Update the reference for next iteration
      assigneeTasks[i] = {
        ...curr,
        startDate: format(newStart, 'yyyy-MM-dd'),
        endDate: format(newEnd, 'yyyy-MM-dd'),
      };
    }
  }

  return result;
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
