
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
import { Logo } from "@/components/logo";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home, MailCheck } from "lucide-react";

const formSchema = z.object({
  organizationName: z.string().min(1, { message: "Organization name is required" }),
  adminFullName: z.string().min(1, { message: "Full name is required" }),
  adminEmail: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: "",
      adminFullName: "",
      adminEmail: "",
      password: "",
    },
  });

  const handleSignup = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // 1. Check if organization name already exists
      const { data: existingOrgs, error: orgCheckError } = await supabase
        .from("organizations")
        .select("name")
        .eq("name", values.organizationName)
        .single();
      
      if (orgCheckError && orgCheckError.code !== 'PGRST116') { // PGRST116: "exact-match" not found, which is good
          throw orgCheckError;
      }
      
      if (existingOrgs) {
        toast({
          title: "Organization Exists",
          description: "An organization with this name already exists. Please choose a different name.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // 2. Create the admin user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.adminEmail,
        password: values.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed.");

      // 3. Create the organization in the organizations table
      const { data: orgData, error: orgInsertError } = await supabase
        .from("organizations")
        .insert({ name: values.organizationName })
        .select()
        .single();
      
      if (orgInsertError) throw orgInsertError;
      if (!orgData) throw new Error("Organization creation failed.");
      
      // 4. Create the user profile in the users table
      const { error: userInsertError } = await supabase.from("users").insert({
        id: authData.user.id,
        org_id: orgData.org_id,
        full_name: values.adminFullName,
        email: values.adminEmail,
        role: "admin",
        status: "active",
        onboarding_complete: false,
      });

      if (userInsertError) throw userInsertError;
      
      toast({
        title: "Account Created!",
        description: "A verification link has been sent to your email.",
      });

      setIsSubmitted(true); // Show the verification message

    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background py-12">
          <Card className="mx-auto max-w-md w-full text-center">
             <CardHeader>
                <MailCheck className="h-12 w-12 mx-auto text-green-500" />
                <CardTitle className="text-2xl font-headline mt-4">Please Verify Your Email</CardTitle>
                <CardDescription>
                  A verification link has been sent to your email address. Please click the link to verify your account before logging in.
                </CardDescription>
             </CardHeader>
             <CardContent>
                <Button asChild>
                    <Link href="/login">Back to Login</Link>
                </Button>
             </CardContent>
          </Card>
       </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-12">
      <Card className="mx-auto max-w-md w-full relative">
         <Link href="/" passHref>
            <Button variant="ghost" size="icon" className="absolute top-4 left-4">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        <CardHeader className="text-center pt-12">
          <Link href="/" className="inline-block mb-4">
            <Logo className="h-8 w-8 mx-auto text-primary" />
          </Link>
          <CardTitle className="text-2xl font-headline">Create Your Organization</CardTitle>
          <CardDescription>Get started by creating an admin account for your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignup)} className="grid gap-4">
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adminFullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Full Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adminEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email</FormLabel>
                    <FormControl><Input placeholder="admin@example.com" {...field} /></FormControl>
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
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account & Verify Email
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
