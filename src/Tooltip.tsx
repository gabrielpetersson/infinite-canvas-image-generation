import { FC, ReactNode } from "react";
import { PlacesType, Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

interface TooltipProps {
  id: string;
  place: PlacesType;
  content: ReactNode;
}
export const Tip: FC<TooltipProps> = ({ id, content, place }) => {
  return (
    <Tooltip
      anchorSelect={id}
      place={place}
      style={{
        backgroundColor: "white",
        color: "#111",
        fontSize: "12px",
        padding: "4px",
      }}
      opacity={100}
      className="canvas-item"
      noArrow
      delayShow={300}
    >
      {content}
    </Tooltip>
  );
};
