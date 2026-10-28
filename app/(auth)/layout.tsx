export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      <p className="text-accent mb-8 text-center text-2xl font-bold tracking-tight">calAI</p>
      {children}
    </main>
  );
}
