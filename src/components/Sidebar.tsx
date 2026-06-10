import { cn } from '@/lib/utils';
import { TeamMember, DesignTask } from '@/types';
import {
  LayoutDashboard,
  Users,
  Bell,
  Plus,
  BarChart3,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  selectedMember: string | null;
  onSelectMember: (id: string | null) => void;
  unreadCount: number;
  onNotificationClick: () => void;
  onCreateTask: () => void;
  onTeamManage: () => void;
  tasks: DesignTask[];
  members: TeamMember[];
  isAdmin?: boolean;
  isDesigner?: boolean;
}

export default function Sidebar({
  selectedMember,
  onSelectMember,
  unreadCount,
  onNotificationClick,
  onCreateTask,
  onTeamManage,
  tasks,
  members,
  isAdmin = false,
  isDesigner = false,
}: SidebarProps) {
  // 统计
  const totalTasks = tasks.length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="w-64 bg-card border-r flex flex-col h-full">
      {/* Logo区 */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <LayoutDashboard className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">设计排班</h1>
            <p className="text-[10px] text-muted-foreground">DesignScheduler</p>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="p-3">
        <button
          onClick={onCreateTask}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          新建任务
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-accent/60 border border-border">
            <div className="text-lg font-bold text-primary">{totalTasks}</div>
            <div className="text-[10px] text-muted-foreground">全部任务</div>
          </div>
          <div className="p-2.5 rounded-lg bg-accent/60 border border-border">
            <div className="text-lg font-bold text-info">{inProgress}</div>
            <div className="text-[10px] text-muted-foreground">进行中</div>
          </div>
          <div className="p-2.5 rounded-lg bg-accent/60 border border-border">
            <div className="text-lg font-bold text-muted-foreground">{pending}</div>
            <div className="text-[10px] text-muted-foreground">待开始</div>
          </div>
          <div className="p-2.5 rounded-lg bg-accent/60 border border-border">
            <div className="text-lg font-bold text-success">{completed}</div>
            <div className="text-[10px] text-muted-foreground">已完成</div>
          </div>
        </div>
      </div>

      <div className="h-px bg-border mx-3" />

      {/* 团队成员筛选 */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">团队成员</span>
          </div>
          <button
            onClick={onTeamManage}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
            title="团队管理"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={() => onSelectMember(null)}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors mb-0.5',
            !selectedMember ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent',
          )}
        >
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
            <BarChart3 className="w-3 h-3 text-muted-foreground" />
          </div>
          <span>{isAdmin ? '全部成员' : isDesigner ? '我的承接' : '我的任务'}</span>
          <span className="ml-auto text-xs text-muted-foreground">{members.length}</span>
        </button>

        {members.map(member => {
          const memberTasks = tasks.filter(t => t.assigneeId === member.id);
          const memberInProgress = memberTasks.filter(t => t.status === 'in_progress').length;
          return (
            <button
              key={member.id}
              onClick={() => onSelectMember(selectedMember === member.id ? null : member.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors mb-0.5',
                selectedMember === member.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent',
              )}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium text-white"
                style={{ backgroundColor: member.color }}
              >
                {member.avatar}
              </div>
              <div className="flex flex-col items-start">
                <span className="leading-tight">{member.name}</span>
                <span className="text-[9px] text-muted-foreground">{member.role}</span>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {memberInProgress > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
                <span className="text-xs text-muted-foreground">{memberTasks.length}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 底部通知按钮 */}
      <div className="p-3 border-t">
        <button
          onClick={onNotificationClick}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
        >
          <div className="relative">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>通知中心</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-[10px] font-medium text-destructive">{unreadCount} 条未读</span>
          )}
        </button>
      </div>
    </div>
  );
}
