import { animated, useSpring } from "@react-spring/web";
import { FC } from "react";

interface LoadingBarProps {
  progress: number;
  slow: boolean;
}
export const LoadingBar: FC<LoadingBarProps> = ({ progress, slow }) => {
  const springProps = useSpring({
    from: { width: "0%" },
    to: { width: `${progress}%` },
    config: {
      friction: 2000,
    },
  });

  return (
    <div className="bg-[#fcfcfc] h-1 w-1/3 flex">
      <animated.div className="bg-gray-300" style={springProps} />
    </div>
  );
};
