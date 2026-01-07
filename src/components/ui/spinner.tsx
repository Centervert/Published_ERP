import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-0 h-1/3 w-[2px] origin-bottom bg-muted-foreground rounded-full"
          style={{
            transform: `translateX(-50%) rotate(${i * 30}deg)`,
            opacity: 1 - (i * 0.07),
            animation: `spinner-fade 1s linear infinite`,
            animationDelay: `${-i * (1 / 12)}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes spinner-fade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}
