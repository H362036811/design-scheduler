import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { DesignTask, TaskPriority, TeamMember } from '@/types';
import {
  format,
  addDays,
  differenceInDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWeekend,
  isToday,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface GanttChartProps {
  tasks: DesignTask[];
  members: TeamMember[];
  getMemberById: (id: string) => { id: string; name: string; role: string; avatar: string; color: string } | undefined;
  onTaskClick?: (task: DesignTask) => void;
}

const CELL_WIDTH = 44;
const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 64;
const NAME_WIDTH = 180;

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  urgent: { label: '紧急', className: 'bg-gantt-bar-urgent' },
  high: { label: '高优', className: 'bg-gantt-bar-primary' },
  normal: { label: '普通', className: 'bg-gantt-bar-normal' },
  low: { label: '低优', className: 'bg-gantt-bar-low' },
};

export default function GanttChart({ tasks, members, getMemberById, onTaskClick }: GanttChartProps) {
  const [viewOffset, setViewOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算显示范围：以今天为中心，左右各扩展
  const today = new Date();
  const viewStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), viewOffset * 7);
  const viewEnd = endOfWeek(addDays(viewStart, 27), { weekStartsOn: 1 }); // 显示4周
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;

  // 按承接人分组任务
  const memberTasks = useMemo(() => {
    const grouped = new Map<string, DesignTask[]>();
    for (const member of members) {
      const memberTaskList = tasks
        .filter(t => t.assigneeId === member.id)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      if (memberTaskList.length > 0) {
        grouped.set(member.id, memberTaskList);
      }
    }
    return grouped;
  }, [tasks]);

  // 生成日期列
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      result.push(addDays(viewStart, i));
    }
    return result;
  }, [viewStart, totalDays]);

  // 生成周标题
  const weeks = useMemo(() => {
    const result: { label: string; startIdx: number; span: number }[] = [];
    let i = 0;
    while (i < days.length) {
      const weekStart = days[i];
      const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
      let span = 0;
      let j = i;
      while (j < days.length && !isAfter(days[j], weekEndDate)) {
        span++;
        j++;
      }
      result.push({
        label: format(weekStart, 'MM/dd', { locale: zhCN }) + ' - ' + format(addDays(weekStart, span - 1), 'MM/dd', { locale: zhCN }),
        startIdx: i,
        span,
      });
      i = j;
    }
    return result;
  }, [days]);

  function isAfter(d1: Date, d2: Date) {
    return d1.getTime() > d2.getTime();
  }

  // 计算任务条位置
  const getTaskBarStyle = (task: DesignTask) => {
    const taskStart = parseISO(task.startDate);
    const taskEnd = parseISO(task.endDate);
    const left = differenceInDays(taskStart, viewStart) * CELL_WIDTH;
    const width = (differenceInDays(taskEnd, taskStart) + 1) * CELL_WIDTH - 4;
    return { left: left + 2, width: Math.max(width, CELL_WIDTH - 4) };
  };

  // 检查任务是否在可见范围内
  const isTaskVisible = (task: DesignTask) => {
    const taskStart = parseISO(task.startDate);
    const taskEnd = parseISO(task.endDate);
    return !(isAfter(viewStart, taskEnd) || isAfter(taskStart, viewEnd));
  };

  const todayOffset = differenceInDays(today, viewStart);

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            {format(viewStart, 'yyyy年MM月dd日', { locale: zhCN })} - {format(viewEnd, 'MM月dd日', { locale: zhCN })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewOffset(prev => prev - 1)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewOffset(0)}
            className="px-3 py-1 text-xs rounded-md hover:bg-accent transition-colors font-medium"
          >
            今天
          </button>
          <button
            onClick={() => setViewOffset(prev => prev + 1)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：成员名称列 */}
        <div className="flex-shrink-0 border-r bg-card" style={{ width: NAME_WIDTH }}>
          {/* 表头占位 */}
          <div style={{ height: HEADER_HEIGHT }} className="border-b flex items-center px-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">团队成员</span>
          </div>
          {/* 成员行 */}
          {Array.from(memberTasks.entries()).map(([memberId, memberTaskList]) => {
            const member = getMemberById(memberId);
            if (!member) return null;
            return (
              <div key={memberId}>
                {memberTaskList.map((task, idx) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-4 border-b border-b/50 hover:bg-accent/30 transition-colors cursor-pointer"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onTaskClick?.(task)}
                  >
                    {idx === 0 && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.avatar}
                      </div>
                    )}
                    {idx === 0 && (
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{member.name}</span>
                        <span className="text-[10px] text-muted-foreground">{member.role}</span>
                      </div>
                    )}
                    {idx !== 0 && <div style={{ width: 90 }} />}
                    {idx !== 0 && (
                      <span className="text-xs text-muted-foreground truncate">
                        {task.title.length > 6 ? task.title.slice(0, 6) + '...' : task.title}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* 右侧：甘特图时间轴 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin"
        >
          <div style={{ width: totalDays * CELL_WIDTH, minWidth: '100%' }}>
            {/* 日期表头 - 两行：周 + 日期 */}
            <div className="sticky top-0 z-10 bg-card border-b" style={{ height: HEADER_HEIGHT }}>
              {/* 第一行：周 */}
              <div className="flex border-b" style={{ height: HEADER_HEIGHT / 2 }}>
                {weeks.map((week, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-[10px] font-medium text-muted-foreground border-r"
                    style={{
                      width: week.span * CELL_WIDTH,
                    }}
                  >
                    {week.label}
                  </div>
                ))}
              </div>
              {/* 第二行：日期 */}
              <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                {days.map((day, i) => {
                  const weekend = isWeekend(day);
                  const todayFlag = isToday(day);
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center justify-center text-[10px] border-r',
                        weekend && 'bg-gantt-weekend/60',
                        todayFlag && 'bg-primary/10 font-bold text-primary',
                      )}
                      style={{ width: CELL_WIDTH }}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 甘特图主体 */}
            {Array.from(memberTasks.entries()).map(([memberId, memberTaskList]) => {
              getMemberById(memberId);
              return (
                <div key={memberId}>
                  {memberTaskList.map(task => {
                    if (!isTaskVisible(task)) {
                      return <div key={task.id} style={{ height: ROW_HEIGHT }} className="border-b border-b/50" />;
                    }
                    const barStyle = getTaskBarStyle(task);
                    const priority = priorityConfig[task.priority];
                    return (
                      <div
                        key={task.id}
                        className="relative border-b border-b/50 hover:bg-accent/20 transition-colors"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* 网格线 */}
                        <div className="absolute inset-0 flex">
                          {days.map((day, i) => (
                            <div
                              key={i}
                              className={cn(
                                'border-r border-gantt-grid/50',
                                isWeekend(day) && 'bg-gantt-weekend/30',
                              )}
                              style={{ width: CELL_WIDTH }}
                            />
                          ))}
                        </div>

                        {/* 今日线 */}
                        {todayOffset >= 0 && todayOffset < totalDays && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-gantt-today/40 z-[5]"
                            style={{ left: todayOffset * CELL_WIDTH + CELL_WIDTH / 2 }}
                          />
                        )}

                        {/* 任务条 */}
                        <div
                          className={cn(
                            'absolute top-2 bottom-2 rounded-md z-[6] cursor-pointer flex items-center px-2 gap-1 shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110 group',
                            priority.className,
                            task.parallel && 'border-2 border-dashed border-white/50',
                          )}
                          style={{
                            left: barStyle.left,
                            width: barStyle.width,
                          }}
                          onClick={() => onTaskClick?.(task)}
                        >
                          {task.parallel && (
                            <svg className="w-3 h-3 flex-shrink-0 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <rect x="3" y="3" width="7" height="7" rx="1" />
                              <rect x="14" y="8" width="7" height="7" rx="1" />
                            </svg>
                          )}
                          <span className="text-[10px] font-medium text-white truncate">
                            {task.title}
                          </span>
                          {task.postponedBy && task.postponedBy > 0 && (
                            <span className="ml-auto flex-shrink-0 bg-white/30 rounded px-1 text-[9px] text-white font-medium" title={`已顺延${task.postponedBy}天`}>
                              +{task.postponedBy}d
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
