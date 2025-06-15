export interface ResponseFormat<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}
