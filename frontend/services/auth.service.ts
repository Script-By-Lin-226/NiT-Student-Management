import { api } from "./api";

export interface PublicCourse {
  course_code: string;
  course_name: string;
}

export class AuthService {
  static async listCourses(): Promise<PublicCourse[]> {
    const res = await api.get<{ data: PublicCourse[] }>("/auth/courses");
    return res.data.data;
  }

  static async register(payload: any): Promise<any> {
    const res = await api.post("/auth/register", payload);
    return res.data;
  }

  static async login(payload: any): Promise<{
    access_token: string;
    role: string;
    user_code: string;
    username?: string;
    profile_picture?: string;
  }> {
    const res = await api.post("/auth/login", payload);
    return res.data;
  }

  static async logout(): Promise<void> {
    await api.post("/auth/logout");
  }
}
