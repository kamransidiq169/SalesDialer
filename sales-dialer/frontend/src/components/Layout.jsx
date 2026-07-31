import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Decorative background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute -top-40 -right-40 w-[40rem] h-[40rem] bg-gradient-primary rounded-full opacity-[0.04] dark:opacity-[0.06] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[36rem] h-[36rem] bg-gradient-accent rounded-full opacity-[0.04] dark:opacity-[0.05] blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-[28rem] h-[28rem] bg-violet-500/10 rounded-full blur-3xl opacity-30" />
      </div>

      <Sidebar />
      <main className="lg:pl-[260px] min-h-screen relative z-10">
        <div className="p-4 sm:p-6 lg:p-10 pt-20 lg:pt-10 max-w-[1600px] mx-auto page-mount">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
