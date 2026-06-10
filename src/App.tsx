import { useState, useEffect } from 'react';
import { useScheduler } from '@/hooks/useScheduler';
import { useAuth } from '@/hooks/useAuth';
import { DesignTask, TaskPriority, TaskStatus } from '@/types';
import Sidebar from '@/components/Sidebar';
import GanttChart from '@/components/GanttChart';
import TaskListView from '@/components/TaskListView';
import CreateTaskModal from '@/components/CreateTaskModal';
import NotificationPanel from '@/components/NotificationPanel';
import TaskDetailPanel from '@/components/TaskDetailPanel';
import TeamManagePanel from '@/components/TeamManagePanel';
import LoginPage from '@/components/LoginPage';
import UserManagePanel from '@/components/UserManagePanel';
import { List, GanttChart as GanttIcon, Plus, Bell, Users, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'gantt' | 'list';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function App() {
  const auth = useAuth();
  const scheduler = useScheduler();

  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTeamManage, setShowTeamManage] = useState(false);
  const [showUserManage, setShowUserManage] = useState(false);
  const [showMemberDrawer, setShowMemberDrawer] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);

  // 未登录时显示登录页
  if (!auth.isLoggedIn || !auth.currentUser) {
    return <LoginPage onLogin={auth.login} />;
  }

  const currentUser = auth.currentUser;
  const isAdmin = currentUser.isAdmin;
  const isDesigner = !!currentUser.memberId && !isAdmin;
  const memberId = currentUser.memberId;

  // 根据当前用户过滤可见任务
  const filteredTasks = scheduler.getFilteredTasks(currentUser.id, isAdmin, memberId || undefined);

  // 根据当前用户过滤可见通知
  const userNotifications = scheduler.getNotificationsForUser(currentUser.id, isAdmin, memberId || undefined);
  const userUnreadCount = userNotifications.filter(n => !n.read).length;

  const handleCreateTask = (data: {
    title: string;
    description: string;
    assigneeId: string;
    requesterId: string;
    priority: TaskPriority;
    startDate: string;
    durationDays: number;
    suggestedAssigneeId?: string;
    parallel?: boolean;
  }) => {
    return scheduler.addTask(
      data.title,
      data.description,
      data.assigneeId,
      data.requesterId,
      data.priority,
      data.startDate,
      data.durationDays,
      currentUser.id,
      data.suggestedAssigneeId,
      data.parallel || false,
    );
  };

  const handleTaskClick = (task: DesignTask) => {
    setSelectedTask(task);
  };

  const handleAssignTask = (taskId: string, assigneeId: string, overrides?: { startDate?: string; durationDays?: number; parallel?: boolean }) => {
    const result = scheduler.assignTask(taskId, assigneeId, overrides);
    if (result.success) {
      // 分配成功后关闭详情面板，让用户从列表看到更新
      setSelectedTask(null);
    }
    return result;
  };

  const handleUpdateStatus = (taskId: string, status: TaskStatus) => {
    scheduler.updateTaskStatus(taskId, status);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, status });
    }
  };

  // 管理员可看到所有成员；设计师看到自己+相关成员；发起人只看相关成员
  const visibleMembers = isAdmin
    ? scheduler.members
    : isDesigner
      ? scheduler.members.filter(m =>
          m.id === memberId || filteredTasks.some(t => t.assigneeId === m.id)
        )
      : scheduler.members.filter(m =>
          filteredTasks.some(t => t.assigneeId === m.id)
        );

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sidebar
          selectedMember={scheduler.selectedMember}
          onSelectMember={scheduler.setSelectedMember}
          unreadCount={userUnreadCount}
          onNotificationClick={() => setShowNotifications(true)}
          onCreateTask={() => setShowCreateModal(true)}
          onTeamManage={() => setShowTeamManage(true)}
          tasks={filteredTasks}
          members={visibleMembers}
          isAdmin={isAdmin}
          isDesigner={isDesigner}
        />
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-card">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setShowMemberDrawer(true)} className="p-1.5 rounded-lg bg-accent">
                <Users className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-semibold">
              {scheduler.selectedMember
                ? `${scheduler.getMemberById(scheduler.selectedMember)?.name} 的排班`
                : isAdmin ? '全团队排班总览' : isDesigner ? '我的承接任务' : '我的任务'}
            </h2>
            <span className="text-xs text-muted-foreground">
              {filteredTasks.length} 个任务
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 视图切换 - 管理员才显示甘特图 */}
            {isAdmin && (
              <div className="flex items-center bg-accent rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('gantt')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    viewMode === 'gantt' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <GanttIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">甘特图</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">列表</span>
                </button>
              </div>
            )}

            {/* 当前用户信息 + 操作 */}
            <div className="flex items-center gap-1 pl-2 border-l">
              <div className="hidden sm:flex items-center gap-1.5 mr-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {currentUser.displayName.slice(0, 1)}
                </div>
                <span className="text-xs text-muted-foreground max-w-[80px] truncate">
                  {currentUser.displayName}
                </span>
                {isAdmin && (
                  <span title="管理员">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  </span>
                )}
              </div>
              {isAdmin && (
                <button onClick={() => setShowUserManage(true)} className="p-1.5 hover:bg-accent rounded-lg transition text-muted-foreground hover:text-foreground" title="用户管理">
                  <Users className="w-4 h-4" />
                </button>
              )}
              <button onClick={auth.logout} className="p-1.5 hover:bg-destructive/10 rounded-lg transition text-muted-foreground hover:text-destructive" title="退出登录">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className={cn('flex-1 overflow-hidden p-4', isMobile && 'pb-20')}>
          {isAdmin && viewMode === 'gantt' ? (
            <GanttChart
              tasks={filteredTasks}
              members={scheduler.members}
              getMemberById={scheduler.getMemberById}
              onTaskClick={handleTaskClick}
            />
          ) : (
            <TaskListView
              tasks={filteredTasks}
              getMemberById={scheduler.getMemberById}
              getRequesterById={scheduler.getRequesterById}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      </div>

      {/* 移动端成员选择抽屉 */}
      {isMobile && showMemberDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setShowMemberDrawer(false)} />
          <div className="relative w-64 bg-card border-r flex flex-col h-full animate-slide-in-left">
            <Sidebar
              selectedMember={scheduler.selectedMember}
              onSelectMember={(id) => { scheduler.setSelectedMember(id); setShowMemberDrawer(false); }}
              unreadCount={userUnreadCount}
              onNotificationClick={() => { setShowNotifications(true); setShowMemberDrawer(false); }}
              onCreateTask={() => { setShowCreateModal(true); setShowMemberDrawer(false); }}
              onTeamManage={() => { setShowTeamManage(true); setShowMemberDrawer(false); }}
              tasks={filteredTasks}
              members={visibleMembers}
              isAdmin={isAdmin}
              isDesigner={isDesigner}
            />
          </div>
        </div>
      )}

      {/* 移动端底部导航 */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t flex items-center justify-around px-2 py-2 safe-area-pb">
          <button
            onClick={() => setShowMemberDrawer(true)}
            className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px]', showMemberDrawer ? 'text-primary' : 'text-muted-foreground')}
          >
            <Users className="w-5 h-5" />
            <span>成员</span>
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] text-primary">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center -mt-5 shadow-lg">
              <Plus className="w-5 h-5 text-primary-foreground" />
            </div>
            <span>新建</span>
          </button>
          <button
            onClick={() => setShowNotifications(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] text-muted-foreground relative"
          >
            <Bell className="w-5 h-5" />
            <span>通知</span>
            {userUnreadCount > 0 && (
              <span className="absolute -top-0.5 right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                {userUnreadCount > 9 ? '9+' : userUnreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setShowTeamManage(true)} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] text-muted-foreground">
            <Settings className="w-5 h-5" />
            <span>管理</span>
          </button>
        </div>
      )}

      {/* 创建任务模态框 */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        members={scheduler.members}
        requesters={scheduler.requesters}
        currentUser={currentUser}
        onSubmit={handleCreateTask}
      />

      {/* 通知面板 */}
      <NotificationPanel
        notifications={userNotifications}
        unreadCount={userUnreadCount}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onMarkRead={scheduler.markNotificationRead}
        onMarkAllRead={scheduler.markAllNotificationsRead}
        getMemberById={scheduler.getMemberById}
      />

      {/* 任务详情面板 */}
      <TaskDetailPanel
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        members={scheduler.members}
        requesters={scheduler.requesters}
        currentUser={currentUser}
        getMemberById={scheduler.getMemberById}
        getRequesterById={scheduler.getRequesterById}
        onUpdateTask={scheduler.updateTask}
        onUpdateStatus={handleUpdateStatus}
        onDeleteTask={scheduler.deleteTask}
        onAssignTask={handleAssignTask}
      />

      {/* 团队管理面板 */}
      <TeamManagePanel
        isOpen={showTeamManage}
        onClose={() => setShowTeamManage(false)}
        members={scheduler.members}
        requesters={scheduler.requesters}
        onAddMember={scheduler.addMember}
        onUpdateMember={scheduler.updateMember}
        onDeleteMember={scheduler.deleteMember}
        onAddRequester={scheduler.addRequester}
        onUpdateRequester={scheduler.updateRequester}
        onDeleteRequester={scheduler.deleteRequester}
      />

      {/* 用户管理面板（管理员） */}
      {auth.currentUser && (
        <UserManagePanel
          isOpen={showUserManage}
          onClose={() => setShowUserManage(false)}
          currentUser={auth.currentUser}
          users={auth.users}
          members={scheduler.members}
          requesters={scheduler.requesters}
          onRegister={auth.registerUser}
          onUpdateUser={auth.updateUser}
          onDeleteUser={auth.deleteUser}
          onChangePassword={auth.changePassword}
          onAddRequester={scheduler.addRequester}
        />
      )}
    </div>
  );
}
