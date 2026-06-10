import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { TaskPriority, TeamMember, Requester, AppUser } from '@/types';
import { format, addDays, parseISO } from 'date-fns';
import { X, CalendarDays, UserPlus, AlertCircle } from 'lucide-react';
import { DesignTask } from '@/types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: TeamMember[];
  requesters: Requester[];
  currentUser: AppUser;
  onSubmit: (data: {
    title: string;
    description: string;
    assigneeId: string;
    requesterId: string;
    priority: TaskPriority;
    startDate: string;
    durationDays: number;
    suggestedAssigneeId?: string;
    parallel?: boolean;
  }) => { postponedCount: number; postponedTasks: DesignTask[] };
}

export default function CreateTaskModal({ isOpen, onClose, members, requesters, currentUser, onSubmit }: CreateTaskModalProps) {
  const isAdmin = currentUser.isAdmin;

  // 确定当前用户的 requesterId：优先用关联的 requesterId，否则按姓名匹配
  const getUserRequesterId = () => {
    if (currentUser.requesterId) return currentUser.requesterId;
    const matched = requesters.find(r => r.name === currentUser.displayName);
    if (matched) return matched.id;
    return requesters[0]?.id || '';
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState(isAdmin ? (members[0]?.id || '') : '');
  const [suggestedAssigneeId, setSuggestedAssigneeId] = useState('');
  const [requesterId, setRequesterId] = useState(
    getUserRequesterId()
  );
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [durationDays, setDurationDays] = useState(5);
  const [parallel, setParallel] = useState(false);
  const [showResult, setShowResult] = useState<{ postponedCount: number; postponedTasks: DesignTask[] } | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请输入任务名称');
      return;
    }
    if (durationDays < 1) {
      setError('工期至少为1天');
      return;
    }
    if (isAdmin && !assigneeId) {
      setError('请选择承接人');
      return;
    }

    try {
      const result = onSubmit({
        title: title.trim(),
        description: description.trim(),
        assigneeId: isAdmin ? assigneeId : '',  // 普通用户不直接分配
        requesterId,
        priority,
        startDate,
        durationDays,
        suggestedAssigneeId: isAdmin ? undefined : suggestedAssigneeId,  // 普通用户建议承接人
        parallel,
      });
      setShowResult(result);
    } catch {
      setError('创建任务时发生错误，请重试');
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setAssigneeId(isAdmin ? (members[0]?.id || '') : '');
    setSuggestedAssigneeId('');
    setRequesterId(getUserRequesterId());
    setPriority('normal');
    setStartDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setDurationDays(5);
    setParallel(false);
    setShowResult(null);
    setError('');
    onClose();
  };

  const previewEndDate = (() => {
    try {
      return format(addDays(parseISO(startDate), durationDays - 1), 'yyyy年MM月dd日');
    } catch {
      return '-';
    }
  })();

  const selectedMember = members.find(m => m.id === assigneeId);
  const suggestedMember = members.find(m => m.id === suggestedAssigneeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={handleClose} />

      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in border">
        <div className="flex items-center justify-between p-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {showResult ? '任务创建成功' : '新建设计任务'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {showResult ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm">
                  {isAdmin
                    ? `任务「${title}」已成功插入排班表`
                    : `任务「${title}」已提交，等待管理员确认分配`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAdmin
                    ? `已自动通知承接人 ${selectedMember?.name} 和任务发起人`
                    : suggestedAssigneeId
                      ? `您建议由 ${members.find(m => m.id === suggestedAssigneeId)?.name || '未知'} 承接，管理员确认后将通知您`
                      : '管理员确认分配后将通过通知告知您'}
                </p>
              </div>
            </div>

            {showResult.postponedCount > 0 && (
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">工期自动顺延</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  由于新任务插入，{selectedMember?.name} 的 {showResult.postponedCount} 个后续任务已自动顺延，相关发起人已收到通知：
                </p>
                <div className="space-y-1.5">
                  {showResult.postponedTasks.map(pt => (
                    <div key={pt.id} className="flex items-center gap-2 text-xs bg-card/60 rounded px-2 py-1.5">
                      <span className="font-medium">{pt.title}</span>
                      {pt.originalEndDate && (
                        <span className="text-muted-foreground">
                          <span className="line-through">{pt.originalEndDate}</span>
                          <span className="mx-1">→</span>
                          <span className="text-warning font-medium">{pt.endDate}</span>
                          <span className="ml-1 text-warning">(+{pt.postponedBy}天)</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>完成</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">任务名称 *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入设计任务名称" autoFocus />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">任务描述</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="请简要描述任务内容和要求" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {isAdmin ? (
                /* 管理员：可选承接人 */
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">承接人 *</label>
                  <Select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                    <option value="">-- 请选择 --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} - {m.role}</option>
                    ))}
                  </Select>
                </div>
              ) : (
                /* 普通用户：可建议承接人 */
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">建议承接人</label>
                  <Select value={suggestedAssigneeId} onChange={e => setSuggestedAssigneeId(e.target.value)}>
                    <option value="">-- 由管理员分配 --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} - {m.role}</option>
                    ))}
                  </Select>
                  <p className="text-[10px] text-muted-foreground">您可选择建议的承接人，最终由管理员确认</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">任务发起人</label>
                <div className="px-3 py-2 rounded-lg bg-accent/30 border text-sm">
                  {requesters.find(r => r.id === requesterId)?.name || currentUser.displayName}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">优先级</label>
                <Select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                  <option value="urgent">紧急</option>
                  <option value="high">高优</option>
                  <option value="normal">普通</option>
                  <option value="low">低优</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">开始日期 *</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">工期（天）*</label>
              <Input type="number" min={1} max={60} value={durationDays} onChange={e => setDurationDays(parseInt(e.target.value) || 1)} />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-accent/50 transition-colors">
              <input
                type="checkbox"
                checked={parallel}
                onChange={e => setParallel(e.target.checked)}
                className="rounded border-border"
              />
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="8" width="7" height="7" rx="1" />
              </svg>
              <span className="font-medium">允许并行</span>
              <span className="text-xs text-muted-foreground">（此任务时间可与其他任务重叠，不触发顺延）</span>
            </label>

            <div className="p-3 rounded-lg bg-accent/50 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">排班预览：</span>
                <span className="font-medium">{startDate} ~ {previewEndDate}</span>
                <span className="text-muted-foreground">（{durationDays}天）</span>
              </div>
              {selectedMember && (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium text-white" style={{ backgroundColor: selectedMember.color }}>
                    {selectedMember.avatar}
                  </div>
                  <span className="text-muted-foreground">承接人：</span>
                  <span className="font-medium">{selectedMember.name}</span>
                </div>
              )}
              {!isAdmin && suggestedMember && (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium text-white" style={{ backgroundColor: suggestedMember.color }}>
                    {suggestedMember.avatar}
                  </div>
                  <span className="text-muted-foreground">建议承接人：</span>
                  <span className="font-medium">{suggestedMember.name}</span>
                  <span className="text-[10px] text-muted-foreground">（待管理员确认）</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">取消</Button>
              <Button type="submit" className="flex-1">
                {isAdmin ? '创建并插入排班' : '提交任务'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
