"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import React from "react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().optional(),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);

   React.useEffect(() => {
    // Handle the sign-in with email link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
          setIsLoading(true);
          signInWithEmailLink(auth, email, window.location.href)
            .then(async (result) => {
              window.localStorage.removeItem('emailForSignIn');
              toast({ title: "Success", description: "Logged in successfully." });
              
              const userDoc = await getDoc(doc(db, "users", result.user.uid));
              if (userDoc.exists() && userDoc.data().role === 'admin') {
                router.push("/dashboard/admin");
              } else {
                router.push("/dashboard/user"); 
              }
            })
            .catch((error) => {
              toast({ title: "Login Failed", description: error.message, variant: "destructive" });
            })
            .finally(() => setIsLoading(false));
      }
    }
  }, [router, toast]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    if (!values.password) {
        form.setError("password", { type: "manual", message: "Password is required." });
        return;
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "Success", description: "Logged in successfully." });

      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        router.push("/dashboard/admin");
      } else {
        router.push("/dashboard/user"); 
      }

    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    const email = form.getValues("email");
    if (!email) {
        form.setError("email", { type: "manual", message: "Email is required for a magic link." });
        return;
    }
     if (form.formState.errors.email) {
      return;
    }
    setIsMagicLinkLoading(true);
    const actionCodeSettings = {
        url: `${window.location.origin}${window.location.pathname}`,
        handleCodeInApp: true,
    };
    try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        toast({
            title: "Magic Link Sent",
            description: "Check your email for the login link.",
        });
    } catch (error: any) {
         toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setIsMagicLinkLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full relative">
         <Link href="/" passHref>
            <Button variant="ghost" size="icon" className="absolute top-4 left-4">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        <CardHeader className="text-center pt-12">
          <Link href="/" className="inline-block mb-4">
            <Logo className="h-8 w-8 mx-auto text-primary" />
          </Link>
          <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
          </Form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                Or continue with
                </span>
            </div>
          </div>
           <Button variant="outline" className="w-full" onClick={handleMagicLink} disabled={isMagicLinkLoading || isLoading}>
                {isMagicLinkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Magic Link
            </Button>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
