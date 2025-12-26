export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    active: number;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}