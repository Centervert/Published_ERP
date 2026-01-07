import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute h-[35%] w-[3px] origin-center bg-muted-foreground rounded-full"
          style={{
            transform: `rotate(${i * 30}deg) translateY(-100%)`,
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
