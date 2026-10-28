export function AuthFormSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-hidden="true">
      <div className="bg-border/60 h-12 rounded-xl" />
      <div className="bg-border/60 mt-6 h-12 rounded-xl" />
      <div className="bg-border/60 h-12 rounded-xl" />
      <div className="bg-border/60 h-12 rounded-xl" />
    </div>
  );
}
