'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Heart, 
  Share2, 
  MoreHorizontal, 
  Edit, 
  Copy, 
  Trash2, 
  Eye,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Itinerary, 
  formatCurrency, 
  formatDateRange, 
  getDurationText 
} from '@/lib/mockDataService';

interface ItineraryCardProps {
  itinerary: Itinerary;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  className?: string;
  showActions?: boolean;
}

export function ItineraryCard({
  itinerary,
  onEdit,
  onDuplicate,
  onDelete,
  onShare,
  onToggleFavorite,
  className,
  showActions = true
}: ItineraryCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(itinerary.id);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleActionClick = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    action();
  };

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800'
  };

  return (
    <div
      className={cn(
        'group relative bg-white rounded-lg border border-gray-200 shadow-sm',
        'hover:shadow-md hover:border-gray-300 transition-all duration-200',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
        className
      )}
    >
      {/* Card Link Wrapper */}
      <Link 
        href={`/itinerary/${itinerary.id}`}
        className="block focus:outline-none"
        tabIndex={0}
        aria-label={`View ${itinerary.title} itinerary`}
      >
        {/* Image Container */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-gray-100">
          {!imageError ? (
            <Image
              src={itinerary.thumbnail}
              alt={`${itinerary.destination} - ${itinerary.title}`}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              onError={() => setImageError(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-200">
              <MapPin className="h-12 w-12 text-gray-400" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              statusColors[itinerary.status]
            )}>
              {itinerary.status.charAt(0).toUpperCase() + itinerary.status.slice(1)}
            </span>
          </div>

          {/* Favorite Button */}
          {showActions && (
            <button
              onClick={handleFavoriteClick}
              className={cn(
                'absolute top-3 right-3 p-2 rounded-full transition-colors',
                'bg-white/80 hover:bg-white shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
              aria-label={itinerary.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart 
                className={cn(
                  'h-4 w-4 transition-colors',
                  itinerary.isFavorite 
                    ? 'fill-red-500 text-red-500' 
                    : 'text-gray-600 hover:text-red-500'
                )}
              />
            </button>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-3">
          {/* Title and Destination */}
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {itinerary.title}
            </h3>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {itinerary.destination}
            </p>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {itinerary.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {itinerary.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
              >
                {tag}
              </span>
            ))}
            {itinerary.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600">
                +{itinerary.tags.length - 3}
              </span>
            )}
          </div>

          {/* Trip Details */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDateRange(itinerary.startDate, itinerary.endDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{getDurationText(itinerary.duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{itinerary.travelers} {itinerary.travelers === 1 ? 'traveler' : 'travelers'}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>{formatCurrency(itinerary.budget.total, itinerary.budget.currency)}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Action Menu */}
      {showActions && (
        <div className="absolute bottom-4 right-4">
          <div className="relative">
            <button
              onClick={handleMenuClick}
              className={cn(
                'p-2 rounded-full bg-white border border-gray-200 shadow-sm',
                'hover:bg-gray-50 hover:shadow-md transition-all',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'opacity-0 group-hover:opacity-100'
              )}
              aria-label="More actions"
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-600" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setIsMenuOpen(false)}
                />
                
                {/* Menu */}
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button
                      onClick={handleActionClick(() => onEdit?.(itinerary.id))}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    
                    <button
                      onClick={handleActionClick(() => onDuplicate?.(itinerary.id))}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </button>
                    
                    <button
                      onClick={handleActionClick(() => onShare?.(itinerary.id))}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                    
                    <Link
                      href={`/itinerary/${itinerary.id}`}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                    
                    <hr className="my-1" />
                    
                    <button
                      onClick={handleActionClick(() => onDelete?.(itinerary.id))}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact card variant for list views
interface CompactItineraryCardProps extends ItineraryCardProps {
  orientation?: 'horizontal' | 'vertical';
}

export function CompactItineraryCard({
  itinerary,
  orientation = 'horizontal',
  ...props
}: CompactItineraryCardProps) {
  if (orientation === 'horizontal') {
    return (
      <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <Image
            src={itinerary.thumbnail}
            alt={itinerary.title}
            fill
            className="object-cover rounded-l-lg"
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-gray-900 truncate">{itinerary.title}</h4>
              <p className="text-sm text-gray-600 truncate">{itinerary.destination}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDateRange(itinerary.startDate, itinerary.endDate)}
              </p>
            </div>
            
            {props.showActions && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  props.onToggleFavorite?.(itinerary.id);
                }}
                className="ml-2 p-1"
              >
                <Heart 
                  className={cn(
                    'h-4 w-4',
                    itinerary.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                  )}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <ItineraryCard itinerary={itinerary} {...props} />;
}

// Card skeleton for loading states
export function ItineraryCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 animate-pulse">
      <div className="aspect-[4/3] bg-gray-200 rounded-t-lg" />
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-16" />
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
} 