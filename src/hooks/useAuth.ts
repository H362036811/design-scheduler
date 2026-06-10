import { useState, useCallback, useEffect } from 'react';
import { AppUser, AuthState } from '@/types';

const STORAGE_KEY_USERS = 'ds_users';
const STORAGE_KEY_SESSION = 'ds_session';
// 每次修改初始用户配置时递增此版本号，触发强制重置
const INITIAL_DATA_VERSION = 5;
const STORAGE_KEY_VERSION = 'ds_init_version';

// 简单哈希（Base64 编码，不依赖 Web Crypto，适合前端 localStorage 场景）
function simpleHash(str: string): string {
  return btoa(encodeURIComponent(str + '_ds_salt_2024'));
}

function verifyPassword(plain: string, hash: string): boolean {
  return simpleHash(plain) === hash;
}

// 初始用户列表
function getInitialUsers(): AppUser[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'u_admin',
      username: 'htl',
      passwordHash: simpleHash('htl605'),
      displayName: '洪铁流',
      isAdmin: true,
      memberId: 'm1',
      createdAt: now,
    },
    {
      id: 'u_kzw',
      username: 'kzw',
      passwordHash: simpleHash('djkjsj'),
      displayName: '柯志文',
      isAdmin: false,
      memberId: undefined,
      requesterId: 'pm1',
      createdAt: now,
    },
    {
      id: 'u_yxn',
      username: 'yxn',
      passwordHash: simpleHash('djkjsj'),
      displayName: '杨小宁',
      isAdmin: false,
      memberId: undefined,
      requesterId: 'pm3',
      createdAt: now,
    },
    {
      id: 'u_hyh',
      username: 'hyh',
      passwordHash: simpleHash('djkjsj'),
      displayName: '胡跃华',
      isAdmin: false,
      memberId: undefined,
      requesterId: 'pm2',
      createdAt: now,
    },
    // 设计师账号
    {
      id: 'u_ln',
      username: 'ln',
      passwordHash: simpleHash('djkjsj'),
      displayName: '李娜',
      isAdmin: false,
      memberId: 'm2',
      createdAt: now,
    },
    {
      id: 'u_wl',
      username: 'wl',
      passwordHash: simpleHash('djkjsj'),
      displayName: '王磊',
      isAdmin: false,
      memberId: 'm3',
      createdAt: now,
    },
    {
      id: 'u_cj',
      username: 'cj',
      passwordHash: simpleHash('djkjsj'),
      displayName: '陈静',
      isAdmin: false,
      memberId: 'm4',
      createdAt: now,
    },
    {
      id: 'u_ly',
      username: 'ly',
      passwordHash: simpleHash('djkjsj'),
      displayName: '刘洋',
      isAdmin: false,
      memberId: 'm5',
      createdAt: now,
    },
  ];
}

function loadUsers(): AppUser[] {
  try {
    // 版本检查：版本不匹配则强制重置初始用户（保留管理员以外的自定义用户）
    const storedVersion = parseInt(localStorage.getItem(STORAGE_KEY_VERSION) || '0', 10);
    if (storedVersion < INITIAL_DATA_VERSION) {
      const initial = getInitialUsers();
      // 保留非内置 id 的自定义用户（管理员手动注册的）
      const builtinIds = new Set(initial.map(u => u.id));
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      const existing: AppUser[] = raw ? JSON.parse(raw) : [];
      const customUsers = existing.filter(u => !builtinIds.has(u.id));
      const merged = [...initial, ...customUsers];
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(merged));
      localStorage.setItem(STORAGE_KEY_VERSION, String(INITIAL_DATA_VERSION));
      return merged;
    }
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) return JSON.parse(raw) as AppUser[];
  } catch {
    // ignore
  }
  // 首次：写入初始用户
  const initial = getInitialUsers();
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(initial));
  localStorage.setItem(STORAGE_KEY_VERSION, String(INITIAL_DATA_VERSION));
  return initial;
}

function saveUsers(users: AppUser[]) {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (raw) return JSON.parse(raw) as AppUser;
  } catch {
    // ignore
  }
  return null;
}

function saveSession(user: AppUser | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
}

export function useAuth() {
  const [users, setUsers] = useState<AppUser[]>(() => loadUsers());
  const [authState, setAuthState] = useState<AuthState>(() => {
    const savedUser = loadSession();
    // 验证 session 中的用户是否仍存在
    if (savedUser) {
      const allUsers = loadUsers();
      const found = allUsers.find(u => u.id === savedUser.id);
      if (found) return { currentUser: found, isLoggedIn: true };
    }
    return { currentUser: null, isLoggedIn: false };
  });

  // 同步 users 变化到 localStorage
  useEffect(() => {
    saveUsers(users);
  }, [users]);

  const login = useCallback((username: string, password: string): { success: boolean; message: string } => {
    const user = users.find(u => u.username === username);
    if (!user) {
      return { success: false, message: '账号不存在' };
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return { success: false, message: '密码错误' };
    }
    setAuthState({ currentUser: user, isLoggedIn: true });
    saveSession(user);
    return { success: true, message: '登录成功' };
  }, [users]);

  const logout = useCallback(() => {
    setAuthState({ currentUser: null, isLoggedIn: false });
    saveSession(null);
  }, []);

  // 注册新用户（仅管理员调用）
  const registerUser = useCallback((
    username: string,
    displayName: string,
    password: string,
    memberId?: string,
    requesterId?: string,
  ): { success: boolean; message: string } => {
    if (users.find(u => u.username === username)) {
      return { success: false, message: '账号已存在' };
    }
    const newUser: AppUser = {
      id: 'u_' + Date.now(),
      username,
      passwordHash: simpleHash(password),
      displayName,
      isAdmin: false,
      memberId,
      requesterId,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    return { success: true, message: '注册成功' };
  }, [users]);

  // 更新用户信息（管理员可改所有人，普通用户只能改自己密码）
  const updateUser = useCallback((
    userId: string,
    updates: Partial<Pick<AppUser, 'username' | 'displayName' | 'memberId' | 'requesterId' | 'isAdmin'>> & { newPassword?: string },
  ): { success: boolean; message: string } => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const updated = { ...u };
      if (updates.username !== undefined) {
        // 检查用户名是否已被其他用户占用
        const conflict = prev.find(x => x.username === updates.username && x.id !== userId);
        if (conflict) return u; // 返回原值，外层再报错
        updated.username = updates.username;
      }
      if (updates.displayName !== undefined) updated.displayName = updates.displayName;
      if (updates.memberId !== undefined) updated.memberId = updates.memberId;
      if (updates.requesterId !== undefined) updated.requesterId = updates.requesterId;
      if (updates.isAdmin !== undefined) updated.isAdmin = updates.isAdmin;
      if (updates.newPassword) updated.passwordHash = simpleHash(updates.newPassword);
      return updated;
    }));
    // 若修改的是当前登录用户，同步 session
    setAuthState(prev => {
      if (!prev.currentUser || prev.currentUser.id !== userId) return prev;
      const freshUsers = loadUsers();
      const updated = freshUsers.find(u => u.id === userId);
      if (!updated) return prev;
      saveSession(updated);
      return { ...prev, currentUser: updated };
    });
    return { success: true, message: '更新成功' };
  }, []);

  // 删除用户（管理员操作，不能删除自己）
  const deleteUser = useCallback((userId: string): { success: boolean; message: string } => {
    if (authState.currentUser?.id === userId) {
      return { success: false, message: '不能删除当前登录的账号' };
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    return { success: true, message: '删除成功' };
  }, [authState.currentUser]);

  // 修改自己的密码
  const changePassword = useCallback((
    oldPassword: string,
    newPassword: string,
  ): { success: boolean; message: string } => {
    const user = authState.currentUser;
    if (!user) return { success: false, message: '未登录' };
    if (!verifyPassword(oldPassword, user.passwordHash)) {
      return { success: false, message: '原密码错误' };
    }
    return updateUser(user.id, { newPassword });
  }, [authState.currentUser, updateUser]);

  return {
    ...authState,
    users,
    login,
    logout,
    registerUser,
    updateUser,
    deleteUser,
    changePassword,
  };
}
