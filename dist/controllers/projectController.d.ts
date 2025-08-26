import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const uploadProject: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProjects: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getProject: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getExtractedFiles: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const debugProjects: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteProject: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=projectController.d.ts.map