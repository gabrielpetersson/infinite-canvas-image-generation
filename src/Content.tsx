import {
  FC,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GeneratedImage,
  generatedImagesSlice,
  localWorkspaceTransform,
  navigateHistory,
  onWorkspaceElement,
  setEditingImage,
  smoothTransformWorkspace,
  transformWorkspace,
  useAppDispatch,
  useAppSelector,
} from "./state";
import React from "react";
import clsx from "clsx";
import { animated, useSpring } from "@react-spring/web";
import { batchActions } from "redux-batched-actions";
import { Image } from "./ImageEditor";
import { LoadingBar } from "./LoadingBar";
import { Tip } from "./Tooltip";

const MAX_ZOOM_STEP = 10;
const IS_DARWIN = /Mac|iPod|iPhone|iPad/.test(
  typeof window === "undefined" ? "node" : window.navigator.platform
);

function normalizeWheel(event: WheelEvent | React.WheelEvent<HTMLElement>) {
  let { deltaY, deltaX } = event;
  let deltaZ = 0;

  if (event.ctrlKey || event.altKey || event.metaKey) {
    const signY = Math.sign(event.deltaY);
    const absDeltaY = Math.abs(event.deltaY);

    let dy = deltaY;

    if (absDeltaY > MAX_ZOOM_STEP) {
      dy = MAX_ZOOM_STEP * signY;
    }

    deltaZ = dy / 100;
  } else {
    if (event.shiftKey && !IS_DARWIN) {
      deltaX = deltaY;
      deltaY = 0;
    }
  }

  return { x: -deltaX, y: -deltaY, z: -deltaZ };
}

export const Content: FC = () => {
  const dispatch = useAppDispatch();
  const images = useAppSelector((state) => state.generatedImages.images);
  const editorId = useAppSelector((state) => state.generatedImages.editorId);
  const workspaceImages = useAppSelector(
    (state) => state.generatedImages.workspaceImages
  );
  const activeImageId = useAppSelector(
    (state) => state.generatedImages.activeImageId
  );
  const historyIndex = useAppSelector(
    (state) => state.generatedImages.historyIndex
  );
  const history = useAppSelector((state) => state.generatedImages.history);

  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeImageId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete") {
        dispatch(
          generatedImagesSlice.actions.deleteImage({ id: activeImageId })
        );
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [activeImageId, dispatch]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const delta = normalizeWheel(e);
      const isMoving =
        delta.x !== 0 && (Math.abs(delta.x) > 2 || Math.abs(delta.y) > 2);
      if (
        editorId != null &&
        (isMoving || localWorkspaceTransform.scale < 0.9)
      ) {
        dispatch(setEditingImage(null));
      }

      if (delta.z === 0) {
        dispatch(
          transformWorkspace({
            y: localWorkspaceTransform.y + delta.y,
            x: localWorkspaceTransform.x + delta.x,
          })
        );

        return;
      }
      const currentScale = localWorkspaceTransform.scale;
      const scaling = ((currentScale - 0.1) * (3 - 1)) / (5 - 0.1) + 1;
      const scaleBy = delta.z * scaling;
      const newScale = Math.min(
        Math.min(Math.max(currentScale + scaleBy * 1.3, 0.1), 4),
        5
      );
      if (newScale === currentScale) return;

      const target = e.currentTarget as HTMLElement;
      const fromTop = e.clientY / target.clientHeight - 0.5;
      const fromLeft = e.clientX / target.clientWidth - 0.5;

      const transformY =
        (-fromTop * scaleBy * target.clientHeight) / currentScale;
      const transformX =
        (-fromLeft * scaleBy * target.clientWidth) / currentScale;

      const deltaX =
        (localWorkspaceTransform.x * (newScale - currentScale)) / currentScale +
        transformX;
      const deltaY =
        (localWorkspaceTransform.y * (newScale - currentScale)) / currentScale +
        transformY;

      dispatch(
        transformWorkspace({
          x: localWorkspaceTransform.x + deltaX,
          y: localWorkspaceTransform.y + deltaY,
          scale: newScale,
        })
      );
    };

    const target = viewportRef.current;
    if (target == null) return;
    target.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      target.removeEventListener("wheel", handleWheel);
    };
  }, [dispatch, editorId]);

  const onMouseDown: MouseEventHandler = (e) => {
    if (e.target !== e.currentTarget) return;
    setDragging(true);
    dispatch(setEditingImage(null));
    dispatch(
      batchActions([
        generatedImagesSlice.actions.setActiveImage({ id: null }),
        generatedImagesSlice.actions.setEditorImageId({ id: null }),
      ])
    );
  };

  const onMouseMove: MouseEventHandler = (e) => {
    if (dragging) {
      dispatch(
        transformWorkspace({
          y: localWorkspaceTransform.y + e.movementY,
          x: localWorkspaceTransform.x + e.movementX,
        })
      );
    }
  };

  const onMouseUp: MouseEventHandler = () => {
    setDragging(false);
  };

  useEffect(() => {
    if (workspaceRef.current == null) return;
    dispatch(onWorkspaceElement(workspaceRef.current));
  }, [dispatch]);

  const initialText = useMemo(() => {
    if (activeImageId == null || images[activeImageId] == null) {
      return "Select an image...";
    }
    return images[activeImageId].prompt.replace(
      /(?:https?|ftp):\/\/[\n\S]+/g,
      ""
    );
  }, [activeImageId, images]);
  return (
    <div
      ref={viewportRef}
      className="relative flex-1"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <div className="absolute left-4 top-3 flex items-center h-[40px] z-50">
        <div className="flex mr-4 canvas-item bg-white rounded p-2 items-center h-full">
          {/* <img
            
            className="h-full mr-4 mt-0.5 select-none"
          /> */}
          <div className="text-[35px] mr-3 mt-1 ml-1 -mb-[4px]">🧙‍♂️</div>
          <div className="text-2xl font-medium mr-6 truncate w-[400px] mt-[3px]">
            {initialText}
          </div>
        </div>
        <div className="flex mr-3 canvas-item bg-white rounded p-2 items-center h-full justify-between -mb-1">
          <div
            onClick={() => {
              dispatch(navigateHistory(-1));
            }}
            className={clsx(
              "rounded-full w-8 h-8 flex items-center justify-center cursor-pointer mr-2",
              historyIndex <= 0
                ? "pointer-events-none text-gray-400"
                : "hover:bg-gray-200 text-gray-700"
            )}
          >
            <span className="material-symbols-outlined text-[22px]">
              arrow_back
            </span>
          </div>
          <div
            onClick={() => {
              dispatch(navigateHistory(1));
            }}
            className={clsx(
              "rounded-full w-8 h-8 flex items-center justify-center cursor-pointer",
              historyIndex >= history.length - 1
                ? "pointer-events-none text-gray-400"
                : "hover:bg-gray-200 text-gray-700"
            )}
          >
            <span className="material-symbols-outlined text-[22px]">
              arrow_forward
            </span>
          </div>
        </div>
      </div>
      <div
        ref={workspaceRef}
        id="workspace"
        style={{
          // transform: `translate(${workspaceTransform.x}px, ${workspaceTransform.y}px) scale(${workspaceTransform.scale})`,
          transformOrigin: "50% 50%",
        }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 will-change-transform"
      >
        {/*  EHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH */}
        {useMemo(() => {
          // const imgs: ReactNode[] = [];
          // for (const id in images) {
          //   if (!(id in workspaceImages)) {
          //     imgs.push(<GeneratedImageItem key={id} image={images[id]} />);
          //   }
          // }
          return Object.values(images).map((image) => (
            <GeneratedImageItem key={image.id} image={image} />
          ));
        }, [images])}
        <div className="rounded-full bg-black w-8 h-8 absolute left-1/2 right-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <PointerArrow />
    </div>
  );
};

interface GeneratedImageItemProps {
  image: GeneratedImage;
}
const GeneratedImageItem: FC<GeneratedImageItemProps> = ({ image }) => {
  const dispatch = useAppDispatch();

  const editorId = useAppSelector((state) => state.generatedImages.editorId);
  const isActiveImage = useAppSelector(
    (state) => state.generatedImages.activeImageId === image.id
  );
  const scale = useAppSelector(
    (state) => state.generatedImages.workspaceTransform.scale
  );
  const workspaceTool = useAppSelector(
    (state) => state.generatedImages.workspaceTool
  );

  const imageRef = useRef<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const isEditing = editorId === image.id;
  const isOtherImageEditing = !isEditing && editorId != null;
  const style = useSpring(
    useMemo(
      () => ({
        opacity: isOtherImageEditing ? 0 : 1,
        // immediate,
      }),
      [isOtherImageEditing]
    )
  );

  const onMouseDown: MouseEventHandler = (e) => {
    if (isEditing || workspaceTool === "delete-tool") {
      return;
    }
    e.preventDefault();
    dispatch(generatedImagesSlice.actions.setActiveImage({ id: image.id }));

    const onMouseMove = (e: MouseEvent) => {
      setDragging(true);
      dispatch(
        generatedImagesSlice.actions.moveImage({
          id: image.id,
          transform: {
            x: e.movementX / scale,
            y: e.movementY / scale,
          },
        })
      );
    };
    const onMouseUp = () => {
      setDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onClick = () => {
    if (workspaceTool === "delete-tool") {
      dispatch(generatedImagesSlice.actions.deleteImage({ id: image.id }));
      return;
    }
    dispatch(
      generatedImagesSlice.actions.setActiveImage({
        id: image.id,
      })
    );
    if (
      image.url == null ||
      isEditing ||
      dragging ||
      workspaceTool !== "select-tool"
    ) {
      return;
    }
    dispatch(setEditingImage(image.id));
  };

  const cursor = (() => {
    if (workspaceTool === "delete-tool") {
      return "cursor-not-allowed";
    }
    if (dragging) {
      return "cursor-grabbing";
    }
    if (workspaceTool === "grab-tool" || image.url == null) {
      return "cursor-grab";
    }
    return "cursor-pointer";
  })();

  return (
    <animated.div
      style={{
        transform: `translate(${
          isActiveImage && !isEditing
            ? image.transform.x - 1
            : image.transform.x
        }px, ${
          isActiveImage && !isEditing
            ? image.transform.y - 1
            : image.transform.y
        }px)`,
        ...style,
      }}
      className={clsx(
        `absolute cursor- box-border flex top-0 left-0 translate-x-1/2 translate-y-1/2 transition-shadow canvas-item z-10`,
        isEditing && "z-20",
        cursor
      )}
      onMouseUp={onClick}
      onMouseDown={onMouseDown}
    >
      {image.url != null ? (
        <Image imageRef={imageRef} image={image} isEditing={isEditing} />
      ) : (
        <div className="w-[300px] h-[300px] bg-gray-100 flex justify-center items-center flex-col gap-y-4">
          <LoadingBar progress={100} slow={image.percentageDone === 0} />
          <div className="text-gray-600 text-[12px] break-words px-4 flex-1 justify-center grow-0 max-w-full">
            {image.prompt}
          </div>
        </div>
      )}
    </animated.div>
  );
};

const PointerArrow = () => {
  const dispatch = useAppDispatch();
  const workspaceTransform = useAppSelector(
    (state) => state.generatedImages.workspaceTransform
  );
  const x = workspaceTransform.x;
  const y = workspaceTransform.y;
  const distanceFromCenter = Math.sqrt(x * x + y * y);

  if (distanceFromCenter <= 1000) return null;
  const angleInDegrees = Math.atan2(y, x) * (180 / Math.PI);
  return (
    <>
      <span
        id="workspace-arrow"
        style={{
          transform: `rotate(${angleInDegrees}deg)`,
        }}
        className="material-symbols-outlined absolute bottom-6 right-6 font-medium cursor-pointer"
        onClick={() => {
          dispatch(smoothTransformWorkspace({ x: 0, y: 0 }));
        }}
      >
        east
      </span>
      <Tip id="#workspace-arrow" place="left-start" content="Go to center" />
    </>
  );
};
