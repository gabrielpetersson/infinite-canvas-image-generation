import { useSpringRef, animated, useSpring } from "@react-spring/web";
import { RefObject, FC, useState, useEffect, useRef, useMemo } from "react";
import { EclipseHalf } from "react-svg-spinners";
import {
  GeneratedImage,
  useAppDispatch,
  useAppSelector,
  setEditingImage,
  upscaleImage,
  selectUpscaledImageChildren,
  uploadImage,
  generatedImagesSlice,
  generateImageToImageVariations,
  addImageToWorkspace,
} from "./state";
import { assertNever } from "./utils/assertNever";
import { useTransition } from "@react-spring/web";
import ImageEditor from "tui-image-editor";
import FileSave from "file-saver";
import "tui-image-editor/dist/tui-image-editor.css";
import { ImagineInput } from "./App";
import { LoadingBar } from "./LoadingBar";
import { Tip } from "./Tooltip";
import clsx from "clsx";
import { PenColorPicker } from "./PenColorPicker";
import { PenWidthPicker } from "./PenWidthPicker";
import { toOptimizedImage } from "./utils/toOptimizedImage";

interface ImageEditorProps {
  image: GeneratedImage;
  isEditing: boolean;
  imageRef: RefObject<HTMLImageElement>;
}
export const Image: FC<ImageEditorProps> = ({ imageRef, image, isEditing }) => {
  const dispatch = useAppDispatch();
  const inTransRef = useSpringRef();
  const generateVariationsTransRef = useSpringRef();
  const drawTransRef = useSpringRef();

  const [editor, setEditor] = useState<ImageEditor | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [tool, setTool] = useState<"generate-variations" | "draw" | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageChildren = useAppSelector((state) =>
    selectUpscaledImageChildren(state, image.id)
  );
  const [activePosition, setActivePosition] = useState<number | null>(null);

  useEffect(() => {
    if (!isEditing && tool != null) {
      setTool(null);
    }
  }, [isEditing, tool]);

  const transitionsEditorRight = useTransition(
    isEditing,
    useMemo(
      () => ({
        ref: inTransRef,
        from: { opacity: 0, transform: "translateX(-50px)" },
        enter: { opacity: 1, transform: "translateX(0px)" },
        leave: { opacity: 0, transform: "translateX(-50px)" },
      }),
      [inTransRef]
    )
  );
  const transitionsEditorLeft = useTransition(
    isEditing,
    useMemo(
      () => ({
        ref: inTransRef,
        from: { opacity: 0, transform: "translateX(50px)" },
        enter: { opacity: 1, transform: "translateX(0px)" },
        leave: { opacity: 0, transform: "translateX(50px)" },
      }),
      [inTransRef]
    )
  );
  useEffect(() => {
    inTransRef.start();
  }, [isEditing, inTransRef]);

  const isGeneratingVariations = tool == "generate-variations";
  const transitionGenerateVariations = useTransition(
    isGeneratingVariations,
    useMemo(
      () => ({
        ref: generateVariationsTransRef,
        from: { opacity: 0, transform: "translateY(-50px)" },
        enter: { opacity: 1, transform: "translateY(0px)" },
        leave: { opacity: 0, transform: "translateY(-50px)" },
      }),
      [generateVariationsTransRef]
    )
  );
  useEffect(() => {
    generateVariationsTransRef.start();
  }, [isGeneratingVariations, generateVariationsTransRef]);

  const isDrawing = tool == "draw";
  const transitionDraw = useTransition(
    isDrawing,
    useMemo(
      () => ({
        ref: drawTransRef,
        from: { opacity: 0, transform: "translateY(-50px)" },
        enter: { opacity: 1, transform: "translateY(0px)" },
        leave: { opacity: 0, transform: "translateY(-50px)" },
      }),
      [drawTransRef]
    )
  );
  useEffect(() => {
    drawTransRef.start();
  }, [isDrawing, drawTransRef]);

  useEffect(() => {
    if (editor != null && !isEditing) {
      // TODO: remove settimeout, currently used so components can clean up reliably
      setTimeout(() => editor.destroy(), 100);
      setEditor(null);
      setIsDirty(false);
    }
    if (!isEditing) {
      setActivePosition(null);
    }
    if (
      editor != null ||
      image.url == null ||
      !isEditing ||
      editorRef.current == null ||
      image.type !== "upscaled"
    ) {
      return;
    }
    const instance = new ImageEditor(editorRef.current, {
      cssMaxWidth: 700,
      cssMaxHeight: 500,
      selectionStyle: {
        cornerSize: 20,
        rotatingPointOffset: 70,
      },
    });
    instance.loadImageFromURL(image.url[0], "SampleImage").then(() => {
      instance.clearUndoStack();

      // todo: fix this. tui image editor is trash
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const canvasElement = instance._graphics.getCanvas()
        .upperCanvasEl as HTMLCanvasElement;
      canvasElement.addEventListener("mouseup", () => {
        if (instance.getDrawingMode() !== "FREE_DRAWING") return;
        setIsDirty(true);
      });
    });

    setEditor(instance);
  }, [editor, image.type, image.url, isEditing]);

  const initialText = useMemo(() => {
    if (image.prompt === "white background") {
      return "";
    }
    return image.prompt.replace(/(?:https?|ftp):\/\/[\n\S]+/g, "");
  }, [image.prompt]);

  if (image.url == null) return null;

  const activePositionAction:
    | "none"
    | "jump-to-image"
    | "upscale-image"
    | "loading-image" = (() => {
    if (activePosition == null) {
      return "none";
    }
    if (
      activePosition in imageChildren &&
      imageChildren[activePosition].percentageDone === 100
    ) {
      return "jump-to-image";
    }
    if (activePosition in imageChildren) {
      return "loading-image";
    }
    return "upscale-image";
  })();

  const onGenerate = (prompt: string) => {
    if (image.type === "upscaled") {
      dispatch(generateImageToImageVariations(image.id, 0, prompt));
      return;
    }
    if (activePosition == null) {
      console.error("No active position");
      return;
    }
    dispatch(generateImageToImageVariations(image.id, activePosition, prompt));
  };

  return (
    <>
      {transitionGenerateVariations(
        (style, item) =>
          item && (
            <animated.div style={style} className="absolute -bottom-1">
              {/* jesus christ, workspace is scaled, should add this outside workspace*/}
              <div className="translate-y-full scale-[0.625]">
                <ImagineInput
                  id="variations-input"
                  initialText={initialText}
                  buttonText="Generate"
                  placeholder="Generate variation..."
                  onSubmit={onGenerate}
                />
              </div>
            </animated.div>
          )
      )}
      {transitionDraw(
        (style, item) =>
          item &&
          editor && (
            <animated.div style={style} className="absolute -bottom-3 left-1/2">
              <div className="translate-y-full -translate-x-1/2">
                <DrawingTools
                  editor={editor}
                  isDirty={isDirty}
                  setIsDirty={setIsDirty}
                  image={image}
                />
              </div>
            </animated.div>
          )
      )}
      {transitionsEditorLeft((style, item) => {
        return (
          item && (
            <animated.div style={style} className="absolute -left-12 h-full">
              <GenerationShowcase image={image} />
            </animated.div>
          )
        );
      })}
      {transitionsEditorRight((style, item) => {
        return (
          item && (
            <>
              <animated.div
                style={style}
                className="absolute -right-12 z-10 h-full"
              >
                <Editor
                  position={activePosition}
                  imageState={activePositionAction}
                  image={image}
                  editor={editor}
                  isDirty={isDirty}
                  tool={tool}
                  setIsDirty={setIsDirty}
                  setTool={setTool}
                />
              </animated.div>
            </>
          )
        );
      })}
      {isEditing && image.type === "upscaled" && (
        <div
          id="tui-image-editor"
          className="absolute w-full h-full z-40"
          ref={editorRef}
        ></div>
      )}
      {(() => {
        if (image.url == null) {
          return null;
        }
        // TODO: fix, backcompatible
        if (typeof image.url === "string") {
          return (
            <img
              ref={imageRef}
              className="w-auto h-auto max-w-[400px] max-h-[400px] select-none"
              src={toOptimizedImage(image.url)}
            />
          );
        }

        return (
          <div
            className={clsx(
              "img-grid",
              image.url.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}
          >
            {image.url.map((url, position) => {
              const img = (
                <img
                  key={position}
                  ref={imageRef}
                  className="select-none"
                  src={toOptimizedImage(url)}
                />
              );
              if (!isEditing) {
                return img;
              }
              return (
                <div key={position} className="relative">
                  {img}
                  <div
                    className={clsx(
                      "absolute left-0 top-0 w-full h-full p-2 transition-all",
                      activePosition === position
                        ? "shadow-lg shadow-black z-10"
                        : "border-transparent",
                      activePosition != null &&
                        activePosition !== position &&
                        "bg-[rgba(0,0,0,0.4)]"
                    )}
                    onClick={() => {
                      setActivePosition((p) =>
                        p === position ? null : position
                      );
                    }}
                    onDoubleClick={() => {
                      if (imageChildren[position] == null) return;
                      dispatch(setEditingImage(imageChildren[position].id));
                    }}
                  />
                </div>
              );
            })}
          </div>
        );
      })()}
    </>
  );
};

interface GenerationShowcaseProps {
  image: GeneratedImage;
}
const GenerationShowcase: FC<GenerationShowcaseProps> = ({ image }) => {
  const dispatch = useAppDispatch();
  const images = useAppSelector((state) => state.generatedImages.images);
  const workspaceImages = useAppSelector(
    (state) => state.generatedImages.workspaceImages
  );
  const variationChildren = image.children
    .filter((img) => img.id in images)
    .reverse();

  return (
    <div className="p-2 pt-3 flex flex-col h-full w-48 absolute rounded shadow-sm shadow-gray-300 bg-white text-[9px] cursor-auto select-none -translate-x-full">
      <div className="text-[14px] font-medium mb-2">Generations</div>
      <div
        className="flex-1 overflow-y-auto"
        data-scroll="true"
        onWheelCapture={(e) => {
          e.stopPropagation();
        }}
      >
        {variationChildren.length !== 0 ? (
          <div className="flex flex-col gap-2">
            {variationChildren.map((child, i) => {
              const imageChild = images[child.id];
              return (
                <div
                  key={imageChild.id}
                  className={clsx(
                    "bg-gray-100 min-h-[120px] rounded flex justify-center items-center relative cursor-pointer"
                  )}
                  onClick={() => {
                    dispatch(setEditingImage(child.id));
                  }}
                >
                  {/* <div
                    id={`image-in-workspace-${i}`}
                    className="absolute left-1 top-1 bg-white w-5 h-5 rounded p-[2px] border border-gray-200 flex cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (child.id in workspaceImages) {
                        dispatch(
                          generatedImagesSlice.actions.hideImageInWorkspace({
                            id: child.id,
                          })
                        );
                        return;
                      }
                      dispatch(
                        generatedImagesSlice.actions.showImageInWorkspace({
                          id: child.id,
                        })
                      );
                    }}
                  >
                    <div
                      className={clsx(
                        "flex-1 rounded",
                        child.id in workspaceImages
                          ? "bg-blue-400"
                          : "bg-gray-100"
                      )}
                    />
                  </div>
                  <Tip
                    id={`#image-in-workspace-${i}`}
                    place="bottom-start"
                    content="Add to workspace"
                  /> */}

                  {/* {child.id in workspaceImages && (
                    <>
                      <div
                        id={`go-to-editor-${i}`}
                        className="absolute left-7 top-1 bg-white w-5 h-5 rounded p-[2px] border border-gray-200 flex cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(setEditingImage(child.id));
                        }}
                      >
                        <span
                          style={{
                            transform: `rotate(-135deg)`,
                            transformOrigin: "50% 50%",
                          }}
                          className="material-symbols-outlined text-[10px]"
                        >
                          east
                        </span>
                      </div>
                      <Tip
                        id={`#go-to-editor-${i}`}
                        place="bottom-start"
                        content="Go to image"
                      />
                    </>
                  )} */}

                  <div
                    id={`jump-to-image-${i}`}
                    className="absolute left-1 top-1 bg-white w-4 h-4 rounded flex justify-center items-center"
                  >
                    {/* <span className="material-symbols-outlined text-[16px]">
                      zoom_out_map
                    </span> */}
                    <span className="material-symbols-outlined material-fat text-[10px]">
                      arrow_outward
                    </span>
                  </div>
                  <Tip
                    id={`#jump-to-image-${i}`}
                    place="bottom-end"
                    content="Jump to image"
                  />

                  {/* {showFullScreen === child.id && (
                    <div className="fixed inset-0 flex justify-center items-center">
                      {(() => {
                        if (imageChild.url == null) {
                          return null;
                        }
                        if (typeof imageChild.url === "string") {
                          return (
                            <img
                              className="select-none w-[600px] h-[600px]"
                              src={imageChild.url}
                            />
                          );
                        }
                        if (images[child.id].url)
                          return images[child.id].url!.map((url) => (
                            <div className="img-grid grid-cols-2 h-[600px] w-[600px]">
                              <img className="select-none" src={url} />
                            </div>
                          ));
                      })()}
                    </div>
                  )} */}

                  {(() => {
                    if (imageChild.url == null) {
                      return (
                        <LoadingBar
                          progress={100}
                          slow={imageChild.percentageDone === 0}
                        />
                      );
                    }
                    // back compat
                    if (typeof imageChild.url === "string") {
                      return <img src={toOptimizedImage(imageChild.url)} />;
                    }
                    return imageChild.url.map((url, i) => (
                      <img key={i} src={toOptimizedImage(url)} />
                    ));
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-700 bg-gray-100 h-8 flex justify-center items-center">
            Empty
          </div>
        )}
      </div>
    </div>
  );
};

interface EditorProps {
  position: number | null;
  imageState: "jump-to-image" | "upscale-image" | "loading-image" | "none";
  image: GeneratedImage;
  editor: ImageEditor | null;
  isDirty: boolean;
  tool: "generate-variations" | "draw" | null;
  setIsDirty: (isDirty: boolean) => void;
  setTool: (tool: "generate-variations" | "draw" | null) => void;
}
const Editor: FC<EditorProps> = ({
  imageState,
  position,
  image,
  editor,
  isDirty,
  tool,
  setIsDirty,
  setTool,
}) => {
  const dispatch = useAppDispatch();
  const imageChildren = useAppSelector((state) =>
    selectUpscaledImageChildren(state, image.id)
  );
  const [loadingSave, setLoadingSave] = useState(false);

  return (
    <div className="flex flex-col h-full w-48 absolute rounded shadow-sm shadow-gray-300 bg-white text-[9px] cursor-auto select-none">
      <div className="p-2 pt-3 text-[14px] font-medium">Editor</div>
      <div className="flex flex-col flex-1 text-gray-800">
        {position == null && image.type === "variations" && (
          <div className="basis-1/4 text-gray-700 flex justify-center items-center mx-2">
            Click on an image
          </div>
        )}
        {!(position == null && image.type === "variations") && (
          <button
            // disabled={isDirty}
            className={clsx(
              "px-2 py-2 flex items-center hover:bg-[#f6f6f6]",
              tool === "generate-variations"
                ? "bg-[#f2f2f2]"
                : "hover:bg-[#f6f6f6] active:bg-[#f2f2f2]",
              isDirty && "opacity-80 hover:bg-white active:bg-white"
            )}
            onClick={() => {
              if (isDirty) {
                window.alert("Save or discard paint changes first!");
                return;
              }
              if (image.type === "upscaled" && image.isCanvas) {
                window.alert(
                  "Only use black and white colors when generating an image based of a doodle!s"
                );
              }
              setTool(
                tool === "generate-variations" ? null : "generate-variations"
              );
              // todo: autofocus on the input messes with usetransition
              setTimeout(
                () => document.getElementById("variations-input")?.focus(),
                100
              );
            }}
          >
            <div className="flex items-center w-5">
              <span className="material-symbols-outlined text-[12px]">
                copy_all
              </span>
            </div>
            Generate variations
          </button>
        )}
        {image.type === "upscaled" && (
          <button
            onClick={() => {
              setTool(tool === "draw" ? null : "draw");
            }}
            className={clsx(
              "px-2 py-2 flex items-center disabled:pointer-events-none disabled:opacity-80",
              tool === "draw" ? "bg-[#f2f2f2]" : "hover:bg-[#f6f6f6]"
            )}
          >
            <div className="flex items-center w-5">
              {loadingSave ? (
                <EclipseHalf color="bg-gray-600" width={12} height={12} />
              ) : (
                <span className="material-symbols-outlined text-[12px] -mt-0.5">
                  draw
                </span>
              )}
            </div>
            Tools
          </button>
        )}
        {image.type === "variations" &&
          position != null &&
          imageState !== "none" && (
            <button
              className="px-2 py-2 flex items-center hover:bg-[#f6f6f6] active:bg-[#f2f2f2]"
              onClick={() => {
                switch (imageState) {
                  case "loading-image":
                  case "jump-to-image": {
                    dispatch(setEditingImage(imageChildren[position].id));
                    return;
                  }
                  case "upscale-image": {
                    dispatch(addImageToWorkspace(image.id, position));
                    return;
                  }
                  default: {
                    assertNever(imageState);
                  }
                }
              }}
            >
              <div className="w-5 flex items-center mr-[1px]">
                {(() => {
                  switch (imageState) {
                    case "loading-image":
                    case "jump-to-image": {
                      return (
                        <span className="material-symbols-outlined text-[12px]">
                          arrow_outward
                        </span>
                      );
                    }
                    case "upscale-image": {
                      return (
                        <span className="material-symbols-outlined text-[12px]">
                          heart_plus
                          {/* auto_fix_high */}
                        </span>
                      );
                    }
                    default: {
                      assertNever(imageState);
                    }
                  }
                })()}
              </div>
              {(() => {
                switch (imageState) {
                  case "loading-image":
                  case "jump-to-image": {
                    return "Go to image";
                  }
                  case "upscale-image": {
                    return "Add to canvas";
                  }
                  default: {
                    assertNever(imageState);
                  }
                }
              })()}
            </button>
          )}
        {image.type === "upscaled" && (
          <button
            onClick={() => {
              if (image.url == null) {
                return;
              }
              if (editor) {
                FileSave.saveAs(editor.toDataURL(), "image.png");
              } else {
                image.url;
                FileSave.saveAs(image.url[0], "image.png");
              }
            }}
            className={clsx(
              "px-2 py-2 flex items-center disabled:pointer-events-none disabled:opacity-80 hover:bg-[#f6f6f6]"
            )}
          >
            <div className="flex items-center w-5">
              {loadingSave ? (
                <EclipseHalf color="bg-gray-600" width={12} height={12} />
              ) : (
                <span className="material-symbols-outlined text-[12px] -mt-0.5">
                  download
                </span>
              )}
            </div>
            Download image
          </button>
        )}
        {image.type !== "variations" && (
          <button
            onClick={() => {
              dispatch(
                generatedImagesSlice.actions.deleteImage({ id: image.id })
              );
            }}
            className={clsx(
              "px-2 py-2 flex items-center disabled:pointer-events-none disabled:opacity-80 hover:bg-[#f6f6f6]"
            )}
          >
            <div className="flex items-center w-5">
              <span className="material-symbols-outlined text-[12px] -mt-0.5">
                delete
              </span>
            </div>
            Delete image
          </button>
        )}
      </div>

      <div className="p-2 pb-1 text-[10px] font-medium border-t border-gray-100">
        Prompt:
      </div>
      <div
        onWheelCapture={(e) => {
          e.stopPropagation();
        }}
        className="rounded max-h-20 overflow-y-auto px-2 mb-2 min-h-0"
      >
        <div className="break-words bg-gray-100 rounded w-full max-w-full text-[8px] p-1 select-text">
          {image.prompt}
        </div>
      </div>
    </div>
  );
};

interface DrawingToolsProps {
  editor: ImageEditor;
  isDirty: boolean;
  image: GeneratedImage;
  setIsDirty: (dirty: boolean) => void;
}
const DrawingTools: FC<DrawingToolsProps> = ({
  editor,
  image,
  isDirty,
  setIsDirty,
}) => {
  const dispatch = useAppDispatch();
  const [tool, setTool] = useState<"draw" | "crop" | "eraser" | null>("draw");
  const [penColor, setPenColor] = useState("rgb(0,0,0)");
  const [penWdith, setPenWidth] = useState(3);
  const [penColorHover, setPenColorHover] = useState(false);
  const [penWidthHover, setPenWidthHover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isUndoEmpty, setIsUndoEmpty] = useState(editor.isEmptyUndoStack());
  const [isRedoEmpty, setIsRedoEmpty] = useState(editor.isEmptyRedoStack());

  const colorStyle = useSpring({
    block: penWidthHover ? "block" : "hidden",
    opacity: penColorHover ? 1 : 0,
    transform: penColorHover ? "translateY(0px)" : "translateY(-25px)",
    config: { duration: 200 },
  });

  const widthStyle = useSpring({
    block: penWidthHover ? "block" : "hidden",
    opacity: penWidthHover ? 1 : 0,
    transform: penWidthHover ? "translateY(0px)" : "translateY(-25px)",
    config: { duration: 200 },
  });

  useEffect(() => {
    editor.on("redoStackChanged", (length) => {
      setIsRedoEmpty(length === 0);
    });
    editor.on("undoStackChanged", (length) => {
      setIsUndoEmpty(length === 0);
    });
  }, [editor]);
  useEffect(() => {
    // todo: fix this hack
    setIsUndoEmpty(editor.isEmptyUndoStack());
    setIsRedoEmpty(editor.isEmptyRedoStack());

    if (tool == null || tool !== "draw") {
      editor.stopDrawingMode();
    }
    if (tool === "draw") {
      editor.startDrawingMode("FREE_DRAWING", {
        width: penWdith === 1 ? 3 : penWdith ** 3,
        color: penColor,
      });
    }
    return () => {
      editor.stopDrawingMode();
    };
  }, [penColor, editor, tool, penWdith, isDirty]);
  return (
    <div className="h-[30px] canvas-item rounded-lg flex p-[3px] bg-white gap-1 cursor-auto">
      <div
        className={clsx(
          "w-[24px] flex justify-center items-center rounded select-none cursor-pointer",
          tool === "draw" ? "bg-gray-200" : "hover:bg-gray-100"
        )}
        onClick={() => {
          if (editor.getDrawingMode() === "FREE_DRAWING") {
            editor.stopDrawingMode();
            setTool(null);
            return;
          }
          editor.startDrawingMode("FREE_DRAWING", {
            width: 5,
            color: "rgb(0,0,0)",
          });
          setTool("draw");
        }}
      >
        <span className="material-symbols-outlined text-[16px]">edit</span>
      </div>
      <div
        className={clsx(
          "w-[24px] flex justify-center items-center rounded select-none cursor-pointer",
          tool === "eraser" ? "bg-gray-200" : "hover:bg-gray-100"
        )}
        onClick={() => {
          setTool(tool === "eraser" ? null : "eraser");
          window.alert("not implemented");
        }}
      >
        <span className="material-symbols-outlined text-[16px]">
          ink_eraser
        </span>
      </div>
      <div
        className={clsx(
          "w-[24px] flex justify-center items-center rounded select-none cursor-pointer",
          tool === "crop" ? "bg-gray-200" : "hover:bg-gray-100"
        )}
        onClick={() => {
          setTool(tool === "crop" ? null : "crop");
          window.alert("not implemented");
        }}
      >
        <span className="material-symbols-outlined text-[16px]">crop</span>
      </div>
      <div className="border-r border-gray-300" />
      <div
        className={clsx(
          "flex aspect-square justify-center items-center select-none cursor-pointer"
        )}
        onMouseEnter={() => {
          setPenColorHover(true);
        }}
        onMouseLeave={() => {
          setPenColorHover(false);
        }}
      >
        <div
          style={{ backgroundColor: penColor }}
          className="relative rounded-full w-4 h-4 shadow-sm shadow-black"
        >
          <animated.div
            style={colorStyle}
            className={clsx(
              "absolute translate-y-full -bottom-4 left-1/2 cursor-auto",
              !penColorHover && "pointer-events-none"
            )}
          >
            {image.type === "upscaled" && image.isCanvas ? (
              <div className="-translate-x-1/2 translate-y-full canvas-item bg-white rounded text-[7px] w-28 p-2">
                Only use black for canvas generations
              </div>
            ) : (
              <PenColorPicker setColor={setPenColor} />
            )}
          </animated.div>
        </div>
      </div>
      <div
        className={clsx(
          "flex aspect-square justify-center items-center select-none relative cursor-pointer"
        )}
        onMouseEnter={() => {
          setPenWidthHover(true);
        }}
        onMouseLeave={() => {
          setPenWidthHover(false);
        }}
      >
        <span className="material-symbols-outlined text-[16px]">
          {`pen_size_${penWdith}`}
        </span>
        <animated.div
          style={widthStyle}
          className={clsx(
            "absolute translate-y-full left-1/2 cursor-auto",
            !penWidthHover && "pointer-events-none"
          )}
        >
          <PenWidthPicker setPenWidth={setPenWidth} />
        </animated.div>
      </div>
      <div className="border-r border-gray-300" />
      <div
        className={clsx(
          "w-[24px] flex justify-center items-center rounded select-none cursor-pointer",
          isDirty && !isSaving
            ? "hover:bg-gray-100 active:bg-gray-200"
            : "opacity-70 pointer-events-none"
        )}
        onClick={async () => {
          const dataURLToBlob = (dataURL: string) => {
            const BASE64_MARKER = ";base64,";
            if (dataURL.indexOf(BASE64_MARKER) === -1) {
              const parts = dataURL.split(",");
              const contentType = parts[0].split(":")[1];
              const raw = parts[1];

              return new Blob([raw], { type: contentType });
            }

            const parts = dataURL.split(BASE64_MARKER);
            const contentType = parts[0].split(":")[1];
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);

            for (let i = 0; i < rawLength; ++i) {
              uInt8Array[i] = raw.charCodeAt(i);
            }

            return new Blob([uInt8Array], { type: contentType });
          };

          setIsSaving(true);
          const blob = dataURLToBlob(editor.toDataURL());
          const url = await uploadImage(blob);
          dispatch(
            generatedImagesSlice.actions.setImageUrls({
              id: image.id,
              urls: [url],
            })
          );
          setIsDirty(false);
          setIsSaving(false);
        }}
      >
        {isSaving ? (
          <EclipseHalf width={13} height={13} />
        ) : (
          <span className="material-symbols-outlined text-[16px]">save</span>
        )}
      </div>
      <div
        className={clsx(
          "w-[24px] flex justify-center items-center rounded select-none cursor-pointer",
          isDirty && !isSaving
            ? "hover:bg-gray-100 active:bg-gray-200"
            : "opacity-70 pointer-events-none"
        )}
        onClick={async () => {
          if (image.url == null || image.type !== "upscaled") return;
          editor.loadImageFromURL(image.url[0], "imageName").then(() => {
            editor.clearUndoStack();
          });
          setIsDirty(false);
        }}
      >
        <span className="material-symbols-outlined text-[16px]">delete</span>
      </div>

      <div
        className={clsx(
          "w-[24px] flex justify-center items-center rounded select-none cursor-pointer",
          !isUndoEmpty
            ? "hover:bg-gray-100 active:bg-gray-200"
            : "opacity-70 pointer-events-none"
        )}
        onClick={async () => {
          if (image.url == null) return;
          editor.undo();
        }}
      >
        <span className="material-symbols-outlined text-[16px]">undo</span>
      </div>

      <div
        className={clsx(
          "w-[24px] flex justify-center items-center rounded select-none cursor-pointer",
          !isRedoEmpty
            ? "hover:bg-gray-100 active:bg-gray-200"
            : "opacity-70 pointer-events-none"
        )}
        onClick={async () => {
          if (image.url == null) return;
          editor.redo();
        }}
      >
        <span className="material-symbols-outlined text-[16px]">redo</span>
      </div>
    </div>
  );
};
