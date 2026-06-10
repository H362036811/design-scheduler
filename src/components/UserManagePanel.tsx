import { useState } from 'react';
import { AppUser, Requester } from '@/types';
import { TeamMember } from '@/types';
import { X, UserPlus, Pencil, Trash2, ShieldCheck, Key } from 'lucide-react';

interface UserManagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  users: AppUser[];
  members: TeamMember[];
  requesters: Requester[];
  onRegister: (username: string, displayName: string, password: string, memberId?: string, requesterId?: string) => { success: boolean; message: string };
  onUpdateUser: (userId: string, updates: Partial<Pick<AppUser, 'username' | 'displayName' | 'memberId' | 'requesterId' | 'isAdmin'>> & { newPassword?: string }) => { success: boolean; message: string };
  onDeleteUser: (userId: string) => { success: boolean; message: string };
  onChangePassword: (oldPwd: string, newPwd: string) => { success: boolean; message: string };
  onAddRequester: (name: string, role: string) => Requester;
}

type ModalMode = 'register' | 'edit' | 'changePwd' | null;

interface FormState {
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  role: 'designer' | 'requester' | '';   // 注册时选择角色
  memberId: string;
  requesterId: string;
  isAdmin: boolean;
  oldPassword: string;
}

const emptyForm: FormState = {
  username: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  role: '',
  memberId: '',
  requesterId: '',
  isAdmin: false,
  oldPassword: '',
};

export default function UserManagePanel({
  isOpen,
  onClose,
  currentUser,
  users,
  members,
  requesters,
  onRegister,
  onUpdateUser,
  onDeleteUser,
  onChangePassword,
  onAddRequester,
}: UserManagePanelProps) {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  if (!isOpen) return null;

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedback(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedback(''), 3000);
  };

  const openRegister = () => {
    setForm(emptyForm);
    setEditingUser(null);
    setModalMode('register');
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setForm({
      ...emptyForm,
      username: user.username,
      displayName: user.displayName,
      role: user.memberId ? 'designer' : user.requesterId ? 'requester' : '',
      memberId: user.memberId || '',
      requesterId: user.requesterId || '',
      isAdmin: user.isAdmin,
    });
    setModalMode('edit');
  };

  const openChangePwd = () => {
    setForm(emptyForm);
    setModalMode('changePwd');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleRegister = () => {
    if (!form.username.trim() || !form.displayName.trim() || !form.password) {
      showFeedback('账号、姓名和密码不能为空', 'error');
      return;
    }
    if (!form.role) {
      showFeedback('请选择用户角色', 'error');
      return;
    }
    if (form.password !== form.confirmPassword) {
      showFeedback('两次密码不一致', 'error');
      return;
    }
    // 设计师必须选择关联的团队成员
    if (form.role === 'designer' && !form.memberId) {
      showFeedback('设计师必须关联团队成员', 'error');
      return;
    }
    // 任务发起人：自动创建 Requester 并关联
    let requesterId: string | undefined;
    if (form.role === 'requester') {
      // 先检查是否已有同名的 requester
      const existing = requesters.find(r => r.name === form.displayName.trim());
      if (existing) {
        requesterId = existing.id;
      } else {
        const newRequester = onAddRequester(form.displayName.trim(), '任务发起人');
        requesterId = newRequester.id;
      }
    }
    const result = onRegister(
      form.username.trim(),
      form.displayName.trim(),
      form.password,
      form.role === 'designer' ? form.memberId || undefined : undefined,
      requesterId,
    );
    showFeedback(result.message, result.success ? 'success' : 'error');
    if (result.success) closeModal();
  };

  const handleEdit = () => {
    if (!editingUser) return;
    if (!form.username.trim() || !form.displayName.trim()) {
      showFeedback('账号和姓名不能为空', 'error');
      return;
    }
    const updates: Parameters<typeof onUpdateUser>[1] = {
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      memberId: form.memberId || undefined,
      requesterId: form.requesterId || undefined,
      isAdmin: form.isAdmin,
    };
    if (form.password) {
      if (form.password !== form.confirmPassword) {
        showFeedback('两次密码不一致', 'error');
        return;
      }
      updates.newPassword = form.password;
    }
    const result = onUpdateUser(editingUser.id, updates);
    showFeedback(result.message, result.success ? 'success' : 'error');
    if (result.success) closeModal();
  };

  const handleChangePwd = () => {
    if (!form.oldPassword || !form.password) {
      showFeedback('请填写原密码和新密码', 'error');
      return;
    }
    if (form.password !== form.confirmPassword) {
      showFeedback('两次新密码不一致', 'error');
      return;
    }
    const result = onChangePassword(form.oldPassword, form.password);
    showFeedback(result.message, result.success ? 'success' : 'error');
    if (result.success) closeModal();
  };

  const handleDelete = (user: AppUser) => {
    if (user.id === currentUser.id) {
      showFeedback('不能删除自己的账号', 'error');
      return;
    }
    if (!confirm(`确认删除用户「${user.displayName}」？此操作不可撤销。`)) return;
    const result = onDeleteUser(user.id);
    showFeedback(result.message, result.success ? 'success' : 'error');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border flex flex-col max-h-[90vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">用户管理</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 反馈提示 */}
        {feedback && (
          <div className={`mx-6 mt-3 px-3 py-2 rounded-lg text-sm ${feedbackType === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
            {feedback}
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 操作按钮 */}
          <div className="flex gap-2 flex-wrap">
            {currentUser.isAdmin && (
              <button
                onClick={openRegister}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
              >
                <UserPlus className="w-4 h-4" />
                注册新用户
              </button>
            )}
            <button
              onClick={openChangePwd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-accent transition"
            >
              <Key className="w-4 h-4" />
              修改我的密码
            </button>
          </div>

          {/* 用户列表 */}
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl border bg-background hover:bg-accent/30 transition">
                {/* 头像 */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${user.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {user.displayName.slice(0, 1)}
                </div>
                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{user.displayName}</span>
                    {user.isAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">管理员</span>
                    )}
                    {user.memberId && !user.isAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-info/10 text-info font-medium">设计师</span>
                    )}
                    {user.requesterId && !user.isAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium">发起人</span>
                    )}
                    {user.id === currentUser.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground">我</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">@{user.username}</div>
                </div>
                {/* 操作 */}
                {currentUser.isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 hover:bg-accent rounded-lg transition text-muted-foreground hover:text-foreground"
                      title="编辑"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {user.id !== currentUser.id && (
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg transition text-muted-foreground hover:text-destructive"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 注册/编辑/修改密码 弹窗 */}
      {modalMode && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40" onClick={closeModal} />
          <div className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {modalMode === 'register' ? '注册新用户' : modalMode === 'edit' ? '编辑用户' : '修改密码'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-accent rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {modalMode !== 'changePwd' && (
                <>
                  <Field label="账号（登录名）">
                    <input
                      type="text"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="英文/拼音，如：zhangsan"
                      className="input-field"
                    />
                  </Field>
                  <Field label="姓名（显示名）">
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                      placeholder="如：张三"
                      className="input-field"
                    />
                  </Field>
                  {modalMode === 'register' && (
                    <Field label="用户角色">
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="userRole"
                            value="requester"
                            checked={form.role === 'requester'}
                            onChange={() => setForm(f => ({ ...f, role: 'requester', memberId: '' }))}
                            className="accent-primary"
                          />
                          <span className="text-sm">任务发起人</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="userRole"
                            value="designer"
                            checked={form.role === 'designer'}
                            onChange={() => setForm(f => ({ ...f, role: 'designer', requesterId: '' }))}
                            className="accent-primary"
                          />
                          <span className="text-sm">设计师</span>
                        </label>
                      </div>
                    </Field>
                  )}
                  {form.role === 'designer' && (
                    <Field label="关联团队成员">
                      <select
                        value={form.memberId}
                        onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}
                        className="input-field"
                      >
                        <option value="">-- 请选择 --</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}（{m.role}）</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {form.role === 'requester' && (
                    <div className="text-xs text-muted-foreground p-2 rounded-md bg-accent/30 border">
                      注册后将自动创建对应的任务发起人记录
                    </div>
                  )}
                  {modalMode === 'edit' && currentUser.isAdmin && editingUser?.id !== currentUser.id && (
                    <div className="flex items-center gap-2">
                      <input
                        id="isAdmin"
                        type="checkbox"
                        checked={form.isAdmin}
                        onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))}
                        className="w-4 h-4 accent-primary"
                      />
                      <label htmlFor="isAdmin" className="text-sm cursor-pointer">设为管理员</label>
                    </div>
                  )}
                </>
              )}

              {modalMode === 'changePwd' && (
                <Field label="原密码">
                  <input
                    type="password"
                    value={form.oldPassword}
                    onChange={e => setForm(f => ({ ...f, oldPassword: e.target.value }))}
                    className="input-field"
                    placeholder="请输入原密码"
                  />
                </Field>
              )}

              <Field label={modalMode === 'edit' ? '新密码（不填则不修改）' : '密码'}>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field"
                  placeholder={modalMode === 'register' ? '请输入密码' : '留空则不修改'}
                />
              </Field>
              {(form.password || modalMode === 'register' || modalMode === 'changePwd') && (
                <Field label="确认密码">
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className="input-field"
                    placeholder="再次输入密码"
                  />
                </Field>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={closeModal}
                className="flex-1 py-2 rounded-lg border text-sm hover:bg-accent transition"
              >
                取消
              </button>
              <button
                onClick={
                  modalMode === 'register' ? handleRegister :
                  modalMode === 'edit' ? handleEdit :
                  handleChangePwd
                }
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
