import { useState, FormEvent } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => { success: boolean; message: string };
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }
    setLoading(true);
    setError('');
    // 模拟异步延迟，提升体验
    setTimeout(() => {
      const result = onLogin(username.trim(), password);
      if (!result.success) {
        setError(result.message);
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-sm">
        {/* Logo / 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg mb-4">
            <span className="text-2xl font-bold text-primary-foreground">设</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">设计任务排班系统</h1>
          <p className="text-sm text-muted-foreground mt-1">请登录以继续使用</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-card rounded-2xl shadow-xl p-8 border">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 账号 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">账号</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="请输入账号"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-60"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            如需账号请联系系统管理员
          </p>
        </div>
      </div>
    </div>
  );
}
