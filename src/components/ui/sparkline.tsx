import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  color?: "primary" | "success" | "warning" | "destructive";
  height?: number;
  className?: string;
  showGradient?: boolean;
}

const colorMap = {
  primary: {
    stroke: "hsl(var(--primary))",
    fill: "hsl(var(--primary) / 0.2)",
    gradient: ["hsl(var(--primary) / 0.3)", "hsl(var(--primary) / 0)"]
  },
  success: {
    stroke: "hsl(var(--success))",
    fill: "hsl(var(--success) / 0.2)",
    gradient: ["hsl(var(--success) / 0.3)", "hsl(var(--success) / 0)"]
  },
  warning: {
    stroke: "hsl(var(--warning))",
    fill: "hsl(var(--warning) / 0.2)",
    gradient: ["hsl(var(--warning) / 0.3)", "hsl(var(--warning) / 0)"]
  },
  destructive: {
    stroke: "hsl(var(--destructive))",
    fill: "hsl(var(--destructive) / 0.2)",
    gradient: ["hsl(var(--destructive) / 0.3)", "hsl(var(--destructive) / 0)"]
  }
};

export const Sparkline = ({ 
  data, 
  color = "primary", 
  height = 40,
  className,
  showGradient = true
}: SparklineProps) => {
  // Filter out invalid values (NaN, undefined, null)
  const cleanData = data.filter(v => v !== undefined && v !== null && !isNaN(v));
  
  if (cleanData.length === 0) {
    return null;
  }

  // Transform array of numbers into chart data format
  const chartData = cleanData.map((value, index) => ({ value, index }));
  const colors = colorMap[color];
  const gradientId = `sparkline-gradient-${color}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="100%" stopColor={colors.gradient[1]} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={2}
            fill={showGradient ? `url(#${gradientId})` : colors.fill}
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Mini version for inline use
export const SparklineMini = ({ 
  data, 
  trend 
}: { 
  data: number[]; 
  trend?: "up" | "down" | "neutral" 
}) => {
  const color = trend === "up" ? "success" : trend === "down" ? "destructive" : "primary";
  
  return (
    <Sparkline 
      data={data} 
      color={color} 
      height={24} 
      showGradient={false}
      className="opacity-80"
    />
  );
};

export default Sparkline;
