import React, { useState } from 'react';
import { X, Tag, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VersionTag } from '@/lib/versions/types';
import { operationUtils } from '@/lib/ot/utils';

export interface VersionTagModalProps {
  versionId: string;
  onTag: (versionId: string, tag: VersionTag) => boolean;
  onClose: () => void;
}

const PREDEFINED_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#10B981' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Gray', value: '#6B7280' },
];

const PREDEFINED_TAGS = [
  { label: 'Draft', color: '#F97316' },
  { label: 'Review', color: '#EAB308' },
  { label: 'Approved', color: '#10B981' },
  { label: 'Final', color: '#8B5CF6' },
  { label: 'Milestone', color: '#3B82F6' },
  { label: 'Backup', color: '#6B7280' },
  { label: 'Emergency', color: '#EF4444' },
  { label: 'Release', color: '#10B981' },
];

/**
 * Modal for adding tags to document versions
 */
export function VersionTagModal({
  versionId,
  onTag,
  onClose
}: VersionTagModalProps) {
  const [tagLabel, setTagLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0].value);
  const [customColor, setCustomColor] = useState('');
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredefinedTag = async (predefinedTag: { label: string; color: string }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const tag: VersionTag = {
        id: operationUtils.generateId(),
        label: predefinedTag.label,
        color: predefinedTag.color,
        createdBy: 'current-user', // This should come from auth context
        createdAt: new Date()
      };

      const success = onTag(versionId, tag);
      if (success) {
        onClose();
      } else {
        setError('Tag already exists or failed to add tag');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tagLabel.trim()) {
      setError('Tag label is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const finalColor = useCustomColor && customColor ? customColor : selectedColor;
      
      const tag: VersionTag = {
        id: operationUtils.generateId(),
        label: tagLabel.trim(),
        color: finalColor,
        createdBy: 'current-user', // This should come from auth context
        createdAt: new Date()
      };

      const success = onTag(versionId, tag);
      if (success) {
        onClose();
      } else {
        setError('Tag already exists or failed to add tag');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Add Version Tag
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Predefined Tags */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Tags</h4>
            <div className="grid grid-cols-2 gap-2">
              {PREDEFINED_TAGS.map((tag) => (
                <button
                  key={tag.label}
                  onClick={() => handlePredefinedTag(tag)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm">{tag.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tag Form */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Custom Tag</h4>
            <form onSubmit={handleCustomTag} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Label
                </label>
                <input
                  type="text"
                  value={tagLabel}
                  onChange={(e) => setTagLabel(e.target.value)}
                  placeholder="Enter tag name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                
                <div className="space-y-3">
                  {/* Predefined Colors */}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="predefined-color"
                      name="color-type"
                      checked={!useCustomColor}
                      onChange={() => setUseCustomColor(false)}
                    />
                    <label htmlFor="predefined-color" className="text-sm">
                      Predefined colors
                    </label>
                  </div>
                  
                  {!useCustomColor && (
                    <div className="flex flex-wrap gap-2 ml-6">
                      {PREDEFINED_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSelectedColor(color.value)}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all',
                            selectedColor === color.value 
                              ? 'border-gray-900 scale-110' 
                              : 'border-gray-300 hover:border-gray-500'
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  )}

                  {/* Custom Color */}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="custom-color"
                      name="color-type"
                      checked={useCustomColor}
                      onChange={() => setUseCustomColor(true)}
                    />
                    <label htmlFor="custom-color" className="text-sm">
                      Custom color
                    </label>
                  </div>
                  
                  {useCustomColor && (
                    <div className="flex items-center gap-2 ml-6">
                      <input
                        type="color"
                        value={customColor || '#3B82F6'}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        placeholder="#3B82F6"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {tagLabel && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: (useCustomColor ? customColor : selectedColor) + '20',
                      color: useCustomColor ? customColor : selectedColor 
                    }}
                  >
                    <Tag className="w-3 h-3" />
                    {tagLabel}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={!tagLabel.trim() || isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Tag'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VersionTagModal; 