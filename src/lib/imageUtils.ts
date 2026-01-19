export async function resizeImage(file: File, maxSize: number = 2048): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

    if (scale === 1) return file;

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
        }, 'image/jpeg', 0.85);
    });
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
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
