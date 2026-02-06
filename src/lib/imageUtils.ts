export async function resizeImage(file: File, maxSize: number = 2048): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

    if (scale === 1) {
        bitmap.close?.();
        return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Canvas to Blob failed'));
            resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            }));
            bitmap.close?.();
        }, 'image/jpeg', 0.85);
    });
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix usually (data:image/jpeg;base64,)
            const base64Clean = base64.split(',')[1];
            resolve(base64Clean);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
    });
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.92): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Canvas to Blob failed'));
            resolve(blob);
        }, 'image/jpeg', quality);
    });
}

export async function cropBoundingBoxToBlob(
    imageUrl: string,
    box: { x: number; y: number; width: number; height: number },
    padding: number = 0.2,
    quality: number = 0.95
): Promise<Blob> {
    const img = await loadImage(imageUrl);
    const imgW = img.width;
    const imgH = img.height;

    const padX = box.width * padding;
    const padY = box.height * padding;

    const nx = clamp(box.x - padX, 0, 1);
    const ny = clamp(box.y - padY, 0, 1);
    const nw = clamp(box.width + padX * 2, 0.02, 1 - nx);
    const nh = clamp(box.height + padY * 2, 0.02, 1 - ny);

    const sx = Math.round(nx * imgW);
    const sy = Math.round(ny * imgH);
    const sw = Math.max(1, Math.round(nw * imgW));
    const sh = Math.max(1, Math.round(nh * imgH));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvasToBlob(canvas, quality);
}
