"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService, RegisterDTO } from "@/lib/api/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState<RegisterDTO>({
    name: "Test Rider",
    email: "rider@tripzo.com",
    password: "password123",
    role: "RIDER",
    phone: "1234567890",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await authService.register(formData);
      // Backend does not return tokens on register, so redirect to login
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full bg-card/60 backdrop-blur-xl border-border/50 shadow-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl font-heading text-center tracking-tight text-primary">TRIPZO</CardTitle>
        <CardDescription className="text-center font-sans text-muted-foreground">
          Create your mobility profile
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 mt-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {error}
            </div>
          )}
          
          <div className="flex gap-4 mb-4">
            <Button
              type="button"
              variant={formData.role === "RIDER" ? "default" : "outline"}
              className={`flex-1 rounded-full ${formData.role === "RIDER" ? "shadow-[0_0_12px_rgba(0,242,254,0.2)]" : "bg-transparent text-foreground border-border"}`}
              onClick={() => setFormData({...formData, role: "RIDER", email: "rider@tripzo.com", name: "Test Rider"})}
            >
              Rider
            </Button>
            <Button
              type="button"
              variant={formData.role === "CAPTAIN" ? "default" : "outline"}
              className={`flex-1 rounded-full ${formData.role === "CAPTAIN" ? "shadow-[0_0_12px_rgba(0,242,254,0.2)]" : "bg-transparent text-foreground border-border"}`}
              onClick={() => setFormData({...formData, role: "CAPTAIN", email: "captain@tripzo.com", name: "Test Captain"})}
            >
              Captain
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              placeholder="John Doe" 
              className="bg-background/50 border-input/50 focus-visible:ring-primary/50"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
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
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Register Profile"}
          </Button>
          <div className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline hover:text-primary/80 transition-colors">
              Sign In
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
