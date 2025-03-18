import { User } from "./User.Interface";

export default interface HeaderInterface {
    user?: User;
    onClick: () => void;
}