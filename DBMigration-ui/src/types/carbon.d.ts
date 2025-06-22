
import '@carbon/react';

declare module '@carbon/react' {
  export interface HeaderProps {
    'aria-label'?: string;
    children?: React.ReactNode;
    className?: string;
  }
  
  export interface HeaderMenuButtonProps {
    'aria-label': string;
    onClick: () => void;
    isActive: boolean;
  }
  
  export interface HeaderNameProps {
    prefix?: string;
    href?: string;
    children?: React.ReactNode;
  }
  
  export interface HeaderNavigationProps {
    'aria-label': string;
    children?: React.ReactNode;
  }
  
  export interface HeaderMenuProps {
    'aria-label': string;
    menuLinkName: string;
    children?: React.ReactNode;
  }
  
  export interface HeaderMenuItemProps {
    children?: React.ReactNode;
    onClick?: () => void;
  }
  
  export interface HeaderGlobalBarProps {
    children?: React.ReactNode;
  }
  
  export interface HeaderGlobalActionProps {
    'aria-label': string;
    onClick: () => void;
    tooltipAlignment?: 'start' | 'center' | 'end';
    children?: React.ReactNode;
  }
}
