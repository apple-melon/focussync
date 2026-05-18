import Link from 'next/link'

const FEATURES = [
  { icon: '⏱', title: '포모도로 타이머', desc: '집중-휴식 사이클로 생산성을 극대화하세요. 애니메이션 링 타이머로 시각적 피드백을 받아보세요.' },
  { icon: '👥', title: '실시간 같이 공부', desc: '최대 20명과 함께 집중방에 입장하고, 서로의 상태를 실시간으로 확인하세요.' },
  { icon: '⚡', title: 'XP & 레벨업', desc: '공부할수록 XP를 쌓고 레벨업하세요. 커먼부터 전설까지 5가지 티어가 있어요.' },
  { icon: '🔥', title: '스트릭 시스템', desc: '매일 공부하는 습관을 유지하세요. 스트릭이 끊기지 않도록 리마인더도 받을 수 있어요.' },
  { icon: '🏆', title: '랭킹 & 경쟁', desc: '일간/주간/전체 랭킹에서 친구들과 경쟁하고 상위권에 도전하세요.' },
  { icon: '🎖', title: '업적 시스템', desc: '다양한 도전 과제를 달성하고 희귀 업적 배지를 수집하세요.' },
]

const STEPS = [
  { num: '01', title: '방 만들기', desc: '주제와 이름을 설정하고 공개/비공개 집중방을 만드세요.' },
  { num: '02', title: '친구 초대', desc: '방 코드를 공유하거나 공개 목록에서 친구가 입장하도록 하세요.' },
  { num: '03', title: '같이 집중', desc: '포모도로 타이머를 시작하고 XP를 쌓으며 함께 성장하세요.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0D0F14] text-white">
      {/* Grid background */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Nav */}
      <nav className="relative border-b border-white/10 bg-[#161B22]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <span className="font-bold text-lg">⚡ FocusWithMe</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">대시보드</Link>
          <Link href="/login" className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            시작하기
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-6 py-24 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/30 text-[#6366F1] text-sm px-4 py-1.5 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          지금 실시간으로 공부 중인 방이 있어요
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight">
          혼자보다{' '}
          <span className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">같이</span>
          {' '}공부할 때<br />더 집중돼요
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          실시간 집중방 + 포모도로 타이머 + 게임화 XP 시스템으로 공부를 게임처럼 즐겁게 만들어보세요.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(99,102,241,0.4)]"
          >
            무료로 시작하기 →
          </Link>
          <Link
            href="/room/create"
            className="bg-[#161B22] hover:bg-[#1C2333] border border-white/10 text-white font-semibold px-6 py-4 rounded-xl text-lg transition-colors"
          >
            방 만들기
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-12 pt-12 text-center">
          {[
            { value: '1,200+', label: '공부 세션' },
            { value: '340+', label: '활성 사용자' },
            { value: '98시간', label: '오늘의 집중 시간' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">어떻게 사용하나요?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <div key={step.num} className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/40 flex items-center justify-center font-mono font-bold text-[#6366F1] mx-auto">
                {step.num}
              </div>
              <h3 className="font-bold text-white">{step.title}</h3>
              <p className="text-sm text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">주요 기능</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[#161B22] hover:bg-[#1C2333] border border-white/10 hover:border-[#6366F1]/30 rounded-xl p-5 transition-all group">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-white mb-2 group-hover:text-[#6366F1] transition-colors">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-2xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="text-4xl font-extrabold">오늘부터 같이 공부해요</h2>
        <p className="text-slate-400">회원가입 30초, 방 만들기 10초. 지금 바로 시작하세요.</p>
        <Link
          href="/login"
          className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold px-10 py-4 rounded-xl text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(99,102,241,0.4)]"
        >
          무료 시작 — 지금 바로 →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-600">
        <p>© 2026 FocusWithMe. 함께 집중하고, 함께 성장해요.</p>
      </footer>
    </div>
  )
}
