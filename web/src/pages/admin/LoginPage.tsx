import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STORAGE_KEY = 'admin_token';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [shaking, setShaking] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const expected = import.meta.env.VITE_ADMIN_TOKEN;
    if (password === expected) {
      sessionStorage.setItem(STORAGE_KEY, password);
      navigate('/admin', { replace: true });
    } else {
      // Per D-10: shake animation, no static error text
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setPassword('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div
        className={`w-full max-w-sm bg-white rounded-lg shadow-xl p-8 ${
          shaking ? 'animate-shake' : ''
        }`}
      >
        <h1 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
          Trenfy Admin
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full"
          />
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
