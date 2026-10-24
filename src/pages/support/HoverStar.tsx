import React from "react";
import UseAnimations from "react-useanimations";
import star from "react-useanimations/lib/star";

export interface HoverStarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number | string;
  strokeColor?: string;
  fillColor?: string;
  interaction?: "hover" | "hover-replay" | "click-replay" | "hover-loop" | "loop";
  className?: string;
}

export const HoverStar: React.FC<HoverStarProps> = ({
  size = 32,
  strokeColor,
  fillColor,
  interaction = "hover",
  className = "",
  ...props
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center cursor-pointer transition-opacity duration-150 hover:opacity-85 ${className}`}
      title="Customer CSAT Star rating"
      {...props}
    >
      <UseAnimations
        animation={star}
        size={size}
        strokeColor={strokeColor || "currentColor"}
        fillColor={fillColor}
        interaction={interaction}
      />
    </div>
  );
};

export default HoverStar;
