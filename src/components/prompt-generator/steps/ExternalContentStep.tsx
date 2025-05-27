'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { StepContentProps } from './BaseStep';
import { ExternalContentItem, ExternalContentData } from '@/types/prompt';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Link, 
  FileText, 
  MessageSquare, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Shield,
  Eye,
  Trash2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ExternalContentStep: React.FC<StepContentProps> = ({
  data,
  updateData,
  updateValidation,
  className = ''
}) => {
  const externalData = data.externalContent as ExternalContentData;
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'file'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<ExternalContentItem['contentType']>('blog');

  const validateStep = useCallback(() => {
    // External content is optional, so always valid
    // But we can provide helpful validation messages
    const errors = [];
    
    if (externalData.analysisEnabled && !externalData.privacyConsent) {
      errors.push('Please consent to data processing to enable content analysis');
    }

    const isValid = true; // Always valid since it's optional
    updateValidation('external-content', { isValid, errors });
  }, [externalData.analysisEnabled, externalData.privacyConsent, updateValidation]);

  useEffect(() => {
    validateStep();
  }, [validateStep]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addContentItem = useCallback((type: ExternalContentItem['type'], content: string, title?: string) => {
    if (!content.trim()) return;

    const newItem: ExternalContentItem = {
      id: generateId(),
      type,
      content: content.trim(),
      contentType: selectedContentType,
      title: title?.trim(),
      status: 'pending'
    };

    const updatedItems = [...externalData.items, newItem];
    updateData('externalContent', { items: updatedItems });

    // Clear inputs
    if (type === 'url') setUrlInput('');
    if (type === 'text') setTextInput('');
  }, [externalData.items, selectedContentType, updateData]);

  const removeContentItem = useCallback((id: string) => {
    const updatedItems = externalData.items.filter(item => item.id !== id);
    updateData('externalContent', { items: updatedItems });
  }, [externalData.items, updateData]);

  const toggleAnalysis = useCallback((enabled: boolean) => {
    updateData('externalContent', { analysisEnabled: enabled });
  }, [updateData]);

  const togglePrivacyConsent = useCallback((consent: boolean) => {
    updateData('externalContent', { privacyConsent: consent });
  }, [updateData]);

  const simulateAnalysis = useCallback((itemId: string) => {
    // Simulate AI analysis with mock insights
    const mockInsights = [
      'Prefers cultural and historical attractions',
      'Enjoys local food experiences and cooking classes',
      'Values authentic, off-the-beaten-path destinations',
      'Interested in sustainable and eco-friendly travel',
      'Prefers mid-range accommodations with local character'
    ];

    const updatedItems = externalData.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'analyzing' as const
        };
      }
      return item;
    });

    updateData('externalContent', { items: updatedItems });

    // Simulate analysis delay
    setTimeout(() => {
      const finalItems = externalData.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            status: 'completed' as const,
            extractedInsights: mockInsights.slice(0, Math.floor(Math.random() * 3) + 2)
          };
        }
        return item;
      });

      updateData('externalContent', { items: finalItems });
    }, 2000);
  }, [externalData.items, updateData]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getStatusIcon = (status: ExternalContentItem['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'analyzing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: ExternalContentItem['type']) => {
    switch (type) {
      case 'url':
        return <Link className="w-4 h-4" />;
      case 'text':
        return <MessageSquare className="w-4 h-4" />;
      case 'file':
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Add inspiration (Optional)</h2>
        <p className="text-gray-600">
          Share content that inspires your trip - blogs, social posts, previous itineraries, or travel ideas
        </p>
      </div>

      {/* Privacy and Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>AI Analysis & Privacy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="analysis-toggle" className="text-base font-medium">
                Enable AI Content Analysis
              </Label>
              <p className="text-sm text-gray-600">
                Analyze your content to extract travel preferences and personalize recommendations
              </p>
            </div>
            <Switch
              id="analysis-toggle"
              checked={externalData.analysisEnabled}
              onCheckedChange={toggleAnalysis}
            />
          </div>

          {externalData.analysisEnabled && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="privacy-consent" className="text-sm font-medium">
                    Data Processing Consent
                  </Label>
                  <p className="text-xs text-gray-600">
                    I consent to processing my content for travel preference analysis
                  </p>
                </div>
                <Switch
                  id="privacy-consent"
                  checked={externalData.privacyConsent}
                  onCheckedChange={togglePrivacyConsent}
                />
              </div>
              
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your content is processed securely and used only for generating personalized travel recommendations. 
                  No data is stored permanently or shared with third parties.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Input */}
      <Card>
        <CardHeader>
          <CardTitle>Add Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url" className="flex items-center space-x-2">
                <Link className="w-4 h-4" />
                <span>URL</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Text</span>
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>File</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="content-type" className="text-sm font-medium">
                  Content Type
                </Label>
                <Select value={selectedContentType} onValueChange={(value) => setSelectedContentType(value as ExternalContentItem['contentType'])}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog">Travel Blog</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="social">Social Media Post</SelectItem>
                    <SelectItem value="itinerary">Previous Itinerary</SelectItem>
                    <SelectItem value="review">Travel Review</SelectItem>
                    <SelectItem value="video">Video Content</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value="url" className="space-y-3">
                <div>
                  <Label htmlFor="url-input" className="text-sm font-medium">
                    Website URL
                  </Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      id="url-input"
                      type="url"
                      placeholder="https://example.com/travel-blog-post"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => addContentItem('url', urlInput)}
                      disabled={!urlInput.trim() || !isValidUrl(urlInput)}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {urlInput && !isValidUrl(urlInput) && (
                    <p className="text-xs text-red-600 mt-1">Please enter a valid URL</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-3">
                <div>
                  <Label htmlFor="text-input" className="text-sm font-medium">
                    Travel Ideas or Content
                  </Label>
                  <Textarea
                    id="text-input"
                    placeholder="Paste travel content, ideas, or descriptions that inspire your trip..."
                    value={textInput}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextInput(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      {textInput.length}/1000 characters
                    </p>
                    <Button
                      onClick={() => addContentItem('text', textInput)}
                      disabled={!textInput.trim() || textInput.length > 1000}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="file" className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">File upload coming soon</p>
                  <p className="text-xs text-gray-500">
                    Support for PDF, DOC, and image files will be added in a future update
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Content Items List */}
      {externalData.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Added Content ({externalData.items.length})</span>
              {externalData.analysisEnabled && externalData.privacyConsent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    externalData.items
                      .filter(item => item.status === 'pending')
                      .forEach(item => simulateAnalysis(item.id));
                  }}
                  disabled={!externalData.items.some(item => item.status === 'pending')}
                >
                  Analyze All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {externalData.items.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(item.type)}
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.contentType}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        {item.title && (
                          <p className="font-medium text-sm text-gray-900 mb-1">{item.title}</p>
                        )}
                        <p className="text-sm text-gray-600 truncate">
                          {item.type === 'url' ? item.content : `${item.content.substring(0, 100)}...`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {externalData.analysisEnabled && externalData.privacyConsent && item.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => simulateAnalysis(item.id)}
                        >
                          Analyze
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContentItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {item.extractedInsights && item.extractedInsights.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <h4 className="text-sm font-medium text-green-900 mb-2">Extracted Insights:</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        {item.extractedInsights.map((insight, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-green-600">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-800">{item.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Helpful Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 What content works best:</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Travel blogs and articles about destinations you love</li>
          <li>• Social media posts from trips that inspired you</li>
          <li>• Previous itineraries or travel plans</li>
          <li>• Reviews of hotels, restaurants, or activities</li>
          <li>• Travel videos or photo descriptions</li>
        </ul>
      </div>
    </div>
  );
}; 