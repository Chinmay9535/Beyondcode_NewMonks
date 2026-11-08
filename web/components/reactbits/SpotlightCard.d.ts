// Types for the React Bits SpotlightCard (SpotlightCard.jsx, copied unmodified; see LICENSE-react-bits.md).
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export interface SpotlightCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties & Record<string, string | number>;
  spotlightColor?: string;
  intensity?: number;
  spotlightSize?: number;
  softness?: number;
  shape?: "circle" | "beam";
  borderGlow?: number;
  proximity?: number;
  smoothing?: number;
  ambient?: boolean;
  flare?: boolean;
  grain?: number;
  theme?: "dark" | "light";
}
declare const SpotlightCard: (props: SpotlightCardProps) => React.JSX.Element;
export default SpotlightCard;
