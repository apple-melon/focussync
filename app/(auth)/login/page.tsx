'use client'

import { useState } from 'react'
import { loginWithGoogle, loginWithEmail, signUpWithEmail } from './actions'

type Tab = 'login' | 'signup'

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setEmail('')
    setDisplayName('')
    setSent(false)
    setError('')
    setLoading(false)
  }

  function switchTab(t: Tab) {
    setTab(t)
    resetForm()
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData()
    fd.append('email', email)
    const result = await loginWithEmail(fd)
    setLoading(false)
    if (result?.error) setError(result.error)
    else setSent(true)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData()
    fd.append('email', email)
    fd.append('displayName', displayName)
    const result = await signUpWithEmail(fd)
    setLoading(false)
    if (result?.error) setError(result.error)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#0D0F14] flex items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-3xl font-bold text-white">
            <span className="text-4xl">⚡</span>
            <span>FocusSync</span>
          </div>
          <p className="text-slate-400 text-sm">실시간 같이 공부 + 집중력 게임화 플랫폼</p>
        </div>

        {/* Card */}
        <div className="bg-[#161B22] border border-white/10 rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === 'login'
                  ? 'text-white border-b-2 border-[#6366F1] bg-[#6366F1]/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => switchTab('signup')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === 'signup'
                  ? 'text-white border-b-2 border-[#6366F1] bg-[#6366F1]/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              회원가입
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Google OAuth */}
            <form action={loginWithGoogle}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 {tab === 'login' ? '로그인' : '시작하기'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500">또는 이메일로</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Email form */}
            {sent ? (
              <div className="text-center space-y-2 py-2">
                <p className="text-3xl">📬</p>
                <p className="text-white font-semibold">이메일을 확인해주세요</p>
                <p className="text-slate-400 text-sm">{email}으로 로그인 링크를 발송했습니다.</p>
                <button
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-300 underline mt-2"
                >
                  다시 입력하기
                </button>
              </div>
            ) : tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소"
                  required
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors text-sm"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? '전송 중...' : '로그인 링크 받기'}
                </button>
                <p className="text-center text-xs text-slate-500">
                  계정이 없으신가요?{' '}
                  <button type="button" onClick={() => switchTab('signup')} className="text-[#6366F1] hover:underline">
                    회원가입
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="닉네임 (나중에 변경 가능)"
                  required
                  maxLength={20}
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors text-sm"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소"
                  required
                  className="w-full bg-[#0D0F14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors text-sm"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email || !displayName}
                  className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? '전송 중...' : '가입 링크 받기'}
                </button>
                <p className="text-center text-xs text-slate-500">
                  이미 계정이 있으신가요?{' '}
                  <button type="button" onClick={() => switchTab('login')} className="text-[#6366F1] hover:underline">
                    로그인
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600">
          계속 진행 시{' '}
          <a href="#" className="underline hover:text-slate-400">이용약관</a> 및{' '}
          <a href="#" className="underline hover:text-slate-400">개인정보처리방침</a>에 동의합니다.
        </p>
      </div>
    </div>
  )
}
