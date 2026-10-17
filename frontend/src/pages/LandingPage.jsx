import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  ClipboardList,
  LineChart,
  Lock,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const FEATURES = [
  {
    icon: Bot,
    title: 'Chat instead of forms',
    body: 'Describe the problem the way you would tell a neighbour. The assistant extracts the category, the details and the location for you.',
    tone: 'from-brand-600 to-brand-500',
  },
  {
    icon: BadgeCheck,
    title: 'You confirm, then it is filed',
    body: 'Nothing is stored until you review the summary and approve it. You always get a real tracking ID back from the server.',
    tone: 'from-accent-500 to-accent-600',
  },
  {
    icon: Search,
    title: 'Track until resolved',
    body: 'Look up any complaint by its tracking ID - or just ask the chatbot "what is the status of CIV-2026-XXXXXX?"',
    tone: 'from-brand-600 to-accent-500',
  },
  {
    icon: ShieldCheck,
    title: 'Separation of duties',
    body: 'Citizens only ever see their own complaints. Administrators triage everything and every status change is audit-logged.',
    tone: 'from-slate-700 to-slate-900',
  },
];

const STEPS = [
  {
    icon: MessageSquare,
    title: 'Describe the problem',
    body: 'Type it in plain language: "there is a large pothole on MG Road near the bus stop".',
  },
  {
    icon: Sparkles,
    title: 'The AI structures it',
    body: 'It detects the category, asks for anything missing - especially the location - and shows a summary.',
  },
  {
    icon: Wrench,
    title: 'The city responds',
    body: 'Confirm, get your tracking ID, and watch the status move from Submitted to In Progress to Resolved.',
  },
];

export default function LandingPage() {
  const { user, isAdmin } = useAuth();
  const dashboardPath = isAdmin ? '/admin' : '/dashboard';

  return (
    <div className="bg-white">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-accent-50"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                AI-assisted civic reporting
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Report a public problem
                <span className="block bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                  in one conversation.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Potholes, garbage, water leakage, broken streetlights, damaged roads. Tell CivicFix AI
                what you see, confirm the summary, and get a tracking ID you can follow all the way to
                &ldquo;Resolved&rdquo;.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {user ? (
                  <>
                    <Link to={dashboardPath} className="btn-primary btn-lg">
                      Go to my dashboard
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    {!isAdmin && (
                      <Link to="/chat" className="btn-secondary btn-lg">
                        Report a new problem
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link to="/register" className="btn-primary btn-lg">
                      Get started free
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link to="/login" className="btn-secondary btn-lg">
                      I already have an account
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4 text-accent-600" aria-hidden="true" />
                  JWT-secured accounts
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent-600" aria-hidden="true" />
                  Your complaints stay private
                </span>
              </div>
            </div>

            {/* Chat preview card */}
            <div className="animate-fade-in-up lg:pl-4">
              <div className="card overflow-hidden shadow-chat">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500">
                    <Bot className="h-5 w-5 text-white" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">CivicFix AI</p>
                    <p className="text-xs text-accent-600">Online &middot; ready to help</p>
                  </div>
                </div>

                <div className="space-y-4 bg-white p-4 sm:p-5">
                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm">
                      There&apos;s a big pothole on MG Road near the bus stop
                    </p>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                      <Bot className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    </span>
                    <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
                      Got it - a <strong>Pothole</strong> at MG Road near the bus stop. Could you describe
                      the problem in a sentence or two?
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm">
                      It&apos;s deep and damaging scooters.
                    </p>
                  </div>

                  <div className="rounded-xl border border-accent-200 bg-accent-50/70 p-3.5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent-700">
                      <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                      Summary ready to submit
                    </p>
                    <dl className="mt-2.5 space-y-1.5 text-sm">
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-slate-500">Category</dt>
                        <dd className="font-medium text-slate-800">Pothole</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-slate-500">Location</dt>
                        <dd className="font-medium text-slate-800">MG Road, near the bus stop</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-slate-500">Details</dt>
                        <dd className="font-medium text-slate-800">Deep pothole damaging scooters</dd>
                      </div>
                    </dl>
                    <p className="mono-id mt-3 flex items-center gap-1.5 text-accent-700">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      Tracking ID issued on confirmation
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-slate-400">
                The assistant never invents records - every tracking ID comes from the server.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section className="border-t border-slate-100 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Built for citizens and city staff
            </h2>
            <p className="mt-3 text-slate-600">
              A complete reporting loop: conversation in, audit-logged resolution out.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body, tone }) => (
              <div key={title} className="card-interactive p-5">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tone}`}
                >
                  <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- Steps */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">How it works</h2>
            <p className="mt-3 text-slate-600">Three steps from a complaint to a resolution.</p>
          </div>

          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="relative card-padded">
                <span className="absolute right-5 top-5 text-4xl font-black text-slate-100">
                  {index + 1}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                  <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------------- CTA */}
      <section className="bg-slate-50 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 px-6 py-12 text-center shadow-chat sm:px-12 sm:py-16">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <h2 className="relative text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Your street. Your report. Your tracking ID.
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-brand-50">
              Create a free citizen account and file your first complaint in under a minute.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={user ? (isAdmin ? '/admin' : '/chat') : '/register'}
                className="btn btn-lg bg-white text-brand-700 hover:bg-brand-50"
              >
                {user ? (isAdmin ? 'Open admin panel' : 'Report a problem') : 'Create free account'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to={user ? '/dashboard' : '/login'}
                className="btn btn-lg border border-white/40 text-white hover:bg-white/10"
              >
                <LineChart className="h-4 w-4" aria-hidden="true" />
                {user ? 'View dashboard' : 'Sign in'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
