import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import Replicate from "replicate";
import dotenv from "dotenv";
import { uploadFile } from "@uploadcare/upload-client";
import fetch, { Headers } from "node-fetch";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

if (!globalThis.fetch) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.fetch = fetch;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.Headers = Headers;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.post("/imagine-variations", async (req, res) => {
  const { prompt, replicateToken } = req.body;

  try {
    console.log("start imagine", prompt);
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN ?? replicateToken,
    });
    const output = (await replicate.run(
      // "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
      "stability-ai/sdxl:d830ba5dabf8090ec0db6c10fc862c6eb1c929e1a194a5411852d25fd954ac82",
      {
        input: {
          prompt,
          num_outputs: 4,
          num_inference_steps: 50,
          scheduler: "DDIM",
          guidance_scale: 7.5,
          prompt_strength: 0.8,
          refine: "expert_ensemble_refiner",
          high_noise_fraction: 0.8,
          lora_scale: 0.6,
          height: 1024,
          width: 1024,
          seed: 1,
        },
      }
    )) as unknown as string[];
    const urls = await uploadImages(output);
    console.log("done imagining", urls);
    res.json({ variations: urls });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error });
  }
});

app.post("/image-to-image-variations", async (req, res) => {
  const { prompt, url, replicateToken } = req.body;

  try {
    console.log("before img to img", { prompt, url });

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN ?? replicateToken,
    });
    const output = (await replicate.run(
      "stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d",
      {
        input: {
          prompt,
          image: url,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          guidance_scale: 7.5,
          prompt_strength: 0.92,
          num_inference_steps: 50,
        },
      }
    )) as unknown as string[];
    console.log("got image to image results", output);
    const urls = await uploadImages(output);
    res.json({ variations: urls });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error });
  }
});

app.post("/upscale", async (req, res) => {
  const { url, replicateToken } = req.body;

  try {
    console.log("before upscale", url);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN ?? replicateToken,
    });
    const output = (await replicate.run(
      "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      {
        input: {
          image: url,
          scale: 2,
        },
      }
    )) as unknown as string;
    const urls = await uploadImages([output]);
    console.log("got upscale results", urls);
    res.json({ upscaled: urls[0] });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error });
  }
});

// async function fetchImageAndConvertToBase64(url: string) {
//   const response = await fetch(url);
//   const buffer = await response.buffer();

//   // Convert the Buffer to a Base64 string
//   const base64 = buffer.toString("base64");

//   return `data:image/png;base64,${base64}`;
// }

// app.post("/sketch-to-image-variations", async (req, res) => {
//   const { url, prompt } = req.body;

//   try {
//     console.log("before sketch", url);
//     // const response = await fetch("https://wallpapercave.com/wp/wp4471392.jpg");
//     // const file = await response.blob();
//     const blob = await createFileFromURL(url);
//     const form = new FormData();
//     form.append("sketch_file", blob);
//     form.append("prompt", prompt);

//     const respone = await fetch(
//       "https://clipdrop-api.co/sketch-to-image/v1/sketch-to-image",
//       {
//         method: "POST",
//         headers: {
//           // "Content-Type": "multipart/form-data",
//           "x-api-key":
//             "c5a023af5d25f52b2349d586ba5c770630819e7d34bc5f893414dd56790088df74b2fa58249728bb2010448dade2cccd",
//         },
//         body: form,
//       }
//     );

//     const a = await respone.json();
//     console.log("SKETCH", respone, a);

//     // const urls = await uploadImages([output]);
//     // console.log("got upscale results", urls);
//     res.json({ variations: "yeah" });
//   } catch (error: any) {
//     console.error(error);
//     res.status(500).json({ error });
//   }
// });

// app.post("/sketch-to-image-variations", async (req, res) => {
//   const { url, prompt } = req.body;
//   console.log("sketch", url, prompt);
//   try {
//     const remixId = await startSketch(url, prompt);
//     console.log("REMOIX ID", remixId);
//     res.json({ variations: "yeah" });
//   } catch (error: any) {
//     console.error(error);
//     res.status(500).json({ error });
//   }
// });

app.post("/sketch-to-image-variations", async (req, res) => {
  const { url, prompt, replicateToken } = req.body;
  console.log("sketch", url, prompt);
  try {
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN ?? replicateToken,
    });
    const output = (await replicate.run(
      "jagilley/controlnet-scribble:435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117",
      {
        input: {
          prompt,
          image: url,
          image_resolution: "768",
          num_outputs: 1,
        },
      }
    )) as unknown as string[];
    console.log("my output.", output);
    const urls = await uploadImages(output.slice(1));
    res.json({ variations: urls });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error });
  }
});

async function createFormData(image: Blob, prompt: string) {
  const formData = new FormData();
  formData.append("files", image);
  formData.append("prompt", prompt || "A hand-drawn sketch");
  formData.append("mode", "scribble");
  formData.append("numberOfImages", "4");

  return formData;
}

async function postImageToApi(formData: FormData) {
  const modelId = "1e7737d7-545e-469f-857f-e4b46eaa151d";
  const apiUrl = `https://api.tryleap.ai/api/v1/images/models/${modelId}/remix`;

  const response = await fetch(apiUrl, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer 5e94d609-50f1-440f-98b7-9df0fd3eda8e`,
    },
  });
  //
  if (!response.ok) {
    console.log(await response.json());
    throw new Error(`API request failed with status ${response.status}`);
  }

  const jsonResponse = (await response.json()) as any;
  const remixId = jsonResponse["id"];

  if (!remixId) {
    throw new Error("Remix ID not found in API response");
  }

  return remixId;
}

async function createFileFromURL(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  const data = await response.arrayBuffer();
  const contentType =
    response.headers.get("content-type") || "binary/octet-stream";

  const blob = new Blob([data], { type: contentType });
  const fileName = url.split("/").pop() || "file";

  // Create a File object from the Blob
  const file = new File([blob], fileName, { type: contentType });

  return file;
}

const startSketch = async (url: string, prompt: string) => {
  const blob = await createFileFromURL(url);
  let remixId;
  try {
    const formData = await createFormData(blob, prompt);
    remixId = await postImageToApi(formData);
  } catch (error: unknown) {
    console.error(error);
    console.error("Error while making request to external API:");
    return;
  }

  return remixId;
};

const uploadImages = async (urls: string[]) => {
  const t = performance.now();

  const results = await Promise.all(
    urls.map((url) => {
      return uploadFile(url, {
        publicKey: "037a51a72cf85bf758c7",
        store: true,
        metadata: {},
      });
    })
  );
  console.log("ms to upload images:", performance.now() - t);

  return results.map((r) => r["cdnUrl"]);
};

app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
