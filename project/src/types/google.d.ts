import '@types/google.accounts';

// Extend the existing Google types if needed
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: {
              credential: string;
              select_by?: string;
              [key: string]: any;
            }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            prompt_parent_id?: string;
            nonce?: string;
            context?: string;
            state_cookie_domain?: string;
            [key: string]: any;
          }) => void;
          prompt: (momentListener?: (promptMomentNotification: {
            isDisplayMoment: () => boolean;
            isDisplayed: () => boolean;
            getNotDisplayedReason: () => string;
            isSkippedMoment: () => boolean;
            getSkippedReason: () => string;
            isDismissedMoment: () => boolean;
            getDismissedReason: () => string;
            getMomentType: () => string;
          }) => void) => void;
          renderButton: (
            element: HTMLElement | null,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'small' | 'medium' | 'large';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
              [key: string]: any;
            }
          ) => void;
          disableAutoSelect: () => void;
          storeCredential: (credential: {id: string; password: string}, callback?: () => void) => void;
          cancel: () => void;
          revoke: (hint: string, callback?: (response: {successful: boolean; error: string}) => void) => void;
        };
        oauth2: {
          // Add oauth2 typings if needed
        };
      };
      // Other Google APIs can be added here
    };
  }
}