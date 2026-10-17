import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="max-w-md text-sm text-slate-500">
            Report public problems in plain language and follow them through to resolution.
          </p>
        </div>

        <div className="text-sm text-slate-400 lg:text-right">
          <p>CivicFix AI &middot; Smart Public Complaint Chatbot</p>
          <p className="mt-1 text-xs">
            Application Development &amp; Deployment Architecture project
          </p>
        </div>
      </div>
    </footer>
  );
}
