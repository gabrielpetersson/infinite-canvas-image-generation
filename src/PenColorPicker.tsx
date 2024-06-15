import { FC } from "react";

interface PenColorPickerProps {
  setColor: (color: string) => void;
}
export const PenColorPicker: FC<PenColorPickerProps> = ({ setColor }) => {
  return (
    <div className="pt-[12px] -translate-x-1/2 translate-y-[30px]">
      <div className="flex h-[28px] p-[3px] canvas-item bg-white rounded">
        <div
          onClick={() => {
            setColor("rgba(255,0,0)");
          }}
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
        >
          <div className="rounded-full w-4 h-4 shadow-sm shadow-black bg-[rgba(255,0,0)]" />
        </div>
        <div
          onClick={() => {
            setColor("rgb(255,255,0)");
          }}
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
        >
          <div className="rounded-full w-4 h-4 shadow-sm shadow-black bg-[rgb(255,255,0)]" />
        </div>
        <div
          onClick={() => {
            setColor("rgba(0,255,0)");
          }}
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
        >
          <div className="rounded-full w-4 h-4 shadow-sm shadow-black bg-[rgba(0,255,0)]" />
        </div>
        <div
          onClick={() => {
            setColor("rgba(0,0,255)");
          }}
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
        >
          <div className="rounded-full w-4 h-4 shadow-sm shadow-black bg-[rgba(0,0,255)]" />
        </div>
        <div
          onClick={() => {
            setColor("rgb(255,255,255)");
          }}
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
        >
          <div className="rounded-full w-4 h-4 shadow-sm shadow-black bg-white" />
        </div>
        <div
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
          onClick={() => {
            setColor("rgb(0,0,0)");
          }}
        >
          <div className="rounded-full w-4 h-4 shadow-sm shadow-black bg-black" />
        </div>
      </div>
    </div>
  );
};
