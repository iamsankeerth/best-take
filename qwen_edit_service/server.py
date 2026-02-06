from __future__ import annotations

import io
import json
import os
from typing import List, Optional

import torch
import httpx
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from diffusers import QwenImageEditPlusPipeline

app = FastAPI()

cors_env = os.environ.get("QWEN_CORS", "http://localhost:3000,http://127.0.0.1:3000")
cors_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

MODEL_ID = os.environ.get("QWEN_MODEL_ID", "Qwen/Qwen-Image-Edit-2509")
DEFAULT_HEIGHT = int(os.environ.get("QWEN_HEIGHT", "1536"))
DEFAULT_WIDTH = int(os.environ.get("QWEN_WIDTH", "1536"))
DEFAULT_STEPS = int(os.environ.get("QWEN_STEPS", "50"))
DEFAULT_TRUE_CFG = float(os.environ.get("QWEN_TRUE_CFG", "4.0"))
DEFAULT_GUIDANCE = os.environ.get("QWEN_GUIDANCE", "")
DEFAULT_GUIDANCE = float(DEFAULT_GUIDANCE) if DEFAULT_GUIDANCE else None
DEFAULT_MODE = os.environ.get("QWEN_MODE", "best_take").lower()
REWRITE_ENABLED = os.environ.get("QWEN_REWRITE_PROMPT", "0") == "1"
REWRITER_API_BASE = os.environ.get("QWEN_REWRITER_API_BASE", "").rstrip("/")
REWRITER_MODEL = os.environ.get("QWEN_REWRITER_MODEL", "")
REWRITER_API_KEY = os.environ.get("QWEN_REWRITER_API_KEY", "")
REWRITER_TIMEOUT = float(os.environ.get("QWEN_REWRITER_TIMEOUT", "30"))

EDIT_REWRITER_SYSTEM_PROMPT = """# Edit Instruction Rewriter
You are a professional edit instruction rewriter. Your task is to generate a precise, concise, and visually achievable professional-level edit instruction based on the user-provided instruction and the image to be edited.  

Please strictly follow the rewriting rules below:

## 1. General Principles
- Keep the rewritten prompt **concise**. Avoid overly long sentences and reduce unnecessary descriptive language.  
- If the instruction is contradictory, vague, or unachievable, prioritize reasonable inference and correction, and supplement details when necessary.  
- Keep the core intention of the original instruction unchanged, only enhancing its clarity, rationality, and visual feasibility.  
- All added objects or modifications must align with the logic and style of the edited input image’s overall scene.  

## 2. Task Type Handling Rules
### 1. Add, Delete, Replace Tasks
- If the instruction is clear (already includes task type, target entity, position, quantity, attributes), preserve the original intent and only refine the grammar.  
- If the description is vague, supplement with minimal but sufficient details (category, color, size, orientation, position, etc.).  

For example:
> Original: "Add an animal"
> Rewritten: "Add a light-gray cat in the bottom-right corner, sitting and facing the camera"

- Remove meaningless instructions: e.g., "Add 0 objects" should be ignored or flagged as invalid.  
- For replacement tasks, specify "Replace Y with X" and briefly describe the key visual features of X.  

### 2. Text Editing Tasks
- All text content must be enclosed in English double quotes `" "`.  
- Do not translate or alter the original language of the text, and do not change the capitalization.  
- **For text replacement tasks, always use the fixed template:**  
  - `Replace "xx" to "yy"`.  
  - `Replace the xx bounding box to "yy"`.  
- If the user does not specify text content, infer and add concise text based on the instruction and the input image’s context.  

For example:
> Original: "Add a line of text" (poster)
> Rewritten: "Add text "LIMITED EDITION" at the top center with slight shadow"

- Specify text position, color, and layout in a concise way.  

### 3. Human Editing Tasks
- Maintain the person’s core visual consistency (ethnicity, gender, age, hairstyle, expression, outfit, etc.).  
- If modifying appearance (e.g., clothes, hairstyle), ensure the new element is consistent with the original style.  
- **For expression changes, they must be natural and subtle, never exaggerated.**  
- If deletion is not specifically emphasized, the most important subject in the original image (e.g., a person, an animal) should be preserved.  
- For background change tasks, emphasize maintaining subject consistency at first.  

Example:
> Original: "Change the person’s hat"
> Rewritten: "Replace the man’s hat with a dark brown beret; keep smile, short hair, and gray jacket unchanged"

### 4. Style Transformation or Enhancement Tasks
- If a style is specified, describe it concisely with key visual traits.  

For example:
> Original: "Disco style"
> Rewritten: "1970s disco: flashing lights, disco ball, mirrored walls, colorful tones"

- If the instruction says "use reference style" or "keep current style," analyze the input image, extract main features (color, composition, texture, lighting, art style), and integrate them into the prompt.  
- **For coloring tasks, including restoring old photos, always use the fixed template:**  
  "Restore old photograph, remove scratches, reduce noise, enhance details, high resolution, realistic, natural skin tones, clear facial features, no distortion, vintage photo restoration"

- If there are other changes, place the style description at the end.  

## 3. Rationality and Logic Checks
- Resolve contradictory instructions: e.g., "Remove all trees but keep all trees" should be logically corrected.  
- Add missing key information: if position is unspecified, choose a reasonable area based on composition (near subject, empty space, center/edges).  

# Output Format Example
```json
{ "Rewritten": "..." }
```
"""

_pipeline: Optional[QwenImageEditPlusPipeline] = None


def get_dtype():
    dtype_env = os.environ.get("QWEN_DTYPE", "bf16").lower()
    if dtype_env == "fp16":
        return torch.float16
    if dtype_env == "bf16":
        return torch.bfloat16
    return torch.float16


def load_pipeline() -> QwenImageEditPlusPipeline:
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available. Install CUDA-enabled PyTorch and an NVIDIA GPU driver.")

    dtype = get_dtype()
    _pipeline = QwenImageEditPlusPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=dtype
    )

    _pipeline.enable_model_cpu_offload()
    _pipeline.enable_vae_slicing()
    _pipeline.enable_attention_slicing()

    return _pipeline


def extract_rewritten(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "Rewritten" in parsed:
            return str(parsed["Rewritten"]).strip()
    except json.JSONDecodeError:
        return cleaned
    return cleaned


async def maybe_rewrite_prompt(prompt: str) -> str:
    if not REWRITE_ENABLED:
        return prompt
    if not (REWRITER_API_BASE and REWRITER_MODEL and REWRITER_API_KEY):
        return prompt

    payload = {
        "model": REWRITER_MODEL,
        "messages": [
            {"role": "system", "content": EDIT_REWRITER_SYSTEM_PROMPT},
            {"role": "user", "content": f"User Input: {prompt}\n\nRewritten Prompt:"}
        ],
        "temperature": 0.2
    }

    headers = {
        "Authorization": f"Bearer {REWRITER_API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=REWRITER_TIMEOUT) as client:
        response = await client.post(f"{REWRITER_API_BASE}/v1/chat/completions", json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return extract_rewritten(content)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "cuda": torch.cuda.is_available(),
        "model": MODEL_ID
    }


@app.post("/edit")
async def edit_image(
    prompt: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    subject_description: Optional[str] = Form(None),
    base_image: UploadFile = File(...),
    reference_images: List[UploadFile] = File(...),
    height: Optional[int] = Form(None),
    width: Optional[int] = Form(None),
    steps: Optional[int] = Form(None),
    true_cfg_scale: Optional[float] = Form(None),
    guidance_scale: Optional[float] = Form(None),
    seed: Optional[int] = Form(None)
):
    pipe = load_pipeline()

    if not reference_images:
        raise HTTPException(status_code=400, detail="reference_images is required.")

    base = Image.open(io.BytesIO(await base_image.read())).convert("RGB")
    refs = [Image.open(io.BytesIO(await f.read())).convert("RGB") for f in reference_images]

    images = [base] + refs

    height = height or DEFAULT_HEIGHT
    width = width or DEFAULT_WIDTH
    steps = steps or DEFAULT_STEPS
    true_cfg_scale = true_cfg_scale or DEFAULT_TRUE_CFG
    guidance_scale = guidance_scale if guidance_scale is not None else DEFAULT_GUIDANCE

    generator = torch.Generator(device="cuda")
    if seed is not None:
        generator = generator.manual_seed(seed)

    mode = (mode or DEFAULT_MODE).lower()

    if mode == "best_take":
        subject_line = f"The target person is: {subject_description}." if subject_description else "The target person is the one matching the reference face."
        base_prompt = (
            "Replace only the target person's facial expression with the reference face expression. "
            "Preserve identity (face shape, eyes, nose, skin tone, hair, facial hair, glasses), "
            "pose, lighting, and background. Keep all other people unchanged. "
            "Make the expression natural and subtle, photorealistic, no exaggeration. "
            f"{subject_line}"
        )
    else:
        if not prompt:
            raise HTTPException(status_code=400, detail="prompt is required when mode is not best_take.")
        base_prompt = prompt

    rewritten = await maybe_rewrite_prompt(base_prompt)

    result = pipe(
        image=images,
        prompt=rewritten,
        height=height,
        width=width,
        num_inference_steps=steps,
        true_cfg_scale=true_cfg_scale,
        guidance_scale=guidance_scale,
        generator=generator
    )

    output = result.images[0]
    buffer = io.BytesIO()
    output.save(buffer, format="PNG")
    return Response(content=buffer.getvalue(), media_type="image/png")


if __name__ == "__main__":
    import uvicorn

    preload = os.environ.get("QWEN_PRELOAD", "1")
    if preload == "1":
        load_pipeline()

    uvicorn.run(app, host="127.0.0.1", port=8001)
