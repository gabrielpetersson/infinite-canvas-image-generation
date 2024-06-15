import {
  Action,
  AnyAction,
  PayloadAction,
  ThunkAction,
  combineReducers,
  configureStore,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { batchActions, enableBatching } from "redux-batched-actions";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/es/storage";
import { v4 } from "uuid";
import { assertNever } from "./utils/assertNever";
import { findEmptyArea } from "./utils/findEmptyArea";
import { throttle } from "lodash-es";
import { REPLICATE_TOKEN_KEY } from "./Settings";
import { uploadFile } from "@uploadcare/upload-client";
import { getApi } from "./utils/getApi";

const initialTransform = { x: 0, y: 0, scale: 1 };

type ImageChild =
  | { type: "upscaled"; id: string; position?: number }
  | { type: "variations"; id: string };

type VariationGeneration = {
  type: "variations";
  id: string;
  url: string[] | null;
  prompt: string;
  percentageDone: number;
  parent: {
    id: string;
    position: number;
  } | null;
  children: ImageChild[];
  transform: {
    x: number;
    y: number;
  };
};
type UpscaledGeneration = {
  type: "upscaled";
  id: string;
  url: [string] | null; // stay consistent cause I'm lazy but still get typesafety
  prompt: string;
  percentageDone: number;
  isCanvas: boolean;
  parent: {
    id: string;
    position: number;
  } | null;
  children: ImageChild[];
  transform: {
    x: number;
    y: number;
  };
};
export type GeneratedImage = VariationGeneration | UpscaledGeneration;

type HistoryItem =
  | { type: "image-editor"; imageId: string }
  | {
      type: "workspace-transform";
      transform: { x: number; y: number; scale: number };
    };

interface GeneratedImagesState {
  images: Record<string, GeneratedImage>;
  editorId: string | null;
  prevEditorId: string | null;
  activeImageId: string | null;
  workspaceTool: "select-tool" | "grab-tool" | "delete-tool";
  workspaceTransform: { x: number; y: number; scale: number };
  workspaceImages: Record<string, true>;
  history: HistoryItem[];
  historyIndex: number;
}
// prefilled with some images
const initialState: GeneratedImagesState = {
  images: {
    "6ea0d4b3-5518-4247-9feb-8fc6a56e35e1": {
      type: "variations",
      id: "6ea0d4b3-5518-4247-9feb-8fc6a56e35e1",
      url: [
        "https://ucarecdn.com/03f669eb-3d87-49e7-9cb4-44f7c1be9332/",
        "https://ucarecdn.com/18cd34af-f56b-431f-b03e-5c49310cfbbd/",
        "https://ucarecdn.com/9c1e2b8c-c308-4d18-8311-78f7bf29086e/",
        "https://ucarecdn.com/01723fda-7c76-45fa-bb66-e06c78735365/",
      ],
      percentageDone: 100,
      prompt:
        "austronaut on a field, sunset, highly detailed, beautiful scenery, 4k",
      parent: null,
      children: [
        {
          type: "upscaled",
          id: "3bcb7dad-e852-4e36-a5bb-9f8e01c3a59a",
          position: 2,
        },
        {
          type: "upscaled",
          id: "2d326296-993d-4193-884f-43a471f34ff6",
          position: 1,
        },
        {
          type: "upscaled",
          id: "9e2917b2-2a0b-409b-a792-2f5401016dfa",
          position: 3,
        },
        {
          type: "upscaled",
          id: "d98abd5b-4a71-4644-a712-47eba4a0b6b9",
          position: 1,
        },
        {
          type: "upscaled",
          id: "dd46b269-3158-4471-8f8e-333b71c590d4",
          position: 3,
        },
        {
          type: "upscaled",
          id: "0c8434bb-b111-4872-a4e0-bebec1085889",
          position: 3,
        },
        {
          type: "upscaled",
          id: "a37e1e95-0c5b-47c0-b4ff-5ebb601c4817",
          position: 1,
        },
      ],
      transform: {
        x: -617.7389011621464,
        y: -953.319950959787,
      },
    },
    "bcd7c40e-ab87-4c40-b8a8-782cd0643b93": {
      type: "variations",
      id: "bcd7c40e-ab87-4c40-b8a8-782cd0643b93",
      url: [
        "https://ucarecdn.com/d59186cb-f5b5-45aa-98fc-87b1d963bc60/",
        "https://ucarecdn.com/2db45125-8e27-454f-a3a8-2e963b1bde31/",
        "https://ucarecdn.com/5156fdaa-2fb2-44e0-ac09-d5953b5884ab/",
        "https://ucarecdn.com/43661962-716e-4461-8261-762a0af4c8c5/",
      ],
      percentageDone: 100,
      prompt: "fishermans hut by water, cinematic, highly detailed, 4k, mystic",
      parent: null,
      children: [
        {
          type: "upscaled",
          id: "0e343d6b-6b42-4ab7-852f-f18e6ae4a9f6",
          position: 1,
        },
        {
          type: "upscaled",
          id: "69beea82-6891-426c-ac50-e3b6b8d7c90e",
          position: 2,
        },
        {
          type: "upscaled",
          id: "e9f9700c-a234-4cf0-84a7-55066eeab0ed",
          position: 2,
        },
      ],
      transform: {
        x: 177.14733395261308,
        y: 980.6666924107761,
      },
    },
    "0e343d6b-6b42-4ab7-852f-f18e6ae4a9f6": {
      id: "0e343d6b-6b42-4ab7-852f-f18e6ae4a9f6",
      url: ["https://ucarecdn.com/2db45125-8e27-454f-a3a8-2e963b1bde31/"],
      type: "upscaled",
      percentageDone: 0,
      isCanvas: false,
      parent: {
        id: "bcd7c40e-ab87-4c40-b8a8-782cd0643b93",
        position: 1,
      },
      prompt: "fishermans hut by water, cinematic, highly detailed, 4k, mystic",
      children: [
        {
          id: "95c37ed1-8f06-4f2d-9fcb-ae8b5190a704",
          type: "variations",
        },
        {
          id: "5d87695d-39cd-436e-9ee8-fe385070c68a",
          type: "variations",
        },
        {
          id: "94395d2c-2acc-4236-9411-9fe344d93829",
          type: "variations",
        },
        {
          id: "9c5a66fb-30cd-41a1-9c04-8b4b9b376c5c",
          type: "variations",
        },
        {
          id: "83763b0f-4165-48f9-bb1a-3fddc159e4e4",
          type: "variations",
        },
        {
          id: "5b28c3ea-6e8a-468f-8e7c-4ef88c273d81",
          type: "variations",
        },
        {
          id: "1fab81ac-c355-4388-ad5d-33a52475f520",
          type: "variations",
        },
        {
          id: "f97f78e1-47b1-44ed-b2b7-ffa28e6943af",
          type: "variations",
        },
        {
          id: "13e683df-5c8f-4445-aef4-d80d21fd6102",
          type: "variations",
        },
        {
          id: "06e33b2b-03c0-4bbe-9ca8-d18b7180310e",
          type: "variations",
        },
        {
          id: "ad1d9601-23ea-4025-bf79-056c3a1b8c1c",
          type: "variations",
        },
        {
          id: "def04904-b0b7-4de1-b70a-b09e0c3222c1",
          type: "variations",
        },
        {
          id: "091fcf9e-0bad-4e97-87d2-35f03cfd5b27",
          type: "variations",
        },
        {
          id: "cd053177-12fa-4c4e-a70d-e051e5ed3636",
          type: "variations",
        },
        {
          id: "035a2faf-4e89-42c8-a504-237fae90ce47",
          type: "variations",
        },
        {
          id: "14560b42-9c14-441a-a415-ca7eed2efd2a",
          type: "variations",
        },
        {
          id: "7604a915-d456-4a6c-8592-678fde7d378e",
          type: "variations",
        },
        {
          id: "e99e315f-1f38-44a5-9975-c756c186e6bc",
          type: "variations",
        },
        {
          id: "d4db3064-fefe-4ca3-86e5-2a8feb50a666",
          type: "variations",
        },
        {
          id: "391e54d5-d3a6-4a2e-8270-8e05b16f297f",
          type: "variations",
        },
        {
          id: "12e2012a-9a2e-46a8-b514-40a3ec9b3e65",
          type: "variations",
        },
        {
          id: "73dd4791-5951-45eb-95fa-1cd356e3dd77",
          type: "variations",
        },
      ],
      transform: {
        x: 733.0262655228563,
        y: 701.2713116648656,
      },
    },
    "f97f78e1-47b1-44ed-b2b7-ffa28e6943af": {
      id: "f97f78e1-47b1-44ed-b2b7-ffa28e6943af",
      url: ["https://ucarecdn.com/d0e40c48-87d3-4273-acdb-b835ce6ac820/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt:
        "hut in winter, snow, frozen water, cinematic, highly detailed, 4k, mystic",
      parent: {
        id: "0e343d6b-6b42-4ab7-852f-f18e6ae4a9f6",
        position: 0,
      },
      children: [
        {
          id: "16352fb0-8478-48c5-b8d5-23d8b02948b6",
          type: "variations",
        },
      ],
      transform: {
        x: 1356.4143014790577,
        y: 693.3691762497044,
      },
    },
    "e9f9700c-a234-4cf0-84a7-55066eeab0ed": {
      id: "e9f9700c-a234-4cf0-84a7-55066eeab0ed",
      url: ["https://ucarecdn.com/5156fdaa-2fb2-44e0-ac09-d5953b5884ab/"],
      type: "upscaled",
      percentageDone: 0,
      isCanvas: false,
      parent: {
        id: "bcd7c40e-ab87-4c40-b8a8-782cd0643b93",
        position: 2,
      },
      prompt: "fishermans hut by water, cinematic, highly detailed, 4k, mystic",
      children: [],
      transform: {
        x: 742.7056485567589,
        y: 1188.0312601624123,
      },
    },
    "0c8434bb-b111-4872-a4e0-bebec1085889": {
      id: "0c8434bb-b111-4872-a4e0-bebec1085889",
      url: ["https://ucarecdn.com/01723fda-7c76-45fa-bb66-e06c78735365/"],
      type: "upscaled",
      percentageDone: 0,
      isCanvas: false,
      parent: {
        id: "6ea0d4b3-5518-4247-9feb-8fc6a56e35e1",
        position: 3,
      },
      prompt:
        "austronaut on a field, sunset, highly detailed, beautiful scenery, 4k",
      children: [
        {
          id: "6147d3e1-dc16-42bc-8f66-bcf48c6b7749",
          type: "variations",
        },
      ],
      transform: {
        x: 127.30770833251998,
        y: -1022.0656260863989,
      },
    },
    "a37e1e95-0c5b-47c0-b4ff-5ebb601c4817": {
      id: "a37e1e95-0c5b-47c0-b4ff-5ebb601c4817",
      url: ["https://ucarecdn.com/18cd34af-f56b-431f-b03e-5c49310cfbbd/"],
      type: "upscaled",
      percentageDone: 0,
      isCanvas: false,
      parent: {
        id: "6ea0d4b3-5518-4247-9feb-8fc6a56e35e1",
        position: 1,
      },
      prompt:
        "austronaut on a field, sunset, highly detailed, beautiful scenery, 4k",
      children: [
        {
          id: "56444534-6bbc-46da-a04a-834c3f1f4b39",
          type: "variations",
        },
        {
          id: "cd466376-621f-4510-8f1a-a760bbca8332",
          type: "variations",
        },
        {
          id: "aa1a69ea-9183-4d9f-9a1d-ea89e0bfc49a",
          type: "variations",
        },
        {
          id: "53d64f0f-cf15-4e20-91ce-ca918ae3d04e",
          type: "variations",
        },
        {
          id: "65a97aae-3422-42b1-af33-a527f6f82d9b",
          type: "variations",
        },
        {
          id: "eb6649c5-8d48-4f3b-b917-b552e108c201",
          type: "variations",
        },
      ],
      transform: {
        x: -357.9285194006373,
        y: -1379.5964068004866,
      },
    },
    "56444534-6bbc-46da-a04a-834c3f1f4b39": {
      id: "56444534-6bbc-46da-a04a-834c3f1f4b39",
      url: ["https://ucarecdn.com/02bb0adb-78ab-4ac3-8c2c-3320101d5799/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "Walking away from a lion",
      parent: {
        id: "a37e1e95-0c5b-47c0-b4ff-5ebb601c4817",
        position: 0,
      },
      children: [],
      transform: {
        x: -830.1726551439318,
        y: -1589.7319666078017,
      },
    },
    "cd466376-621f-4510-8f1a-a760bbca8332": {
      id: "cd466376-621f-4510-8f1a-a760bbca8332",
      url: ["https://ucarecdn.com/99af1589-33b8-458d-92dd-c45c93bf1033/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "Austronaut on the moon",
      parent: {
        id: "a37e1e95-0c5b-47c0-b4ff-5ebb601c4817",
        position: 0,
      },
      children: [],
      transform: {
        x: 130.88387663166796,
        y: -1762.3389233520845,
      },
    },
    "53d64f0f-cf15-4e20-91ce-ca918ae3d04e": {
      id: "53d64f0f-cf15-4e20-91ce-ca918ae3d04e",
      url: ["https://ucarecdn.com/db87fe1e-aedd-4d56-aadd-9648c41e8529/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "austronaut walking with lion",
      parent: {
        id: "a37e1e95-0c5b-47c0-b4ff-5ebb601c4817",
        position: 0,
      },
      children: [],
      transform: {
        x: -349.9411942847024,
        y: -1895.9971800688352,
      },
    },
    "579ee8ea-0b38-4bf1-b7b2-ebee9e6a9a11": {
      id: "579ee8ea-0b38-4bf1-b7b2-ebee9e6a9a11",
      url: ["https://ucarecdn.com/a0fc77ac-9a7b-45ff-a298-7f80c47bfa1f/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "hut burning in the water",
      parent: {
        id: "13e683df-5c8f-4445-aef4-d80d21fd6102",
        position: 0,
      },
      children: [],
      transform: {
        x: 1113.4604094417573,
        y: 211.91415779335713,
      },
    },
    "669f28fa-4e56-4de3-9880-40968ff3fe9b": {
      id: "669f28fa-4e56-4de3-9880-40968ff3fe9b",
      url: ["https://ucarecdn.com/edc83255-75e7-4d12-823e-3ec9a8773705/"],
      type: "upscaled",
      percentageDone: 0,
      prompt: "white background",
      isCanvas: true,
      parent: null,
      children: [
        {
          id: "9619f013-c668-4020-ae7c-3ac4fc8ce567",
          type: "variations",
        },
        {
          id: "f5736c6e-edf3-4014-9973-0cb34397fc49",
          type: "variations",
        },
        {
          id: "d7706a77-fa1f-4bbc-8098-013fcf15a3d3",
          type: "variations",
        },
        {
          id: "f44c5bf2-7243-4963-9c7e-91fca49bfaa4",
          type: "variations",
        },
        {
          id: "514b018d-4f13-40fe-a396-1bc198a6a31f",
          type: "variations",
        },
        {
          id: "e6f6fd03-4fd4-4cec-860e-c7123615a24d",
          type: "variations",
        },
        {
          id: "0c8a112f-7244-43cb-aa46-626c42183bab",
          type: "variations",
        },
        {
          id: "4ab5bbf8-ad7b-4370-92e9-435e1c5bb956",
          type: "variations",
        },
      ],
      transform: {
        x: -1813.9353774880656,
        y: 1627.055980279284,
      },
    },
    "f44c5bf2-7243-4963-9c7e-91fca49bfaa4": {
      id: "f44c5bf2-7243-4963-9c7e-91fca49bfaa4",
      url: ["https://ucarecdn.com/0698c9ab-08df-467d-8373-5694b037fca5/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "A car road going into the mountains",
      parent: {
        id: "669f28fa-4e56-4de3-9880-40968ff3fe9b",
        position: 0,
      },
      children: [],
      transform: {
        x: -2244.3809967029283,
        y: 1789.3190272202921,
      },
    },
    "0c8a112f-7244-43cb-aa46-626c42183bab": {
      id: "0c8a112f-7244-43cb-aa46-626c42183bab",
      url: ["https://ucarecdn.com/60978d09-5514-4402-9b50-159d611715e4/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "flood into the mountains",
      parent: {
        id: "669f28fa-4e56-4de3-9880-40968ff3fe9b",
        position: 0,
      },
      children: [],
      transform: {
        x: -1371.4963882478692,
        y: 1757.7565629698177,
      },
    },
    "4ab5bbf8-ad7b-4370-92e9-435e1c5bb956": {
      id: "4ab5bbf8-ad7b-4370-92e9-435e1c5bb956",
      url: ["https://ucarecdn.com/ae6d2adb-423e-4aee-b4ef-bd045f0950f2/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "sunset",
      parent: {
        id: "669f28fa-4e56-4de3-9880-40968ff3fe9b",
        position: 0,
      },
      children: [],
      transform: {
        x: -1917.8430210502506,
        y: 1160.666652301778,
      },
    },
    "d93121ad-e5ba-4495-bbea-28dd51f07cec": {
      type: "variations",
      id: "d93121ad-e5ba-4495-bbea-28dd51f07cec",
      url: [
        "https://ucarecdn.com/a29fc67b-5e67-4830-ae34-4009a598616c/",
        "https://ucarecdn.com/6952ad20-c033-4928-ad21-d49a19f9d2b7/",
        "https://ucarecdn.com/3ef11175-892a-4977-a644-6a86e2fa7795/",
        "https://ucarecdn.com/d94703f6-7744-4c65-9570-e491b8c8c838/",
      ],
      percentageDone: 100,
      prompt:
        "Mushrooms in the forrest, zoomed in, highly detailed, sunset, happy",
      parent: null,
      children: [
        {
          type: "upscaled",
          id: "9d044b75-1c85-4914-b633-04dcbf144aa9",
          position: 0,
        },
        {
          type: "upscaled",
          id: "d2d9b49c-87bc-4d7e-835e-2df93aadcbe6",
          position: 1,
        },
        {
          type: "upscaled",
          id: "8421b345-f890-4e14-9a94-79a6dcacf474",
          position: 0,
        },
      ],
      transform: {
        x: 1501.3163965531767,
        y: -823.1793637019452,
      },
    },
    "8cbcbb05-bae4-4acf-906e-abd37ab84839": {
      id: "8cbcbb05-bae4-4acf-906e-abd37ab84839",
      url: ["https://ucarecdn.com/ca4c9d47-6148-4f3c-a5a6-503fdea45af0/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "photo of a cat",
      parent: {
        id: "1b82623c-9a30-4788-837c-d93075c8a2dd",
        position: 0,
      },
      children: [
        {
          id: "1ef71f86-2f7c-4d4b-82a8-d2478d0474b1",
          type: "variations",
        },
        {
          id: "ea9e38e6-377c-4061-a5fb-88a1ec414d92",
          type: "variations",
        },
        {
          id: "f99bcda1-46cf-4032-9927-b49e6bbf7273",
          type: "variations",
        },
        {
          id: "b3175c9e-5e15-4645-8a9c-9fd694e3207d",
          type: "variations",
        },
        {
          id: "10d109f6-83fb-4531-9285-c4d52c5a9678",
          type: "variations",
        },
      ],
      transform: {
        x: -2432.3626608045893,
        y: -761.4424810410343,
      },
    },
    "9ca93024-589d-407f-ac34-502342ac4cf3": {
      id: "9ca93024-589d-407f-ac34-502342ac4cf3",
      url: ["https://ucarecdn.com/26d8ade8-c3ab-4b7b-88d2-74ba57a843bf/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "cat in the sun chilling",
      parent: {
        id: "1b82623c-9a30-4788-837c-d93075c8a2dd",
        position: 0,
      },
      children: [],
      transform: {
        x: -2624.380096600834,
        y: -276.7324835566653,
      },
    },
    "f99bcda1-46cf-4032-9927-b49e6bbf7273": {
      id: "f99bcda1-46cf-4032-9927-b49e6bbf7273",
      url: ["https://ucarecdn.com/382fe100-18df-4ca8-b5b4-2b9cfe4a124c/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "Cat standing in the middle of nowhere",
      parent: {
        id: "8cbcbb05-bae4-4acf-906e-abd37ab84839",
        position: 0,
      },
      children: [],
      transform: {
        x: -2862.3141230289375,
        y: -963.7008022344518,
      },
    },
    "d2d9b49c-87bc-4d7e-835e-2df93aadcbe6": {
      id: "d2d9b49c-87bc-4d7e-835e-2df93aadcbe6",
      url: ["https://ucarecdn.com/6952ad20-c033-4928-ad21-d49a19f9d2b7/"],
      type: "upscaled",
      percentageDone: 0,
      isCanvas: false,
      parent: {
        id: "d93121ad-e5ba-4495-bbea-28dd51f07cec",
        position: 1,
      },
      prompt:
        "Mushrooms in the forrest, zoomed in, highly detailed, sunset, happy",
      children: [],
      transform: {
        x: 1989.1015692068959,
        y: -704.943314420504,
      },
    },
    "5b859de4-dd06-45a0-bd61-8b6986907816": {
      id: "5b859de4-dd06-45a0-bd61-8b6986907816",
      url: ["https://ucarecdn.com/8c0cf724-3bcb-4f38-96ae-428b9c65cc46/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "Mushroom in freezing forrest, cold, blue",
      parent: {
        id: "9d044b75-1c85-4914-b633-04dcbf144aa9",
        position: 0,
      },
      children: [],
      transform: {
        x: 2165.1752078668865,
        y: -1308.5111719093854,
      },
    },
    "8421b345-f890-4e14-9a94-79a6dcacf474": {
      id: "8421b345-f890-4e14-9a94-79a6dcacf474",
      url: ["https://ucarecdn.com/a29fc67b-5e67-4830-ae34-4009a598616c/"],
      type: "upscaled",
      percentageDone: 0,
      isCanvas: false,
      parent: {
        id: "d93121ad-e5ba-4495-bbea-28dd51f07cec",
        position: 0,
      },
      prompt:
        "Mushrooms in the forrest, zoomed in, highly detailed, sunset, happy",
      children: [
        {
          id: "20b68a31-8245-4424-9886-b6466e5dc888",
          type: "variations",
        },
        {
          id: "3c816fe8-bc59-4d63-84bc-85c7868d1340",
          type: "variations",
        },
        {
          id: "2e104a3c-853f-4f6b-8e1e-e05497f4e9a9",
          type: "variations",
        },
        {
          id: "1fa32b30-1099-44f2-956c-454a1233cfad",
          type: "variations",
        },
        {
          id: "30117ce9-6789-4f7c-928a-698054d864ea",
          type: "variations",
        },
        {
          id: "da11100d-26a1-4d77-b83e-1f3a12475222",
          type: "variations",
        },
        {
          id: "40314f77-fe45-45ec-a67f-73c56b764c2f",
          type: "variations",
        },
        {
          id: "888a70cc-8f65-4321-b594-f22c26b4cdee",
          type: "variations",
        },
        {
          id: "823fe1c6-4b18-4d2a-80ec-545c3223a2cc",
          type: "variations",
        },
        {
          id: "6effec4c-e0e6-4183-ab1d-379179c921b5",
          type: "variations",
        },
        {
          id: "a3212b5d-1d22-4220-b28d-127e4fe7f1df",
          type: "variations",
        },
      ],
      transform: {
        x: 1566.805774268249,
        y: -1404.7403239509813,
      },
    },
    "2e104a3c-853f-4f6b-8e1e-e05497f4e9a9": {
      id: "2e104a3c-853f-4f6b-8e1e-e05497f4e9a9",
      url: ["https://ucarecdn.com/916f3cf5-a14b-4bda-8190-31168580eaec/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "house inside a mushroom",
      parent: {
        id: "8421b345-f890-4e14-9a94-79a6dcacf474",
        position: 0,
      },
      children: [],
      transform: {
        x: 1639.4630358626202,
        y: -1849.8627057067283,
      },
    },
    "391e54d5-d3a6-4a2e-8270-8e05b16f297f": {
      id: "391e54d5-d3a6-4a2e-8270-8e05b16f297f",
      url: ["https://ucarecdn.com/e38b3fe2-2c57-4f19-aaab-cd9d1047998c/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "hut in water with shark",
      parent: {
        id: "0e343d6b-6b42-4ab7-852f-f18e6ae4a9f6",
        position: 0,
      },
      children: [],
      transform: {
        x: 659.9921708375316,
        y: 195.9396456341569,
      },
    },
    "6effec4c-e0e6-4183-ab1d-379179c921b5": {
      id: "6effec4c-e0e6-4183-ab1d-379179c921b5",
      url: ["https://ucarecdn.com/abb40820-c156-4991-88b1-2e302f60885c/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "mushrooms house",
      parent: {
        id: "8421b345-f890-4e14-9a94-79a6dcacf474",
        position: 0,
      },
      children: [],
      transform: {
        x: 2230.8057742682495,
        y: -1789.7403239509813,
      },
    },
    "a3212b5d-1d22-4220-b28d-127e4fe7f1df": {
      id: "a3212b5d-1d22-4220-b28d-127e4fe7f1df",
      url: ["https://ucarecdn.com/872c48b7-3732-4a2c-81f0-243aa86b06bd/"],
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt: "Mushrooms in ice, cold",
      parent: {
        id: "8421b345-f890-4e14-9a94-79a6dcacf474",
        position: 0,
      },
      children: [],
      transform: {
        x: 1105.9652288595396,
        y: -1421.7837258602826,
      },
    },
    "453ed1b5-e760-4c00-9c4b-bd89ed0a3e70": {
      id: "453ed1b5-e760-4c00-9c4b-bd89ed0a3e70",
      url: ["https://ucarecdn.com/bca8868a-eea4-45cc-9325-22ebe93303cc/"],
      type: "upscaled",
      percentageDone: 100,
      prompt: "white background",
      isCanvas: true,
      parent: null,
      children: [
        {
          id: "9896152b-d7b3-4efe-8f22-d0a3bc2c1b83",
          type: "variations",
        },
        {
          id: "e7b805e6-613f-48df-a23c-3080a6774658",
          type: "variations",
        },
        {
          id: "e8777e82-326a-4c45-9d68-2203628162f9",
          type: "variations",
        },
        {
          id: "e75f2ac4-8145-457d-8d28-9af265db8eea",
          type: "variations",
        },
        {
          id: "65b3cfc7-dc9d-4b97-a299-e59d81c1c450",
          type: "variations",
        },
        {
          id: "51976209-30ee-4cc4-ad28-1f459e55a962",
          type: "variations",
        },
        {
          id: "ea58520b-7ae5-45b0-8efd-02e180922fa1",
          type: "variations",
        },
      ],
      transform: {
        x: -2073.9941089714366,
        y: -375.86488540756665,
      },
    },
  },
  editorId: null,
  prevEditorId: null,
  activeImageId: null,
  workspaceTool: "select-tool",
  workspaceTransform: initialTransform,
  workspaceImages: {},
  history: [],
  historyIndex: -1,
};

export const generatedImagesSlice = createSlice({
  name: "generatedImagesSlice",
  initialState,
  reducers: {
    setWorkspaceTool: (
      state,
      action: PayloadAction<{ tool: GeneratedImagesState["workspaceTool"] }>
    ) => {
      state.workspaceTool = action.payload.tool;
    },
    addImage: (state, action: PayloadAction<GeneratedImage>) => {
      state.images[action.payload.id] = action.payload;
    },
    showImageInWorkspace: (state, action: PayloadAction<{ id: string }>) => {
      state.workspaceImages[action.payload.id] = true;
    },
    hideImageInWorkspace: (state, action: PayloadAction<{ id: string }>) => {
      delete state.workspaceImages[action.payload.id];
    },
    deleteImage: (state, action: PayloadAction<{ id: string }>) => {
      delete state.images[action.payload.id];
      if (state.editorId === action.payload.id) {
        state.editorId = null;
      }
      if (state.activeImageId === action.payload.id) {
        state.activeImageId = null;
      }
      state.history = state.history.filter(
        (item) =>
          item.type !== "image-editor" || item.imageId !== action.payload.id
      );
    },
    setWorkspaceTransform: (
      state,
      action: PayloadAction<{ x?: number; y?: number; scale?: number }>
    ) => {
      if (action.payload.x != null) {
        state.workspaceTransform.x = action.payload.x;
      }
      if (action.payload.y != null) {
        state.workspaceTransform.y = action.payload.y;
      }
      if (action.payload.scale != null) {
        state.workspaceTransform.scale = action.payload.scale;
      }
    },
    setImageUrls: (
      state,
      action: PayloadAction<{ id: string; urls: string[] }>
    ) => {
      const image = state.images[action.payload.id];
      if (image == null) {
        console.error("Invalid image", image);
        return;
      }
      image.url = action.payload.urls;
    },
    appendImageChild: (
      state,
      action: PayloadAction<{ id: string; child: ImageChild }>
    ) => {
      state.images[action.payload.id]!.children.push(action.payload.child);
    },
    removeImageChild: (
      state,
      action: PayloadAction<{ id: string; childId: string }>
    ) => {
      const index = state.images[action.payload.id]!.children.findIndex(
        (child) => child.id === action.payload.childId
      );
      if (index === -1) {
        return;
      }
      state.images[action.payload.id]!.children.splice(index, 1);
    },
    setImagePercentage: (
      state,
      action: PayloadAction<{ id: string; percentage: number }>
    ) => {
      state.images[action.payload.id]!.percentageDone =
        action.payload.percentage;
    },
    moveImage: (
      state,
      action: PayloadAction<{ id: string; transform: { x: number; y: number } }>
    ) => {
      state.images[action.payload.id]!.transform.x +=
        action.payload.transform.x;
      state.images[action.payload.id]!.transform.y +=
        action.payload.transform.y;
    },
    setEditorImageId: (state, action: PayloadAction<{ id: string | null }>) => {
      state.prevEditorId = state.editorId;
      state.editorId = action.payload.id;
    },
    setActiveImage: (state, action: PayloadAction<{ id: string | null }>) => {
      state.activeImageId = action.payload.id;
    },
    appendHistory: (state, action: PayloadAction<HistoryItem>) => {
      const isRefocus = (() => {
        if (
          state.history.length === 0 ||
          action.payload.type !== "image-editor"
        ) {
          return false;
        }
        const lastItem = state.history[state.history.length - 1];
        if (lastItem.type !== "image-editor") {
          return false;
        }
        return lastItem.imageId === action.payload.imageId;
      })();
      if (isRefocus) {
        return;
      }
      state.history.splice(state.historyIndex + 1);
      state.history.push(action.payload);
      state.historyIndex = state.history.length - 1;
    },
    navigateHistory: (
      state,
      action: PayloadAction<{ historyIndex: number }>
    ) => {
      state.historyIndex = action.payload.historyIndex;
    },
  },
});

const getEditorScale = () => {
  const referenceHeight = 1000;
  const referenceWidth = 1500;
  const scaleAtReference = 1.6;
  const scaleHeight = (window.innerHeight / referenceHeight) * scaleAtReference;
  const scaleWidth = (window.innerWidth / referenceWidth) * scaleAtReference;
  return Math.round(Math.min(scaleHeight, scaleWidth) * 10) / 10;
};

const debounceTransformWorkspace = throttle(
  (dispatch, transform) => {
    dispatch(generatedImagesSlice.actions.setWorkspaceTransform(transform));
  },
  50,
  { leading: true, trailing: true }
);

// this state is not reactive cause just to expensive, instead it is synced with workspaceEl every time it's set
export const localWorkspaceTransform: { x: number; y: number; scale: number } =
  { ...initialTransform };

export const transformWorkspace = (
  transform: {
    x?: number;
    y?: number;
    scale?: number;
  },
  immediate?: boolean
): AppThunk => {
  return async (dispatch, _getState, extra) => {
    if (extra.workspaceEl == null) return;
    if (transform.scale != null) {
      localWorkspaceTransform.scale = transform.scale;
    }
    if (transform.x != null) {
      localWorkspaceTransform.x = transform.x;
    }
    if (transform.y != null) {
      localWorkspaceTransform.y = transform.y;
    }
    extra.workspaceEl.style.transform = `translate(${localWorkspaceTransform.x}px, ${localWorkspaceTransform.y}px) scale(${localWorkspaceTransform.scale})`;
    if (immediate) {
      dispatch(generatedImagesSlice.actions.setWorkspaceTransform(transform));
      return;
    }
    debounceTransformWorkspace(dispatch, transform);
  };
};

export const navigateHistory = (offset: number): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState().generatedImages;

    const historyIndex = (() => {
      // NOTE(gab): navigates to the latest image that was edited if currently not editing
      if (offset === -1 && state.editorId == null) {
        return state.historyIndex;
      }
      return Math.min(
        Math.max(state.historyIndex + offset, 0),
        state.history.length - 1
      );
    })();

    dispatch(
      generatedImagesSlice.actions.navigateHistory({
        historyIndex,
      })
    );
    const action = state.history[historyIndex];
    switch (action.type) {
      case "image-editor": {
        dispatch(setEditingImage(action.imageId, { keepHistory: true }));
        return;
      }
      case "workspace-transform": {
        dispatch(transformWorkspace(action.transform, true));
        return;
      }
      default: {
        assertNever(action);
      }
    }
  };
};

export const setEditingImage = (
  imageId: string | null,
  opts?: { keepHistory: boolean }
): AppThunk => {
  return async (dispatch, getState, extra) => {
    dispatch(
      generatedImagesSlice.actions.setActiveImage({
        id: imageId,
      })
    );
    if (imageId == null) {
      dispatch(
        generatedImagesSlice.actions.setEditorImageId({
          id: imageId,
        })
      );
      return;
    }

    const actions: AnyAction[] = [
      generatedImagesSlice.actions.setEditorImageId({
        id: imageId,
      }),
    ];
    if (opts?.keepHistory !== true) {
      actions.push(
        generatedImagesSlice.actions.appendHistory({
          type: "image-editor",
          imageId,
        })
      );
    }

    dispatch(batchActions(actions));

    const image = getState().generatedImages.images[imageId];
    const newScale = getEditorScale();
    dispatch(
      smoothTransformWorkspace({
        x: (-image.transform.x - 400 / 2) * newScale,
        y: (-image.transform.y - 400 / 2) * newScale,
        scale: newScale,
      })
    );
  };
};

export const smoothTransformWorkspace = (transform: {
  x?: number;
  y?: number;
  scale?: number;
}): AppThunk => {
  return async (dispatch, _getState, extra) => {
    extra.workspaceEl!.style.transition = "transform 400ms ease-in-out";
    dispatch(transformWorkspace(transform, true));
    setTimeout(() => {
      extra.workspaceEl!.style.transition = "none";
    }, 420);
  };
};

export const uploadImage = async (blob: Blob): Promise<string> => {
  const result = await uploadFile(blob, {
    publicKey: "037a51a72cf85bf758c7",
    store: true,
    metadata: {},
  });

  return result["cdnUrl"] as string;
};

export const addWhiteImage = (): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    const workspaceTransform = state.generatedImages.workspaceTransform;
    const images = state.generatedImages.images;

    const image: GeneratedImage = {
      id: v4(),
      url: ["https://ucarecdn.com/1b9e1cef-ed30-450d-a88f-ded57eb6ec35/"],
      type: "upscaled",
      percentageDone: 100,
      prompt: "white background",
      isCanvas: true,
      parent: null,
      children: [],
      transform: findEmptyArea(
        -workspaceTransform.x * (1 / workspaceTransform.scale),
        -workspaceTransform.y * (1 / workspaceTransform.scale),
        Object.values(images)
      ),
    };
    dispatch(generatedImagesSlice.actions.addImage(image));
    const newScale = Math.max(1.2, workspaceTransform.scale);
    dispatch(
      smoothTransformWorkspace({
        x: (-image.transform.x - 400 / 2) * newScale,
        y: (-image.transform.y - 400 / 2) * newScale,
        scale: newScale,
      })
    );
  };
};

export const generateImageVariations = (
  prompt: string,
  opts?: { navigate?: boolean }
): AppThunk => {
  return async (dispatch, getState) => {
    const workspaceTransform = getState().generatedImages.workspaceTransform;

    if (prompt === "empty") {
      dispatch(addWhiteImage());
      return;
    }

    const tmpId = v4();
    const image: GeneratedImage = {
      type: "variations",
      id: tmpId,
      url: null,
      percentageDone: 100,
      prompt,
      parent: null,
      children: [],
      transform: findEmptyArea(
        -workspaceTransform.x,
        -workspaceTransform.y,
        Object.values(getState().generatedImages.images)
      ),
    };
    dispatch(batchActions([generatedImagesSlice.actions.addImage(image)]));
    if (opts?.navigate) {
      const scale = getState().generatedImages.workspaceTransform.scale;

      const newScale = Math.max(1.1, scale);
      dispatch(
        smoothTransformWorkspace({
          x: (-image.transform.x - 400 / 2) * newScale,
          y: (-image.transform.y - 400 / 2) * newScale,
          scale: newScale,
        })
      );
    }

    let imageUrls: string[] = [];
    try {
      const response = await fetch(`${getApi()}/imagine-variations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          replicateToken: localStorage.getItem(REPLICATE_TOKEN_KEY),
        }),
      });
      if (response.status < 200 || response.status >= 300) {
        console.error(
          "Could not generate image",
          response.status,
          response.statusText,
          response
        );
      }
      const result = await response.json();
      imageUrls = result["variations"];
    } catch (e) {
      console.error(e);
      return;
    }

    dispatch(
      batchActions([
        generatedImagesSlice.actions.setImageUrls({
          id: tmpId,
          urls: imageUrls,
        }),
        generatedImagesSlice.actions.setImagePercentage({
          id: tmpId,
          percentage: 100,
        }),
      ])
    );
  };
};

export const generateImageToImageVariations = (
  imageId: string,
  position: number,
  prompt: string
): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    const originalImage = state.generatedImages.images[imageId];
    const workspaceTransform = state.generatedImages.workspaceTransform;
    const images = state.generatedImages.images;
    if (originalImage == null || originalImage.url == null) {
      console.error("Could not find image", imageId);
      return;
    }

    const image: GeneratedImage = {
      id: v4(),
      url: null,
      type: "upscaled",
      isCanvas: false,
      percentageDone: 0,
      prompt,
      parent: { id: originalImage.id, position },
      children: [],
      transform: findEmptyArea(
        -workspaceTransform.x * (1 / workspaceTransform.scale),
        -workspaceTransform.y * (1 / workspaceTransform.scale),
        Object.values(images)
      ),
    };

    dispatch(
      batchActions([
        generatedImagesSlice.actions.addImage(image),
        generatedImagesSlice.actions.appendImageChild({
          id: originalImage.id,
          child: { id: image.id, type: "variations" },
        }),
      ])
    );

    const imageUrls = await (async () => {
      if (originalImage.type === "upscaled" && originalImage.isCanvas) {
        const response = await fetch(`${getApi()}/sketch-to-image-variations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            url: originalImage.url![position],
            replicateToken: localStorage.getItem(REPLICATE_TOKEN_KEY),
          }),
        });
        if (response.status < 200 || response.status >= 300) {
          console.error(
            "Could not generate image",
            response.status,
            response.statusText,
            response
          );
        }
        const result = await response.json();
        return result["variations"];
      }

      const response = await fetch(`${getApi()}/image-to-image-variations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          url: originalImage.url![position],
          replicateToken: localStorage.getItem(REPLICATE_TOKEN_KEY),
        }),
      });
      if (response.status < 200 || response.status >= 300) {
        console.error(
          "Could not generate image",
          response.status,
          response.statusText,
          response
        );
      }
      const result = await response.json();
      return result["variations"];
    })();

    dispatch(
      batchActions([
        generatedImagesSlice.actions.setImageUrls({
          id: image.id,
          urls: imageUrls,
        }),
      ])
    );
  };
};

export const upscaleImage = (imageId: string, position: number): AppThunk => {
  return async (dispatch, getState) => {
    const originalImage = getState().generatedImages.images[imageId];
    if (originalImage == null || originalImage.url == null) {
      console.error("Could not find image", imageId);
      return;
    }

    const image: GeneratedImage = {
      id: v4(),
      url: null,
      type: "upscaled",
      percentageDone: 0,
      isCanvas: false,
      parent: { id: imageId, position },
      prompt: originalImage.prompt,
      children: [],
      transform: {
        x:
          originalImage.transform.x +
          Math.floor((Math.random() - 0.5) * 200 + 900),
        y: originalImage.transform.y + Math.floor((Math.random() - 0.5) * 500),
      },
    };
    dispatch(
      batchActions([
        generatedImagesSlice.actions.addImage(image),
        generatedImagesSlice.actions.appendImageChild({
          id: imageId,
          child: { type: "upscaled", id: image.id, position },
        }),
      ])
    );

    let imageUrl: string;
    try {
      const response = await fetch(`${getApi()}/upscale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: originalImage.url[position],
          replicateToken: localStorage.getItem(REPLICATE_TOKEN_KEY),
        }),
      });
      if (response.status < 200 || response.status >= 300) {
        console.error(
          "Could not generate image",
          response.status,
          response.statusText,
          response
        );
      }
      const result = await response.json();
      imageUrl = result["upscaled"];
    } catch (e) {
      console.error(e);
      return;
    }

    dispatch(
      batchActions([
        generatedImagesSlice.actions.setImageUrls({
          id: image.id,
          urls: [imageUrl],
        }),
      ])
    );
  };
};

export const addImageToWorkspace = (
  imageId: string,
  position: number
): AppThunk => {
  return (dispatch, getState) => {
    const state = getState();
    const originalImage = state.generatedImages.images[imageId];
    const workspaceTransform = state.generatedImages.workspaceTransform;
    const images = state.generatedImages.images;
    if (originalImage == null || originalImage.url == null) {
      console.error("Could not find image", imageId);
      return;
    }

    const image: GeneratedImage = {
      id: v4(),
      url: [originalImage.url[position]],
      type: "upscaled",
      percentageDone: 0,
      isCanvas: false,
      parent: { id: imageId, position },
      prompt: originalImage.prompt,
      children: [],
      transform: findEmptyArea(
        -workspaceTransform.x * (1 / workspaceTransform.scale),
        -workspaceTransform.y * (1 / workspaceTransform.scale),
        Object.values(images)
      ),
    };
    dispatch(
      batchActions([
        generatedImagesSlice.actions.addImage(image),
        generatedImagesSlice.actions.appendImageChild({
          id: imageId,
          child: { type: "upscaled", id: image.id, position },
        }),
      ])
    );
  };
};

export const selectUpscaledImageChildren = createSelector(
  (state: RootState) => state.generatedImages.images,
  (_: RootState, imageId: string) => imageId,
  (images, imageId): Record<number, GeneratedImage> => {
    const image = images[imageId];
    const loadingImages: Record<number, GeneratedImage> = {};
    for (const child of image.children) {
      const childImage = images[child.id];
      if (
        child.type !== "upscaled" ||
        child.position == null ||
        childImage == null
      ) {
        continue;
      }
      loadingImages[child.position] = childImage;
    }
    return loadingImages;
  }
);

export const onWorkspaceElement = (workspaceEl: HTMLElement): AppThunk => {
  return (_dispatch, _getState, extra) => {
    extra.workspaceEl = workspaceEl;
  };
};

const persistConfigGeneratedImage = {
  key: "generatedImages",
  storage,
  blacklist: ["transform", "workspaceTool"],
  throttle: 1000,
};

interface ThunkExtra {
  workspaceEl: HTMLElement | null;
}
const thunkExtra: ThunkExtra = {
  workspaceEl: null,
};

export const store = configureStore({
  reducer: enableBatching(
    combineReducers({
      generatedImages: persistReducer(
        persistConfigGeneratedImage,
        generatedImagesSlice.reducer
      ),
    })
  ),

  middleware: (getDefaultMiddlware) => {
    return getDefaultMiddlware({
      thunk: {
        extraArgument: thunkExtra,
      },
    });
  },
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);

export type RootState = {
  generatedImages: ReturnType<typeof generatedImagesSlice.reducer>;
};

export type AppDispatch = typeof store.dispatch;
export type AppThunk<R = void> = ThunkAction<
  R,
  RootState,
  ThunkExtra,
  Action<string>
>;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
