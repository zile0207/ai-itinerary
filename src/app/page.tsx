import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, Users, Compass, LogIn } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Compass className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">My Itinerary</h1>
          </div>
          <Link href="/login">
            <Button className="flex items-center space-x-2">
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Plan Your Perfect Trip
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create personalized travel itineraries with AI-powered recommendations. 
            From destinations to activities, we&apos;ll help you plan every detail of your journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/itinerary/new">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Planning
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Smart Destinations</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Discover amazing places tailored to your interests and preferences
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Calendar className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Flexible Planning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Plan trips with flexible dates and customizable itineraries
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Group Travel</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Perfect for solo travelers, couples, families, and groups
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Compass className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>AI-Powered</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get intelligent recommendations based on your travel style
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Your Adventure?
          </h3>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">
            Join thousands of travelers who have discovered their perfect trips with our AI-powered planning tool.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/itinerary/new">
              <Button size="lg" className="text-lg px-8 py-3">
                Create Your Itinerary
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Login to Continue
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 My Itinerary. Built with Next.js and AI.</p>
        </div>
      </footer>
    </div>
  );
}
