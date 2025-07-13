'use client';

import { cn } from '@/lib/utils';
import { VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const spinnerVariants = cva(
  'animate-spin text-primary',
  {
    variants: {
      size: {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        className={cn(spinnerVariants({ size, className }))}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        {...props}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }
);

Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };