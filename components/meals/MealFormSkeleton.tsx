export function MealFormSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden="true">
      <div className="bg-border/60 h-11 rounded-xl" />
      <div className="bg-border/60 h-12 rounded-xl" />
      <div className="bg-border/60 h-36 rounded-2xl" />
      <div className="bg-border/60 h-12 rounded-xl" />
    </div>
  );
}
