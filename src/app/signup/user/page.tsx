
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Organization } from "@/lib/types";

const formSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required" }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  orgId: z.string({ required_error: "Please select an organization." }),
  employeeId: z.string().min(1, { message: "Employee ID is required" }),
  mobileNumber: z.string().optional(),
});

export default function UserSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const auth = useAuth();
  const db = useFirestore();

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!db) return;
      const orgsCollection = collection(db, "organizations");
      const orgsSnapshot = await getDocs(orgsCollection);
      const orgsList = orgsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
      setOrganizations(orgsList);
    };
    fetchOrgs();
  }, [db]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      employeeId: "",
      mobileNumber: "",
    },
  });

  const handleSignup = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    if (!auth || !db) {
      toast({ title: "Error", description: "Firebase not initialized.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        org_id: values.orgId,
        fullName: values.fullName,
        email: values.email,
        employeeId: values.employeeId,
        mobileNumber: values.mobileNumber || "",
        role: "user",
        status: "pending", // User starts as pending, admin must approve.
      });
      
      // Send verification email
      await sendEmailVerification(user);

      toast({
        title: "Request Sent!",
        description: "Please verify your email, then wait for admin approval to log in.",
        duration: 7000,
      });
      
      await auth.signOut();
      router.push("/login");

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
          <CardTitle className="text-2xl font-headline">Create your Account</CardTitle>
          <CardDescription>Join your organization on EaseSpace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignup)} className="grid gap-4">
              <FormField
                control={form.control}
                name="orgId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations.map(org => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullName"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email</FormLabel>
                    <FormControl><Input placeholder="you@yourcompany.com" {...field} /></FormControl>
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
               <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl><Input placeholder="e.g. 12345" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up & Request Access
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
