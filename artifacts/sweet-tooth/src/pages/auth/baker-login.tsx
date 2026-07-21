import { SignIn, SignUp, useAuth } from "@clerk/react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Store, Mail, Lock, Sparkles, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BakerLogin({ initialTab = "login" }: { initialTab?: "login" | "register" }) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [, setLocation] = useLocation();
  const { isLoaded: clerkLoaded } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Redirect to onboarding or dashboard
    setTimeout(() => {
      setLoading(false);
      setLocation("/dashboard");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 via-purple-50/40 to-pink-50/60 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-900 px-4 py-8 sm:py-12 flex flex-col justify-center items-center">
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-card hover:text-primary shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Sweet Tooth
        </Link>
        <span className="font-serif text-xl font-bold bg-gradient-to-r from-purple-700 via-pink-600 to-amber-600 bg-clip-text text-transparent">
          Sweet Tooth
        </span>
      </div>

      <Card className="w-full max-w-md border-purple-100 dark:border-purple-900/40 shadow-xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 shadow-inner">
            <Store className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold text-foreground">
            Baker Portal
          </CardTitle>
          <CardDescription className="text-sm">
            Manage your kitchen orders, catalog & AI assistant
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-purple-50 dark:bg-slate-900 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg font-medium text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg font-medium text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs">
                Sign Up (New Baker)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 focus-visible:outline-none">
              <div className="flex justify-center min-h-[320px] items-center">
                <SignIn
                  routing="hash"
                  fallbackRedirectUrl="/dashboard"
                  signUpUrl="/dashboard/register"
                />
              </div>

              {/* Fallback form if Clerk JS takes time or is blocked */}
              <div className="pt-4 border-t border-border/60 text-center">
                <p className="text-xs text-muted-foreground mb-3">Or quick login with credentials:</p>
                <form onSubmit={handleCustomSubmit} className="space-y-3 text-left">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Baker Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium" disabled={loading}>
                    {loading ? "Signing in..." : "Enter Baker Dashboard"}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 focus-visible:outline-none">
              <div className="flex justify-center min-h-[320px] items-center">
                <SignUp
                  routing="hash"
                  fallbackRedirectUrl="/dashboard/onboarding"
                  signInUrl="/dashboard/login"
                />
              </div>

              {/* Fallback Register Form */}
              <div className="pt-4 border-t border-border/60 text-center">
                <p className="text-xs text-muted-foreground mb-3">Or create bakery directly:</p>
                <form onSubmit={handleCustomSubmit} className="space-y-3 text-left">
                  <div className="relative">
                    <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Bakery / Kitchen Name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="WhatsApp Number (+92...)"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Choose Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-sm" disabled={loading}>
                    {loading ? "Registering..." : "Create Bakery Account"}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

