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
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, addDoc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home } from "lucide-react";

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
  const [verificationSent, setVerificationSent] = useState(false);

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
      // 1. Create the organization
      const orgRef = await addDoc(collection(db, "organizations"), {
        name: values.organizationName,
        createdAt: new Date(),
      });
      const orgId = orgRef.id;

      // 2. Create the admin user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.adminEmail, values.password);
      const user = userCredential.user;

      // 3. Create the user document in Firestore, linking to the organization
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        orgId: orgId,
        fullName: values.adminFullName,
        email: values.adminEmail,
        role: "admin", // Assign admin role
      });
      
      // 4. Send verification email
      const actionCodeSettings = {
        url: `${window.location.origin}/onboarding`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);

      toast({
        title: "Verification Email Sent",
        description: "Please check your email to verify your account to complete registration.",
      });
      
      setVerificationSent(true);

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

  if (verificationSent) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="mx-auto max-w-sm w-full text-center">
            <CardHeader>
                <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                <CardDescription>A verification link has been sent to your email address. Please check your inbox and click the link to activate your account and set up your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                 <Button onClick={() => router.push('/login')}>Back to Login</Button>
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
                Create Account
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
