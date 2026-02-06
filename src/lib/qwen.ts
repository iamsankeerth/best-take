export interface QwenEditOptions {
    mode?: 'best_take' | 'custom';
    prompt?: string;
    subjectDescription?: string;
    width?: number;
    height?: number;
    steps?: number;
    trueCfgScale?: number;
    guidanceScale?: number;
    seed?: number;
}

const DEFAULT_URL = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_QWEN_EDIT_URL
    ? process.env.NEXT_PUBLIC_QWEN_EDIT_URL
    : 'http://127.0.0.1:8001/edit';

export async function editWithQwen(
    baseImage: Blob,
    referenceImages: Blob[],
    options: QwenEditOptions = {}
): Promise<Blob> {
    const form = new FormData();
    form.append('base_image', baseImage, 'base.png');
    for (let i = 0; i < referenceImages.length; i += 1) {
        form.append('reference_images', referenceImages[i], `ref-${i + 1}.png`);
    }

    if (options.mode) form.append('mode', options.mode);
    if (options.prompt) form.append('prompt', options.prompt);
    if (options.subjectDescription) form.append('subject_description', options.subjectDescription);
    if (options.width) form.append('width', String(options.width));
    if (options.height) form.append('height', String(options.height));
    if (options.steps) form.append('steps', String(options.steps));
    if (options.trueCfgScale) form.append('true_cfg_scale', String(options.trueCfgScale));
    if (options.guidanceScale !== undefined) form.append('guidance_scale', String(options.guidanceScale));
    if (options.seed !== undefined) form.append('seed', String(options.seed));

    let response: Response;
    try {
        response = await fetch(DEFAULT_URL, {
            method: 'POST',
            body: form
        });
    } catch (err) {
        console.error('Qwen edit service not reachable', err);
        throw new Error('Qwen edit service is not reachable. Start qwen_edit_service\\run_server.cmd and wait for the server to be ready.');
    }

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Qwen edit failed: ${response.status} ${detail}`);
    }

    return response.blob();
}
