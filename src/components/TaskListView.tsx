import { cn } from '@/lib/utils';
import { DesignTask, TaskPriority, TaskStatus } from '@/types';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pause,
  ArrowRight,
  Flag,
  Calendar,
  User,
  FileText,
  Hourglass,
  Layers,
} from 'lucide-react';

interface TaskListViewProps {
  tasks: DesignTask[];
  getMemberById: (id: string) => { name: string; role: string; avatar: string; color: string } | undefined;
  getRequesterById: (id: string) => { name: string; role: string } | undefined;
  onTaskClick: (task: DesignTask) => void;
}

const priorityLabels: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  urgent: { label: '紧急', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  high: { label: '高优', color: 'text-primary', bgColor: 'bg-primary/10' },
  normal: { label: '普通', color: 'text-success', bgColor: 'bg-success/10' },
  low: { label: '低优', color: 'text-warning', bgColor: 'bg-warning/10' },
};

const statusLabels: Record<TaskStatus, { icon: React.ReactNode; color: string; label: string; bgColor: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-muted-foreground', label: '待开始', bgColor: 'bg-accent' },
  in_progress: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-primary', label: '进行中', bgColor: 'bg-primary/10' },
  completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-success', label: '已完成', bgColor: 'bg-success/10' },
  paused: { icon: <Pause className="w-3.5 h-3.5" />, color: 'text-warning', label: '已暂停', bgColor: 'bg-warning/10' },
};

export default function TaskListView({ tasks, getMemberById, getRequesterById, onTaskClick }: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Clock className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">暂无任务</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto h-full scrollbar-thin pb-4">
      {tasks.map(task => {
        const member = getMemberById(task.assigneeId);
        const requester = getRequesterById(task.requesterId);
        const statusInfo = statusLabels[task.status];
        const priorityInfo = priorityLabels[task.priority];

        return (
          <div
            key={task.id}
            className="bg-card rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer"
            onClick={() => onTaskClick(task)}
          >
            {/* 第一行：任务名 + 状态/优先级标签 */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold leading-snug flex-1">{task.title}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {!task.assigneeId && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-warning bg-warning/10">
                    <Hourglass className="w-3 h-3" />
                    待分配
                  </span>
                )}
                <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', statusInfo.color, statusInfo.bgColor)}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
                <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', priorityInfo.color, priorityInfo.bgColor)}>
                  <Flag className="w-3 h-3" />
                  {priorityInfo.label}
                </span>
                {task.parallel && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-primary bg-primary/10">
                    <Layers className="w-3 h-3" />
                    并行
                  </span>
                )}
              </div>
            </div>

            {/* 第二行：任务描述 */}
            {task.description && (
              <div className="flex items-start gap-1.5 mb-2.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{task.description}</p>
              </div>
            )}

            {/* 第三行：承接人、发起人、时间 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {/* 承接人 */}
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {member && (
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-medium text-white"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.avatar}
                  </div>
                )}
                <span className={cn('font-medium', task.assigneeId ? 'text-foreground' : 'text-warning')}>
                  {member?.name || '待分配'}
                </span>
              </div>

              {/* 发起人 */}
              {requester && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">发起:</span>
                  <span>{requester.name}</span>
                </div>
              )}

              {/* 时间 */}
              <div className="flex items-center gap-1 ml-auto">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-medium text-foreground">{task.startDate}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-medium text-foreground">{task.endDate}</span>
                <span className="text-muted-foreground">({task.durationDays}天)</span>
                {task.postponedBy && task.postponedBy > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-warning/10 text-warning text-[10px] font-medium">
                    顺延+{task.postponedBy}d
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
