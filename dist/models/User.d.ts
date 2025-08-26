export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
}
export interface CreateUserData {
    username: string;
    email: string;
    password: string;
}
export declare class UserModel {
    static create(userData: CreateUserData): Promise<User>;
    static findByUsername(username: string): Promise<User | null>;
    static findByEmail(email: string): Promise<User | null>;
    static findById(id: number): Promise<User | null>;
    static verifyPassword(user: User, password: string): Promise<boolean>;
    static updatePassword(userId: number, newPassword: string): Promise<void>;
}
//# sourceMappingURL=User.d.ts.map