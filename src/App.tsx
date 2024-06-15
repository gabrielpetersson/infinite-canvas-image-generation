import clsx from "clsx";
import { FC, KeyboardEventHandler, useEffect, useState } from "react";
import {
  addWhiteImage,
  generateImageVariations,
  generatedImagesSlice,
  useAppDispatch,
  useAppSelector,
} from "./state";
import { Content } from "./Content";
import { animated, useSpringRef, useTransition } from "@react-spring/web";
import { Tip } from "./Tooltip";
import { Settings } from "./Settings";

interface ImagineInputProps {
  id?: string;
  initialText?: string;
  buttonText: string;
  placeholder: string;
  onSubmit: (prompt: string) => void;
}
export const ImagineInput: FC<ImagineInputProps> = ({
  id,
  initialText,
  buttonText,
  placeholder,
  onSubmit,
}) => {
  const [prompt, setPrompt] = useState(initialText != null ? initialText : "");
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const submit = () => {
    onSubmit(prompt);
    setPrompt("");
  };
  const onKey: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      submit();
    }
  };

  return (
    <div
      className={clsx(
        "flex h-[40px] w-[400px] items-center rounded-lg px-2 bg-white transition-shadow duration-50",
        inputFocused && !loading
          ? "shadow-[1px_1px_8px_4px_rgba(0,0,0,0.2)]"
          : "canvas-item",
        loading && "pointer-events-none"
      )}
    >
      <input
        id={id}
        disabled={loading}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="h-full flex-1 outline-none pl-2"
        placeholder={placeholder}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        onKeyDown={onKey}
        autoComplete="off"
      />
      <div
        className="flex cursor-pointer select-none items-center justify-center rounded-full pl-2 transition-colors hover:bg-gray-100 active:bg-gray-200 w-[100px]"
        onClick={submit}
      >
        <button className="gradient-button px-2 py-1 rounded-lg text-white text-[14px] border border-gray-400">
          {buttonText}
        </button>
      </div>
    </div>
  );
};

function App() {
  const dispatch = useAppDispatch();
  const editorId = useAppSelector((state) => state.generatedImages.editorId);
  const transRef = useSpringRef();
  const [showSettings, setShowSettings] = useState(false);
  const workspaceTool = useAppSelector(
    (state) => state.generatedImages.workspaceTool
  );

  const show = editorId == null;
  const transitionInput = useTransition(show, {
    ref: transRef,
    from: { opacity: 0, transform: "translateY(100px)" },
    enter: { opacity: 1, transform: "translateY(0px)" },
    leave: { opacity: 0, transform: "translateY(100px)" },
  });
  const transitionToolbar = useTransition(show, {
    ref: transRef,
    from: { opacity: 0, transform: "translateX(-100px)" },
    enter: { opacity: 1, transform: "translateX(0px)" },
    leave: { opacity: 0, transform: "translateX(-100px)" },
  });

  useEffect(() => {
    transRef.start();
  }, [show, transRef]);

  const onGenerate = (prompt: string) => {
    dispatch(generateImageVariations(prompt, { navigate: true }));
  };
  return (
    <div className="flex-1 relative flex">
      {showSettings && (
        <Settings
          close={() => {
            setShowSettings(false);
          }}
        />
      )}
      <Content />
      {transitionInput(
        (style, item) =>
          item && (
            <animated.div style={style} className="absolute bottom-6 left-1/2">
              <div className="-translate-x-1/2">
                <ImagineInput
                  id="imagine-input"
                  buttonText={"Generate"}
                  placeholder={"Imagine..."}
                  onSubmit={onGenerate}
                />
              </div>
            </animated.div>
          )
      )}
      {transitionToolbar(
        (style, item) =>
          item && (
            <animated.div style={style} className="absolute bottom-6 left-6">
              <div className="canvas-item rounded-lg flex flex-col p-[3px] bg-white gap-1 w-12">
                <div
                  id="select-tool"
                  className={clsx(
                    "flex justify-center items-center rounded select-none aspect-square cursor-pointer",
                    workspaceTool === "select-tool"
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  )}
                  onClick={() => {
                    dispatch(
                      generatedImagesSlice.actions.setWorkspaceTool({
                        tool: "select-tool",
                      })
                    );
                  }}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    arrow_selector_tool
                  </span>
                </div>
                <Tip
                  id="#select-tool"
                  place="right-start"
                  content="Select tool"
                />

                <div
                  id="grab-tool"
                  className={clsx(
                    "flex justify-center items-center rounded select-none aspect-square cursor-pointer",
                    workspaceTool === "grab-tool"
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  )}
                  onClick={() => {
                    dispatch(
                      generatedImagesSlice.actions.setWorkspaceTool({
                        tool: "grab-tool",
                      })
                    );
                  }}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    pan_tool
                  </span>
                </div>
                <Tip id="#grab-tool" place="right-start" content="Grab tool" />

                <div
                  id="delete-tool"
                  className={clsx(
                    "relative flex justify-center items-center rounded select-none aspect-square cursor-pointer",
                    workspaceTool === "delete-tool"
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  )}
                  onClick={() => {
                    dispatch(
                      generatedImagesSlice.actions.setWorkspaceTool({
                        tool: "delete-tool",
                      })
                    );
                  }}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    arrow_selector_tool
                  </span>
                  <span className="absolute right-1.5 top-0.5 material-symbols-outlined text-[12px]">
                    delete
                  </span>
                </div>
                <Tip
                  id="#delete-tool"
                  place="right-start"
                  content="Deletion tool"
                />

                <div className="border-b border-gray-200" />

                <div
                  id="add-image"
                  className={clsx(
                    "flex justify-center items-center rounded select-none aspect-square cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                  )}
                  onClick={() => {
                    window.alert("Not implemented yet!");
                  }}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    add_photo_alternate
                  </span>
                </div>
                <Tip
                  id="#add-image"
                  place="right-start"
                  content="Not implemented hehe"
                />

                <div
                  id="add-empty-canvas"
                  className={clsx(
                    "flex justify-center items-center rounded select-none aspect-square cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                  )}
                  onClick={() => {
                    dispatch(addWhiteImage());
                  }}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    crop_portrait
                  </span>
                </div>
                <Tip
                  id="#add-empty-canvas"
                  place="right-start"
                  content="Add empty canvas"
                />

                <div
                  id="settings"
                  className={clsx(
                    "flex justify-center items-center rounded select-none aspect-square cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                  )}
                  onClick={() => {
                    setShowSettings((p) => !p);
                  }}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    Settings
                  </span>
                </div>
                <Tip id="#settings" place="right-start" content="Settings" />
              </div>
            </animated.div>
          )
      )}
    </div>
  );
}

export default App;
