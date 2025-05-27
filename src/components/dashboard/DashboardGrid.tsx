'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div
      className={cn(
        // Base grid layout
        'grid gap-6',
        // Responsive columns
        'grid-cols-1',           // Mobile: 1 column (320px-480px)
        'sm:grid-cols-2',        // Small tablet: 2 columns (481px-768px)
        'lg:grid-cols-3',        // Laptop: 3 columns (769px-1024px)
        'xl:grid-cols-4',        // Desktop: 4 columns (1025px+)
        '2xl:grid-cols-5',       // Large desktop: 5 columns (1536px+)
        // Container spacing
        'w-full',
        'px-4 sm:px-6 lg:px-8',
        'py-6',
        // Auto-fit for very large screens
        'auto-rows-fr',
        className
      )}
    >
      {children}
    </div>
  );
}

interface DashboardContainerProps {
  children: ReactNode;
  className?: string;
}

export function DashboardContainer({ children, className }: DashboardContainerProps) {
  return (
    <div
      className={cn(
        // Container constraints
        'max-w-7xl mx-auto',
        // Responsive padding
        'px-4 sm:px-6 lg:px-8',
        'py-6 sm:py-8',
        className
      )}
    >
      {children}
    </div>
  );
}

interface DashboardSectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function DashboardSection({ 
  children, 
  title, 
  subtitle, 
  action, 
  className 
}: DashboardSectionProps) {
  return (
    <section className={cn('space-y-6', className)}>
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

interface GridItemProps {
  children: ReactNode;
  className?: string;
  span?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function GridItem({ children, className, span }: GridItemProps) {
  const spanClasses = [];
  
  if (span?.sm) spanClasses.push(`sm:col-span-${span.sm}`);
  if (span?.md) spanClasses.push(`md:col-span-${span.md}`);
  if (span?.lg) spanClasses.push(`lg:col-span-${span.lg}`);
  if (span?.xl) spanClasses.push(`xl:col-span-${span.xl}`);

  return (
    <div className={cn(spanClasses.join(' '), className)}>
      {children}
    </div>
  );
}

// Skeleton loader for grid items
export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <DashboardGrid>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
        >
          {/* Image skeleton */}
          <div className="w-full h-48 bg-gray-200 rounded-lg mb-4" />
          
          {/* Title skeleton */}
          <div className="h-6 bg-gray-200 rounded mb-2" />
          
          {/* Subtitle skeleton */}
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
          
          {/* Tags skeleton */}
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-20" />
          </div>
          
          {/* Action buttons skeleton */}
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-24" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded" />
              <div className="h-8 w-8 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </DashboardGrid>
  );
}

// Empty state component
interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && (
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}

// Responsive breakpoint utilities
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Grid configuration for different screen sizes
export const gridConfig = {
  mobile: {
    columns: 1,
    gap: '1rem',
    padding: '1rem',
  },
  tablet: {
    columns: 2,
    gap: '1.5rem',
    padding: '1.5rem',
  },
  laptop: {
    columns: 3,
    gap: '1.5rem',
    padding: '2rem',
  },
  desktop: {
    columns: 4,
    gap: '1.5rem',
    padding: '2rem',
  },
  largeDesktop: {
    columns: 5,
    gap: '1.5rem',
    padding: '2rem',
  },
} as const; 