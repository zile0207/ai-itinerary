'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { mockDataService, type Itinerary as MockItinerary } from '@/lib/mockDataService';
import { NotificationCenter } from '@/components/notifications';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar, 
  MapPin, 
  Users, 
  Copy,
  Trash2,
  Share2,
  Eye,
  Edit,
  Download,
  Star,
  Clock
} from 'lucide-react';

// shadcn UI imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// Use the Itinerary type from mockDataService as-is
type Itinerary = MockItinerary;

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [filteredItineraries, setFilteredItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'modified'>('modified');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'completed' | 'archived'>('all');
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadItineraries();
  }, []);

  useEffect(() => {
    filterAndSortItineraries();
  }, [itineraries, searchTerm, sortBy, filterStatus]);

  const loadItineraries = async () => {
    try {
      setLoading(true);
      const result = await mockDataService.getItineraries();
      setItineraries(result.itineraries);
    } catch (error) {
      console.error('Failed to load itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortItineraries = () => {
    let filtered = itineraries.filter(itinerary => {
      const matchesSearch = itinerary.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           itinerary.destination.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || itinerary.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'date':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                 case 'modified':
         default:
           return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    setFilteredItineraries(filtered);
  };

  const handleDuplicate = async (itinerary: Itinerary) => {
    try {
      // Create duplicate with modified title
      const duplicate = {
        ...itinerary,
        id: Date.now().toString(),
        title: `${itinerary.title} (Copy)`,
                 status: 'draft' as const,
         updatedAt: new Date().toISOString(),
         collaborators: []
      };
      
      setItineraries(prev => [duplicate, ...prev]);
    } catch (error) {
      console.error('Failed to duplicate itinerary:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedItinerary) return;
    
    try {
      setItineraries(prev => prev.filter(item => item.id !== selectedItinerary.id));
      setDeleteDialogOpen(false);
      setSelectedItinerary(null);
    } catch (error) {
      console.error('Failed to delete itinerary:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'draft': return 'outline';
      case 'archived': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDuration = (days: number) => {
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    
    if (startDate.getFullYear() !== endDate.getFullYear()) {
      return `${formatter.format(startDate)}, ${startDate.getFullYear()} - ${formatter.format(endDate)}, ${endDate.getFullYear()}`;
    }
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}, ${startDate.getFullYear()}`;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">Your Itineraries</h1>
                {!loading && (
                  <Badge variant="secondary" className="text-sm">
                    {filteredItineraries.length} of {itineraries.length}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <NotificationCenter />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                      <Link href="/itinerary/new">
                        <Plus className="h-4 w-4 mr-2" />
                        New Itinerary
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create a new travel itinerary</TooltipContent>
                </Tooltip>
                
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profilePicture} alt={user?.firstName} />
                  <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Search and Filter Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by destination or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modified">Last Modified</SelectItem>
                <SelectItem value="date">Travel Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Itineraries Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="h-[320px]">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full rounded-md mb-4" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredItineraries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <MapPin className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No itineraries found' : 'No itineraries yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first travel itinerary to get started'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/itinerary/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Itinerary
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItineraries.map((itinerary) => (
                <Card key={itinerary.id} className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                          {itinerary.title}
                        </CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {itinerary.destination}
                        </CardDescription>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/itinerary/${itinerary.id}`} className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/itinerary/${itinerary.id}/edit`} className="flex items-center">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(itinerary)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Export PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setSelectedItinerary(itinerary);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-4">
                    {/* Thumbnail */}
                    <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-md mb-4 flex items-center justify-center overflow-hidden">
                      {itinerary.thumbnail ? (
                        <img src={itinerary.thumbnail} alt={itinerary.title} className="w-full h-full object-cover" />
                      ) : (
                        <MapPin className="h-8 w-8 text-blue-500" />
                      )}
                    </div>
                    
                    {/* Trip Details */}
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-2" />
                        <span>{formatDateRange(itinerary.startDate, itinerary.endDate)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-2" />
                          <span>{formatDuration(itinerary.duration)}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          <span>{itinerary.travelers}</span>
                        </div>
                      </div>
                      
                      {itinerary.budget && (
                        <div className="text-sm font-medium text-green-600">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: itinerary.budget.currency
                          }).format(itinerary.budget.total)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusBadgeVariant(itinerary.status)}>
                          {itinerary.status}
                        </Badge>
                        
                                                 {itinerary.isPublic && (
                           <Tooltip>
                             <TooltipTrigger>
                               <Share2 className="h-3 w-3 text-blue-500" />
                             </TooltipTrigger>
                             <TooltipContent>Public itinerary</TooltipContent>
                           </Tooltip>
                         )}
                       </div>
                       
                       {itinerary.collaborators && itinerary.collaborators.length > 0 && (
                         <div className="flex items-center text-xs text-gray-500">
                           <Users className="h-3 w-3 mr-1" />
                           +{itinerary.collaborators.length} collaborator{itinerary.collaborators.length !== 1 ? 's' : ''}
                         </div>
                       )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Itinerary</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedItinerary?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
} 