import { ReactElement } from "react";

export default interface ModalProps {
    open: boolean;
    title: String;
    onSave: () => void;
    onClose: () => void;
    children: ReactElement;
}