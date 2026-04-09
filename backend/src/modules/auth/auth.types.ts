export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantName?: string;
  tenantSlug?: string;
}

export interface SignupOtpSendRequest {
  email: string;
  channel?: 'email';
}

export interface SignupOtpVerifyRequest extends SignupOtpSendRequest {
  otp: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  companyName: string;
  companyType: 'individual' | 'startup' | 'sme' | 'enterprise';
  phone: string;
  country: string;
  plan: 'basic' | 'standard' | 'premium';
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  employee?: {
    id: string;
    role: {
      id: string;
      name: string;
    };
    department?: string;
    position?: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan?: string;
    companyType?: string;
    country?: string;
    onboardingCompleted?: boolean;
    availableModules?: string[];
    availableFeatures?: string[];
    enabledModules?: string[];
    enabledFeatures?: string[];
  };
  token?: string;
  tokens: TokenResponse;
  permissions: string[];
  sidebarModules: string[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Re-export validator types
export type { 
  LoginInput, 
  RegisterInput, 
  SignupInput,
  SignupOtpSendInput,
  SignupOtpVerifyInput,
  RefreshTokenInput, 
  ChangePasswordInput 
} from './auth.validators';
