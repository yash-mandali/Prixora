import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { errorMessage } from '../../utils/format.js';
import { Brand } from '../../layouts/AppLayout.jsx';
import { BRAND } from '../../constants/index.js';

function AuthForm({ mode }) {
  const isReg = mode === 'register';
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (isReg && f.name.trim().length < 2) return setErr('Please enter your name');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email address');
    if (isReg && f.password.length < 8) return setErr('Password must be at least 8 characters');
    setBusy(true);
    try {
      if (isReg) await register(f); else await login({ email: f.email, password: f.password });
      toast.success(isReg ? `Welcome to ${BRAND.name}!` : 'Welcome back');
      nav('/');
    } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  }

  return (
    <div className="center-screen auth-bg">
      <form className="glass auth-card" onSubmit={submit} noValidate>
        <Brand />
        <div>
          <div className="eyebrow">{BRAND.tagline}</div>
          <h1>{isReg ? 'Create your account' : 'Welcome back'}</h1>
          <p className="subtitle">{isReg ? 'Start tracking product prices in minutes.' : 'Sign in to see your monitors.'}</p>
        </div>
        {err && <div className="alert" role="alert">{err}</div>}
        {isReg && <label>Name<input value={f.name} onChange={set('name')} autoComplete="name" /></label>}
        <label>Email<input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input type="password" value={f.password} onChange={set('password')} autoComplete={isReg ? 'new-password' : 'current-password'} /></label>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Please wait…' : isReg ? 'Create account' : 'Login'}</button>
        <p className="muted center small">{isReg ? <>Already have an account? <Link to="/login">Login</Link></> : <>New here? <Link to="/register">Create an account</Link></>}</p>
      </form>
    </div>
  );
}
export const LoginPage = () => <AuthForm mode="login" />;
export const RegisterPage = () => <AuthForm mode="register" />;
