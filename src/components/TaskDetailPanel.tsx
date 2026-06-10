import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { DesignTask, TaskPriority, TaskStatus, TeamMember, Requester, AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import {
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pause,
  User,
  Calendar,
  ArrowRight,
  Flag,
  Pencil,
  Check,
  UserCheck,
  Hourglass,
  Layers,
} from 'lucide-react';

interface TaskDetailPanelProps {
  task: DesignTask | null;
  isOpen: boolean;
  onClose: () => void;
  members: TeamMember[];
  requesters: Requester[];
  currentUser: AppUser;
  getMemberById: (id: string) => { name: string; role: string; avatar: string; color: string } | undefined;
  getRequesterById: (id: string) => { name: string; role: string } | undefined;
  onUpdateTask: (taskId: string, updates: Partial<Omit<DesignTask, 'id' | 'createdAt'>>) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onAssignTask: (taskId: string, assigneeId: string, overrides?: { startDate?: string; durationDays?: number; parallel?: boolean }) => { success: boolean; message: string };
}

const priorityLabels: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  urgent: { label: '紧急', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  high: { label: '高优', color: 'text-primary', bgColor: 'bg-primary/10' },
  normal: { label: '普通', color: 'text-success', bgColor: 'bg-success/10' },
  low: { label: '低优', color: 'text-warning', bgColor: 'bg-warning/10' },
};

const statusLabels: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: '待开始', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-muted-foreground' },
  in_progress: { label: '进行中', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-primary' },
  completed: { label: '已完成', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-success' },
  paused: { label: '已暂停', icon: <Pause className="w-3.5 h-3.5" />, color: 'text-warning' },
};

export default function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  members,
  requesters,
  currentUser,
  getMemberById,
  getRequesterById,
  onUpdateTask,
  onUpdateStatus,
  onDeleteTask,
  onAssignTask,
}: TaskDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editRequesterId, setEditRequesterId] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('normal');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDurationDays, setEditDurationDays] = useState(1);
  const [editParallel, setEditParallel] = useState(false);

  // 管理员分配承接人
  const [assignMode, setAssignMode] = useState(false);
  const [assignToId, setAssignToId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignDurationDays, setAssignDurationDays] = useState(1);
  const [assignParallel, setAssignParallel] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  // 优先级/排班时间快捷调整
  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustPriority, setAdjustPriority] = useState<TaskPriority>('normal');
  const [adjustStartDate, setAdjustStartDate] = useState('');
  const [adjustDurationDays, setAdjustDurationDays] = useState(1);
  const [adjustParallel, setAdjustParallel] = useState(false);

  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDescription(task.description);
      setEditAssigneeId(task.assigneeId);
      setEditRequesterId(task.requesterId);
      setEditPriority(task.priority);
      setEditStartDate(task.startDate);
      setEditDurationDays(task.durationDays);
      setEditParallel(task.parallel || false);
      setEditing(false);
      setAssignMode(false);
      setAssignMsg('');
      setAdjustMode(false);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const member = task.assigneeId ? getMemberById(task.assigneeId) : undefined;
  const requester = getRequesterById(task.requesterId);
  const priorityInfo = priorityLabels[task.priority];
  const statusInfo = statusLabels[task.status];
  const isPendingAssign = !task.assigneeId;
  const suggestedMember = task.suggestedAssigneeId ? getMemberById(task.suggestedAssigneeId) : undefined;
  // 设计师是否为当前任务的承接人
  const isAssignee = currentUser.memberId === task.assigneeId;
  // 当前用户是否为任务的创建者（发起人）
  const isCreator = currentUser.id === task.createdBy;

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdateTask(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      assigneeId: editAssigneeId,
      requesterId: editRequesterId,
      priority: editPriority,
      startDate: editStartDate,
      durationDays: editDurationDays,
      parallel: editParallel,
    });
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditAssigneeId(task.assigneeId);
    setEditRequesterId(task.requesterId);
    setEditPriority(task.priority);
    setEditStartDate(task.startDate);
    setEditDurationDays(task.durationDays);
    setEditParallel(task.parallel || false);
    setEditing(false);
  };

  const handleAssign = () => {
    if (!assignToId) {
      setAssignMsg('请选择承接人');
      return;
    }
    const overrides: { startDate?: string; durationDays?: number; parallel?: boolean } = {};
    // 只在管理员修改了排班参数时才传入 overrides
    if (assignStartDate !== task.startDate) overrides.startDate = assignStartDate;
    if (assignDurationDays !== task.durationDays) overrides.durationDays = assignDurationDays;
    if (assignParallel !== (task.parallel || false)) overrides.parallel = assignParallel;

    const result = onAssignTask(task.id, assignToId, Object.keys(overrides).length > 0 ? overrides : undefined);
    setAssignMsg(result.message);
    if (result.success) {
      setTimeout(() => {
        setAssignMode(false);
        setAssignMsg('');
      }, 1500);
    }
  };

  const handleAdjustSave = () => {
    onUpdateTask(task.id, {
      priority: adjustPriority,
      startDate: adjustStartDate,
      durationDays: adjustDurationDays,
      parallel: adjustParallel,
    });
    setAdjustMode(false);
  };

  // 只有管理员可以完整编辑和删除
  const canEdit = currentUser.isAdmin;
  const canDelete = currentUser.isAdmin;
  // 管理员和承接设计师可以变更状态
  const canChangeStatus = currentUser.isAdmin || isAssignee;
  // 管理员和任务发起人可以调整优先级和排班时间
  const canAdjust = currentUser.isAdmin || isCreator;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l shadow-2xl animate-slide-in flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-base">任务详情</h2>
          <div className="flex items-center gap-1">
            {canEdit && !editing && !isPendingAssign && !assignMode && !adjustMode && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                title="编辑任务"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {editing && (
              <>
                <button onClick={handleCancelEdit} className="px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors">取消</button>
                <button onClick={handleSave} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Check className="w-3 h-3" />保存
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {editing ? (
            /* ========== 编辑模式 ========== */
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">任务名称</label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="请输入任务名称" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">任务描述</label>
                <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="请输入任务描述" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">承接人</label>
                  <Select value={editAssigneeId} onChange={e => setEditAssigneeId(e.target.value)}>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} - {m.role}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">任务发起人</label>
                  <Select value={editRequesterId} onChange={e => setEditRequesterId(e.target.value)}>
                    {requesters.map(r => (
                      <option key={r.id} value={r.id}>{r.name} - {r.role}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">优先级</label>
                  <Select value={editPriority} onChange={e => setEditPriority(e.target.value as TaskPriority)}>
                    <option value="urgent">紧急</option>
                    <option value="high">高优</option>
                    <option value="normal">普通</option>
                    <option value="low">低优</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">开始日期</label>
                  <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">工期（天）</label>
                  <Input type="number" min={1} max={60} value={editDurationDays} onChange={e => setEditDurationDays(parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">排班模式</label>
                  <div className="flex items-center gap-3 h-9">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editParallel}
                        onChange={e => setEditParallel(e.target.checked)}
                        className="rounded border-border"
                      />
                      允许并行
                    </label>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ========== 查看模式 ========== */
            <>
              {/* 任务名称 */}
              <div>
                <h3 className="text-lg font-semibold leading-snug">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{task.description}</p>
                )}
              </div>

              {/* 状态和优先级 */}
              <div className="flex gap-2 flex-wrap">
                {isPendingAssign && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-warning bg-warning/10">
                    <Hourglass className="w-3.5 h-3.5" />
                    待分配
                  </div>
                )}
                <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium', statusInfo.color, 'bg-accent')}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </div>
                <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium', priorityInfo.color, priorityInfo.bgColor)}>
                  <Flag className="w-3 h-3" />
                  {priorityInfo.label}
                </div>
                {task.parallel && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-primary bg-primary/10">
                    <Layers className="w-3 h-3" />
                    并行
                  </div>
                )}
              </div>

              {/* 待分配 - 管理员分配操作 */}
              {isPendingAssign && currentUser.isAdmin && !assignMode && (
                <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-warning mb-2">
                    <Hourglass className="w-4 h-4" />
                    此任务待分配承接人
                  </div>
                  {suggestedMember && (
                    <div className="flex items-center gap-2 text-sm mb-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                      <UserCheck className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">发起人建议：</span>
                      <span className="font-medium text-primary">{suggestedMember.name}</span>
                      <span className="text-xs text-muted-foreground">{suggestedMember.role}</span>
                    </div>
                  )}
                  <Button size="sm" onClick={() => {
                    setAssignMode(true);
                    setAssignToId(task.suggestedAssigneeId || '');
                    setAssignStartDate(task.startDate);
                    setAssignDurationDays(task.durationDays);
                    setAssignParallel(task.parallel || false);
                  }} className="gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    分配承接人
                  </Button>
                </div>
              )}

              {isPendingAssign && currentUser.isAdmin && assignMode && (
                <div className="p-4 rounded-lg border bg-accent/30 space-y-3">
                  <div className="text-sm font-medium">分配承接人并设置排班</div>
                  {suggestedMember && (
                    <div className="flex items-center gap-2 text-xs p-2 rounded-md bg-primary/5 border border-primary/20">
                      <UserCheck className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground">发起人建议：</span>
                      <span className="font-medium text-primary">{suggestedMember.name}</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">承接人 *</label>
                    <Select value={assignToId} onChange={e => setAssignToId(e.target.value)}>
                      <option value="">-- 请选择设计师 --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} - {m.role}
                          {m.id === task.suggestedAssigneeId ? '（发起人建议）' : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">开始日期</label>
                      <Input type="date" value={assignStartDate} onChange={e => setAssignStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">工期（天）</label>
                      <Input type="number" min={1} max={60} value={assignDurationDays} onChange={e => setAssignDurationDays(parseInt(e.target.value) || 1)} />
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignParallel}
                      onChange={e => setAssignParallel(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    允许并行（时间可与其他任务重叠，不触发顺延）
                  </label>
                  {assignMsg && (
                    <div className={cn('text-xs px-2 py-1 rounded', assignMsg.includes('成功') ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                      {assignMsg}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setAssignMode(false); setAssignMsg(''); }}>取消</Button>
                    <Button size="sm" onClick={handleAssign}>确认分配</Button>
                  </div>
                </div>
              )}

              {/* 待分配 - 非管理员看到提示 */}
              {isPendingAssign && !currentUser.isAdmin && (
                <div className="p-3 rounded-lg bg-accent/30 border text-xs text-muted-foreground space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Hourglass className="w-4 h-4 text-warning" />
                    <span>任务已提交，等待管理员确认分配</span>
                  </div>
                  {suggestedMember && (
                    <div className="flex items-center gap-2 pl-6">
                      <span>您建议由</span>
                      <span className="font-medium text-foreground">{suggestedMember.name}</span>
                      <span>承接</span>
                    </div>
                  )}
                </div>
              )}

              {/* 顺延标记 */}
              {task.postponedBy && task.postponedBy > 0 && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-warning">
                    <ArrowRight className="w-4 h-4" />
                    已顺延 {task.postponedBy} 天
                  </div>
                  {task.originalEndDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      原结束日期：{task.originalEndDate} → 现结束日期：{task.endDate}
                    </p>
                  )}
                </div>
              )}

              {/* 详细信息 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">承接人</p>
                    {member ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium text-white" style={{ backgroundColor: member.color }}>
                          {member.avatar}
                        </div>
                        <span className="text-sm font-medium">{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.role}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-warning font-medium">待分配</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">任务发起人</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{requester?.name}</span>
                      <span className="text-xs text-muted-foreground">{requester?.role}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">排班时间</p>
                    <span className="text-sm font-medium">
                      {task.startDate} ~ {task.endDate}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">（{task.durationDays}天）</span>
                    {task.parallel && (
                      <span className="text-xs text-primary ml-1 font-medium">[并行]</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 优先级/排班时间调整 - 管理员和任务发起人可操作 */}
              {task.assigneeId && canAdjust && !adjustMode && (
                <div className="pt-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setAdjustPriority(task.priority);
                    setAdjustStartDate(task.startDate);
                    setAdjustDurationDays(task.durationDays);
                    setAdjustParallel(task.parallel || false);
                    setAdjustMode(true);
                  }} className="gap-1.5 w-full">
                    <Flag className="w-3.5 h-3.5" />
                    调整优先级与排班时间
                  </Button>
                </div>
              )}

              {task.assigneeId && canAdjust && adjustMode && (
                <div className="p-4 rounded-lg border bg-accent/30 space-y-3">
                  <div className="text-sm font-medium">调整优先级与排班</div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">优先级</label>
                    <Select value={adjustPriority} onChange={e => setAdjustPriority(e.target.value as TaskPriority)}>
                      <option value="urgent">紧急</option>
                      <option value="high">高优</option>
                      <option value="normal">普通</option>
                      <option value="low">低优</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">开始日期</label>
                      <Input type="date" value={adjustStartDate} onChange={e => setAdjustStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">工期（天）</label>
                      <Input type="number" min={1} max={60} value={adjustDurationDays} onChange={e => setAdjustDurationDays(parseInt(e.target.value) || 1)} />
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adjustParallel}
                      onChange={e => setAdjustParallel(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    允许并行（时间可与其他任务重叠，不触发顺延）
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAdjustMode(false)}>取消</Button>
                    <Button size="sm" onClick={handleAdjustSave}>保存调整</Button>
                  </div>
                </div>
              )}

              {/* 状态变更 - 管理员和承接设计师可操作 */}
              {task.assigneeId && canChangeStatus && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    {isAssignee && !currentUser.isAdmin ? '更新任务状态' : '变更状态'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(statusLabels) as TaskStatus[]).map(status => (
                      <Button key={status} variant={task.status === status ? 'default' : 'outline'} size="sm" onClick={() => onUpdateStatus(task.id, status)} className="text-xs">
                        {statusLabels[status].label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部操作 - 仅管理员可删除 */}
        {canDelete && (
          <div className="p-5 border-t">
            <Button variant="destructive" size="sm" className="w-full" onClick={() => { onDeleteTask(task.id); onClose(); }}>
              删除任务
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
