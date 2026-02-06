import { create } from 'zustand';
import { Photo, FaceGroup, FaceSelection, ProcessingStage } from '@/types';

interface AppState {
    // API Key
    apiKey: string | null;
    setApiKey: (key: string) => void;
    clearApiKey: () => void;

    // Photos
    photos: Photo[];
    addPhotos: (newPhotos: Photo[]) => void;
    removePhoto: (id: string) => void;
    clearPhotos: () => void;

    // Faces
    faceGroups: FaceGroup[];
    setFaceGroups: (groups: FaceGroup[]) => void;

    // Selection & History
    currentSelection: FaceSelection | null;
    undoStack: FaceSelection[];
    redoStack: FaceSelection[];

    initializeSelection: (basePhotoId: string, groups: FaceGroup[]) => void;
    selectFace: (personId: string, faceId: string) => void;
    setBasePhoto: (photoId: string) => void;
    undo: () => void;
    redo: () => void;

    // Composite
    compositeUrl: string | null;
    setCompositeUrl: (url: string | null) => void;

    // UI State
    processingStage: ProcessingStage;
    setProcessingStage: (stage: ProcessingStage) => void;
    error: string | null;
    setError: (error: string | null) => void;
    isComparing: boolean;
    setComparing: (comparing: boolean) => void;

    // Reset
    reset: () => void;
    // Hydration
    initialize: () => void;
}

// Custom storage object to handle SSR
const customStorage = {
    getItem: (name: string) => {
        try {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem(name);
        } catch {
            return null;
        }
    },
    setItem: (name: string, value: string) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(name, value);
            }
        } catch {
            // ignore
        }
    },
    removeItem: (name: string) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(name);
            }
        } catch {
            // ignore
        }
    },
};

export const useAppStore = create<AppState>((set, get) => ({
    apiKey: null, // Start with null for SSR consistency

    // Hydrate after mount
    initialize: () => {
        const key = customStorage.getItem('gemini_api_key');
        if (key) set({ apiKey: key });
    },

    setApiKey: (key) => {
        customStorage.setItem('gemini_api_key', key);
        set({ apiKey: key });
    },

    clearApiKey: () => {
        customStorage.removeItem('gemini_api_key');
        set({ apiKey: null });
    },

    photos: [],
    addPhotos: (newPhotos) => set((state) => ({
        photos: [...state.photos, ...newPhotos]
    })),
    removePhoto: (id) => set((state) => {
        const photo = state.photos.find((p) => p.id === id);
        if (photo) URL.revokeObjectURL(photo.url);
        return { photos: state.photos.filter((p) => p.id !== id) };
    }),
    clearPhotos: () => set((state) => {
        for (const photo of state.photos) {
            URL.revokeObjectURL(photo.url);
        }
        if (state.compositeUrl) {
            URL.revokeObjectURL(state.compositeUrl);
        }
        return { photos: [], faceGroups: [], currentSelection: null, compositeUrl: null };
    }),

    faceGroups: [],
    setFaceGroups: (groups) => set({ faceGroups: groups }),

    currentSelection: null,
    undoStack: [],
    redoStack: [],

    initializeSelection: (basePhotoId, groups) => {
        const selectedFaces: Record<string, string> = {};
        for (const group of groups) {
            selectedFaces[group.personId] = group.bestFaceId;
        }

        set({
            currentSelection: {
                basePhotoId,
                selectedFaces,
                timestamp: new Date()
            },
            undoStack: [],
            redoStack: []
        });
    },

    selectFace: (personId, faceId) => {
        const { currentSelection, undoStack } = get();
        if (!currentSelection) return;

        // Push current to undo stack
        const newUndoStack = [...undoStack, currentSelection];

        const newSelection = {
            ...currentSelection,
            selectedFaces: {
                ...currentSelection.selectedFaces,
                [personId]: faceId
            },
            timestamp: new Date()
        };

        set({
            undoStack: newUndoStack,
            redoStack: [], // clearing redo stack on new action
            currentSelection: newSelection
        });
    },

    setBasePhoto: (photoId) => {
        const { currentSelection } = get();
        if (!currentSelection) return;
        if (currentSelection.basePhotoId === photoId) return;

        set({
            currentSelection: {
                ...currentSelection,
                basePhotoId: photoId,
                timestamp: new Date()
            }
        });
    },

    undo: () => {
        const { undoStack, redoStack, currentSelection } = get();
        if (undoStack.length === 0 || !currentSelection) return;

        const previous = undoStack[undoStack.length - 1];
        set({
            undoStack: undoStack.slice(0, -1),
            redoStack: [...redoStack, currentSelection],
            currentSelection: previous
        });
    },

    redo: () => {
        const { undoStack, redoStack, currentSelection } = get();
        if (redoStack.length === 0 || !currentSelection) return;

        const next = redoStack[redoStack.length - 1];
        set({
            redoStack: redoStack.slice(0, -1),
            undoStack: [...undoStack, currentSelection],
            currentSelection: next
        });
    },

    compositeUrl: null,
    setCompositeUrl: (url) => set((state) => {
        if (state.compositeUrl && state.compositeUrl !== url) {
            URL.revokeObjectURL(state.compositeUrl);
        }
        return { compositeUrl: url };
    }),

    processingStage: 'idle',
    setProcessingStage: (stage) => set({ processingStage: stage }),

    error: null,
    setError: (error) => set({ error }),

    isComparing: false,
    setComparing: (isComparing) => set({ isComparing }),

    reset: () => set((state) => {
        for (const photo of state.photos) {
            URL.revokeObjectURL(photo.url);
        }
        if (state.compositeUrl) {
            URL.revokeObjectURL(state.compositeUrl);
        }
        return {
            photos: [],
            faceGroups: [],
            currentSelection: null,
            undoStack: [],
            redoStack: [],
            processingStage: 'idle',
            error: null,
            compositeUrl: null
        };
    })
}));
