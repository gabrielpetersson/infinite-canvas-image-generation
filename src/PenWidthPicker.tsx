import { FC } from "react";

interface PenWidthPickerProps {
  setPenWidth: (width: number) => void;
}
export const PenWidthPicker: FC<PenWidthPickerProps> = ({ setPenWidth }) => {
  return (
    <div className="pt-[12px] -translate-x-1/2 translate-y-[30px]">
      <div className="flex h-[28px] p-[3px] canvas-item bg-white rounded canvas-item">
        <div
          onClick={() => {
            setPenWidth(1);
          }}
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">
            pen_size_1
          </span>
        </div>
        <div
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
          onClick={() => {
            setPenWidth(2);
          }}
        >
          <span className="material-symbols-outlined text-[16px]">
            pen_size_2
          </span>
        </div>
        <div
          onClick={() => {
            setPenWidth(3);
          }}
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">
            pen_size_3
          </span>
        </div>
        <div
          onClick={() => {
            setPenWidth(4);
          }}
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">
            pen_size_4
          </span>
        </div>
        <div
          onClick={() => {
            setPenWidth(5);
          }}
          className="aspect-square flex justify-center items-center hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">
            pen_size_5
          </span>
        </div>
      </div>
    </div>
  );
};
