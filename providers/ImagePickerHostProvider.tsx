import React, { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react';
import { ImagePickerSheet } from '../components/ui/ImagePickerSheet';
import { ImageSource } from '../services/ImageUploadService.Service';

interface ImagePickerHostContextType {
    requestImageSource: () => Promise<ImageSource | null>;
}

const ImagePickerHostContext = createContext<ImagePickerHostContextType | undefined>(undefined);

// Renders the single shared ImagePickerSheet here, above every navigator screen, so
// any screen can trigger it via useImagePickerHost() without mounting its own copy.
// (ImagePickerSheet itself avoids RN's native <Modal> - see that file for why.)
export function ImagePickerHostProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(false);
    const resolver = useRef<((source: ImageSource | null) => void) | null>(null);

    const requestImageSource = useCallback((): Promise<ImageSource | null> => {
        return new Promise(resolve => {
            resolver.current = resolve;
            setVisible(true);
        });
    }, []);

    const resolveAndClose = useCallback((source: ImageSource | null) => {
        setVisible(false);
        resolver.current?.(source);
        resolver.current = null;
    }, []);

    return (
        <ImagePickerHostContext.Provider value={{ requestImageSource }}>
            {children}
            <ImagePickerSheet
                visible={visible}
                onSelect={source => resolveAndClose(source)}
                onCancel={() => resolveAndClose(null)}
            />
        </ImagePickerHostContext.Provider>
    );
}

export function useImagePickerHost() {
    const context = useContext(ImagePickerHostContext);
    if (!context) {
        throw new Error('useImagePickerHost must be used within an ImagePickerHostProvider');
    }
    return context;
}
