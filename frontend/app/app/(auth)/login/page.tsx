"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService, LoginDTO } from "@/lib/api/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState<LoginDTO>({
    email: "rider@tripzo.com",
    password: "password123",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await authService.login(formData);
      const { user, accessToken, refreshToken } = response.data;
      setAuth(user, accessToken, refreshToken);
      
      // Route based on role
      if (user.role === "CAPTAIN") {
        router.push("/captain");
      } else {
        router.push("/rider");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl font-heading text-center tracking-tight text-primary">TRIPZO</CardTitle>
        <CardDescription className="text-center font-sans text-muted-foreground">
          Enter your credentials to access your mobility dashboard
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 mt-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="pilot@tripzo.com" 
              required 
              className="bg-background/50 border-input/50 focus-visible:ring-primary/50"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              required
              className="bg-background/50 border-input/50 focus-visible:ring-primary/50"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full h-12 rounded-full font-bold text-[15px] shadow-[0_0_16px_rgba(0,242,254,0.3)] hover:shadow-[0_0_24px_rgba(0,242,254,0.5)] transition-all duration-300" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Initiate Sequence"}
          </Button>
          <div className="text-center text-sm text-muted-foreground mt-4">
            New to TRIPZO?{" "}
            <Link href="/register" className="text-primary hover:underline hover:text-primary/80 transition-colors">
              Create an account
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
