declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    NODE_ENV?: string;
    DATABASE_URL?: string;
    JWT_SECRET?: string;
    JWT_EXPIRES_IN?: string;
    JWT_REFRESH_SECRET?: string;
    JWT_REFRESH_EXPIRES_IN?: string;
    CORS_ORIGIN?: string;
  }
}

declare module 'config' {
  interface Config {
    app: {
      port: number;
      env: string;
      jwtSecret: string;
      jwtExpiresIn: string;
      jwtRefreshSecret: string;
      jwtRefreshExpiresIn: string;
    };
    db: {
      url: string;
    };
    cors: {
      origin: string;
    };
  }
} 