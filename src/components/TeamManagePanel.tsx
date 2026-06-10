import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TeamMember, Requester } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  Users,
  UserCheck,
  Pencil,
  Trash2,
  Plus,
  Check,
} from 'lucide-react';

interface TeamManagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  members: TeamMember[];
  requesters: Requester[];
  onAddMember: (name: string, role: string) => TeamMember;
  onUpdateMember: (id: string, updates: Partial<Pick<TeamMember, 'name' | 'role'>>) => void;
  onDeleteMember: (id: string) => void;
  onAddRequester: (name: string, role: string) => Requester;
  onUpdateRequester: (id: string, updates: Partial<Pick<Requester, 'name' | 'role'>>) => void;
  onDeleteRequester: (id: string) => void;
}

export default function TeamManagePanel({
  isOpen,
  onClose,
  members,
  requesters,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddRequester,
  onUpdateRequester,
  onDeleteRequester,
}: TeamManagePanelProps) {
  const [tab, setTab] = useState<'members' | 'requesters'>('members');

  // 成员编辑状态
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [showNewMember, setShowNewMember] = useState(false);

  // 发起人编辑状态
  const [editingRequesterId, setEditingRequesterId] = useState<string | null>(null);
  const [editRequesterName, setEditRequesterName] = useState('');
  const [editRequesterRole, setEditRequesterRole] = useState('');
  const [newRequesterName, setNewRequesterName] = useState('');
  const [newRequesterRole, setNewRequesterRole] = useState('');
  const [showNewRequester, setShowNewRequester] = useState(false);

  if (!isOpen) return null;

  // ===== 成员操作 =====
  const startEditMember = (m: TeamMember) => {
    setEditingMemberId(m.id);
    setEditMemberName(m.name);
    setEditMemberRole(m.role);
  };

  const saveEditMember = () => {
    if (editingMemberId && editMemberName.trim() && editMemberRole.trim()) {
      onUpdateMember(editingMemberId, {
        name: editMemberName.trim(),
        role: editMemberRole.trim(),
      });
      setEditingMemberId(null);
    }
  };

  const cancelEditMember = () => {
    setEditingMemberId(null);
  };

  const handleAddMember = () => {
    if (newMemberName.trim() && newMemberRole.trim()) {
      onAddMember(newMemberName.trim(), newMemberRole.trim());
      setNewMemberName('');
      setNewMemberRole('');
      setShowNewMember(false);
    }
  };

  // ===== 发起人操作 =====
  const startEditRequester = (r: Requester) => {
    setEditingRequesterId(r.id);
    setEditRequesterName(r.name);
    setEditRequesterRole(r.role);
  };

  const saveEditRequester = () => {
    if (editingRequesterId && editRequesterName.trim() && editRequesterRole.trim()) {
      onUpdateRequester(editingRequesterId, {
        name: editRequesterName.trim(),
        role: editRequesterRole.trim(),
      });
      setEditingRequesterId(null);
    }
  };

  const cancelEditRequester = () => {
    setEditingRequesterId(null);
  };

  const handleAddRequester = () => {
    if (newRequesterName.trim() && newRequesterRole.trim()) {
      onAddRequester(newRequesterName.trim(), newRequesterRole.trim());
      setNewRequesterName('');
      setNewRequesterRole('');
      setShowNewRequester(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l shadow-2xl animate-slide-in flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-base">团队管理</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('members')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Users className="w-4 h-4" />
            设计师 ({members.length})
          </button>
          <button
            onClick={() => setTab('requesters')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === 'requesters'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <UserCheck className="w-4 h-4" />
            发起人 ({requesters.length})
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {tab === 'members' ? (
            <div className="p-4 space-y-2">
              {/* 添加按钮 */}
              {showNewMember ? (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <Input
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    placeholder="姓名"
                    autoFocus
                  />
                  <Input
                    value={newMemberRole}
                    onChange={e => setNewMemberRole(e.target.value)}
                    placeholder="岗位名称（如：UI设计师）"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setShowNewMember(false); setNewMemberName(''); setNewMemberRole(''); }} className="flex-1">
                      取消
                    </Button>
                    <Button size="sm" onClick={handleAddMember} className="flex-1">
                      添加
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewMember(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加设计师
                </button>
              )}

              {/* 成员列表 */}
              {members.map(member => (
                <div key={member.id} className="group">
                  {editingMemberId === member.id ? (
                    /* 编辑模式 */
                    <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                      <Input
                        value={editMemberName}
                        onChange={e => setEditMemberName(e.target.value)}
                        placeholder="姓名"
                        autoFocus
                      />
                      <Input
                        value={editMemberRole}
                        onChange={e => setEditMemberRole(e.target.value)}
                        placeholder="岗位名称"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={cancelEditMember} className="flex-1">
                          取消
                        </Button>
                        <Button size="sm" onClick={saveEditMember} className="flex-1">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* 展示模式 */
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditMember(member)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMember(member.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {/* 添加按钮 */}
              {showNewRequester ? (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <Input
                    value={newRequesterName}
                    onChange={e => setNewRequesterName(e.target.value)}
                    placeholder="姓名"
                    autoFocus
                  />
                  <Input
                    value={newRequesterRole}
                    onChange={e => setNewRequesterRole(e.target.value)}
                    placeholder="岗位名称（如：项目经理）"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setShowNewRequester(false); setNewRequesterName(''); setNewRequesterRole(''); }} className="flex-1">
                      取消
                    </Button>
                    <Button size="sm" onClick={handleAddRequester} className="flex-1">
                      添加
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewRequester(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加发起人
                </button>
              )}

              {/* 发起人列表 */}
              {requesters.map(requester => (
                <div key={requester.id} className="group">
                  {editingRequesterId === requester.id ? (
                    /* 编辑模式 */
                    <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                      <Input
                        value={editRequesterName}
                        onChange={e => setEditRequesterName(e.target.value)}
                        placeholder="姓名"
                        autoFocus
                      />
                      <Input
                        value={editRequesterRole}
                        onChange={e => setEditRequesterRole(e.target.value)}
                        placeholder="岗位名称"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={cancelEditRequester} className="flex-1">
                          取消
                        </Button>
                        <Button size="sm" onClick={saveEditRequester} className="flex-1">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* 展示模式 */
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                        {requester.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{requester.name}</div>
                        <div className="text-xs text-muted-foreground">{requester.role}</div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditRequester(requester)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRequester(requester.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
