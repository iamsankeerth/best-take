import { FaceGroup, FaceSelection, Photo, BoundingBox, FaceLandmarks } from '@/types';
import { canvasToBlob, clamp, loadImage } from '@/lib/imageUtils';

export interface CompositeOptions {
    padding?: number;
    feather?: number;
    quality?: number;
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

const defaultOptions: Required<CompositeOptions> = {
    padding: 0.35,
    feather: 0.45,
    quality: 0.92
};

function expandBoundingBox(box: BoundingBox, imgW: number, imgH: number, padding: number): Rect {
    const x = box.x * imgW;
    const y = box.y * imgH;
    const w = box.width * imgW;
    const h = box.height * imgH;

    const padX = w * padding;
    const padY = h * padding;

    let nx = x - padX;
    let ny = y - padY;
    let nw = w + padX * 2;
    let nh = h + padY * 2;

    if (nx < 0) {
        nw += nx;
        nx = 0;
    }
    if (ny < 0) {
        nh += ny;
        ny = 0;
    }
    if (nx + nw > imgW) nw = imgW - nx;
    if (ny + nh > imgH) nh = imgH - ny;

    return {
        x: clamp(nx, 0, imgW),
        y: clamp(ny, 0, imgH),
        width: clamp(nw, 1, imgW),
        height: clamp(nh, 1, imgH)
    };
}

function applyEllipticalMask(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    feather: number
) {
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const mctx = mask.getContext('2d');
    if (!mctx) return;

    const inner = Math.max(0.01, 1 - feather);

    mctx.save();
    mctx.translate(centerX, centerY);
    mctx.scale(radiusX, radiusY);

    const gradient = mctx.createRadialGradient(0, 0, inner, 0, 0, 1);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    mctx.fillStyle = gradient;
    mctx.beginPath();
    mctx.arc(0, 0, 1, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
}

function toPixelPoint(point: { x: number; y: number }, imgW: number, imgH: number) {
    return { x: point.x * imgW, y: point.y * imgH };
}

function getLandmarkPoint(landmarks: FaceLandmarks | undefined, key: keyof FaceLandmarks, imgW: number, imgH: number) {
    if (!landmarks) return null;
    return toPixelPoint(landmarks[key], imgW, imgH);
}

function computeEllipseMean(
    imageData: ImageData,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number
) {
    const data = imageData.data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    const rx2 = radiusX * radiusX;
    const ry2 = radiusY * radiusY;
    const step = 2;

    for (let y = 0; y < height; y += step) {
        const dy = y - centerY;
        for (let x = 0; x < width; x += step) {
            const dx = x - centerX;
            if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1) {
                const idx = (y * width + x) * 4;
                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
                count += 1;
            }
        }
    }

    if (count === 0) return { r: 0, g: 0, b: 0 };
    return { r: r / count, g: g / count, b: b / count };
}

function applyColorMatch(
    tempCtx: CanvasRenderingContext2D,
    baseCtx: CanvasRenderingContext2D,
    destRect: Rect,
    faceCenterX: number,
    faceCenterY: number,
    sampleRadiusX: number,
    sampleRadiusY: number
) {
    const baseImage = baseCtx.getImageData(
        Math.max(0, Math.round(destRect.x)),
        Math.max(0, Math.round(destRect.y)),
        Math.max(1, Math.round(destRect.width)),
        Math.max(1, Math.round(destRect.height))
    );
    const tempImage = tempCtx.getImageData(0, 0, Math.round(destRect.width), Math.round(destRect.height));

    const localCenterX = faceCenterX - destRect.x;
    const localCenterY = faceCenterY - destRect.y;

    const meanSrc = computeEllipseMean(tempImage, tempImage.width, tempImage.height, localCenterX, localCenterY, sampleRadiusX, sampleRadiusY);
    const meanDst = computeEllipseMean(baseImage, baseImage.width, baseImage.height, localCenterX, localCenterY, sampleRadiusX, sampleRadiusY);

    const gainR = meanSrc.r > 1 ? meanDst.r / meanSrc.r : 1;
    const gainG = meanSrc.g > 1 ? meanDst.g / meanSrc.g : 1;
    const gainB = meanSrc.b > 1 ? meanDst.b / meanSrc.b : 1;

    const data = tempImage.data;
    const rx2 = sampleRadiusX * sampleRadiusX;
    const ry2 = sampleRadiusY * sampleRadiusY;
    const width = tempImage.width;
    const height = tempImage.height;

    for (let y = 0; y < height; y++) {
        const dy = y - localCenterY;
        for (let x = 0; x < width; x++) {
            const dx = x - localCenterX;
            if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1) {
                const idx = (y * width + x) * 4;
                data[idx] = clamp(Math.round(data[idx] * gainR), 0, 255);
                data[idx + 1] = clamp(Math.round(data[idx + 1] * gainG), 0, 255);
                data[idx + 2] = clamp(Math.round(data[idx + 2] * gainB), 0, 255);
            }
        }
    }

    tempCtx.putImageData(tempImage, 0, 0);
}

export async function buildCompositeImage(
    photos: Photo[],
    faceGroups: FaceGroup[],
    selection: FaceSelection,
    options: CompositeOptions = {}
): Promise<Blob> {
    const { padding, feather, quality } = { ...defaultOptions, ...options };

    const basePhoto = photos.find((p) => p.id === selection.basePhotoId);
    if (!basePhoto) throw new Error('Base photo not found');

    const imageCache = new Map<string, HTMLImageElement>();
    const getImage = async (photo: Photo) => {
        if (imageCache.has(photo.id)) return imageCache.get(photo.id)!;
        const img = await loadImage(photo.url);
        imageCache.set(photo.id, img);
        return img;
    };

    const baseImage = await getImage(basePhoto);

    const canvas = document.createElement('canvas');
    canvas.width = basePhoto.width;
    canvas.height = basePhoto.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    const photoById = new Map(photos.map((p) => [p.id, p]));

    for (const group of faceGroups) {
        const selectedFaceId = selection.selectedFaces[group.personId] || group.bestFaceId;
        const selectedFace = group.faces.find((f) => f.id === selectedFaceId);
        const baseFace = group.faces.find((f) => f.photoId === basePhoto.id);

        if (!selectedFace || !baseFace) continue;
        if (selectedFace.photoId === basePhoto.id) continue;

        const srcPhoto = photoById.get(selectedFace.photoId);
        if (!srcPhoto) continue;

        const srcImage = await getImage(srcPhoto);

        const srcRect = expandBoundingBox(selectedFace.boundingBox, srcPhoto.width, srcPhoto.height, padding);
        const destRect = expandBoundingBox(baseFace.boundingBox, basePhoto.width, basePhoto.height, padding);

        const srcLeft = getLandmarkPoint(selectedFace.landmarks, 'leftEye', srcPhoto.width, srcPhoto.height);
        const srcRight = getLandmarkPoint(selectedFace.landmarks, 'rightEye', srcPhoto.width, srcPhoto.height);
        const dstLeft = getLandmarkPoint(baseFace.landmarks, 'leftEye', basePhoto.width, basePhoto.height);
        const dstRight = getLandmarkPoint(baseFace.landmarks, 'rightEye', basePhoto.width, basePhoto.height);

        const srcCenterFallback = {
            x: srcRect.x + srcRect.width / 2,
            y: srcRect.y + srcRect.height / 2
        };
        const dstCenterFallback = {
            x: destRect.x + destRect.width / 2,
            y: destRect.y + destRect.height / 2
        };

        const srcCenter = srcLeft && srcRight
            ? { x: (srcLeft.x + srcRight.x) / 2, y: (srcLeft.y + srcRight.y) / 2 }
            : srcCenterFallback;
        const dstCenter = dstLeft && dstRight
            ? { x: (dstLeft.x + dstRight.x) / 2, y: (dstLeft.y + dstRight.y) / 2 }
            : dstCenterFallback;

        let rotation = 0;
        let scale = destRect.width / srcRect.width;

        if (srcLeft && srcRight && dstLeft && dstRight) {
            const srcDx = srcRight.x - srcLeft.x;
            const srcDy = srcRight.y - srcLeft.y;
            const dstDx = dstRight.x - dstLeft.x;
            const dstDy = dstRight.y - dstLeft.y;

            const srcDist = Math.hypot(srcDx, srcDy);
            const dstDist = Math.hypot(dstDx, dstDy);
            if (srcDist > 0 && dstDist > 0) {
                scale = dstDist / srcDist;
                rotation = Math.atan2(dstDy, dstDx) - Math.atan2(srcDy, srcDx);
            }
        }

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = Math.max(1, Math.round(destRect.width));
        tmpCanvas.height = Math.max(1, Math.round(destRect.height));
        const tctx = tmpCanvas.getContext('2d');
        if (!tctx) continue;

        tctx.save();
        tctx.translate(-destRect.x, -destRect.y);
        tctx.translate(dstCenter.x, dstCenter.y);
        tctx.rotate(rotation);
        tctx.scale(scale, scale);
        tctx.translate(-srcCenter.x, -srcCenter.y);
        tctx.drawImage(srcImage, 0, 0);
        tctx.restore();

        const baseFaceW = baseFace.boundingBox.width * basePhoto.width;
        const baseFaceH = baseFace.boundingBox.height * basePhoto.height;
        const faceCenterX = (baseFace.boundingBox.x + baseFace.boundingBox.width / 2) * basePhoto.width;
        const faceCenterY = (baseFace.boundingBox.y + baseFace.boundingBox.height / 2) * basePhoto.height;

        const sampleRadiusX = baseFaceW * 0.45;
        const sampleRadiusY = baseFaceH * 0.55;
        const maskRadiusX = baseFaceW * 0.65;
        const maskRadiusY = baseFaceH * 0.8;

        applyColorMatch(
            tctx,
            ctx,
            destRect,
            faceCenterX,
            faceCenterY,
            sampleRadiusX,
            sampleRadiusY
        );

        applyEllipticalMask(
            tctx,
            tmpCanvas.width,
            tmpCanvas.height,
            faceCenterX - destRect.x,
            faceCenterY - destRect.y,
            maskRadiusX,
            maskRadiusY,
            feather
        );

        ctx.drawImage(tmpCanvas, destRect.x, destRect.y);
    }

    return canvasToBlob(canvas, quality);
}
