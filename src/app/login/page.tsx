"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import React from "react";
import { Logo } from "@/components/logo";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required."}),
});

export default function UserLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
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

  return (
    <div className="flex min-h-screen text-gray-800">
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-[#0d7ff2] to-[#0a66c2] p-12 text-white">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-4 mb-8">
                    <Logo className="h-10 w-10 text-white" />
                    <h1 className="text-3xl font-bold">EaseSpace</h1>
                </div>
                <h2 className="text-4xl font-bold leading-tight mb-4">Book cafeteria seats and meeting rooms efficiently.</h2>
                <p className="text-lg text-blue-100">Join a community of students and employees making campus life easier.</p>
            </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 md:p-12">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center lg:text-left">
                    <h2 className="text-3xl font-bold text-gray-900">Welcome Back!</h2>
                    <p className="text-gray-500 mt-2">Enter your credentials to access your account.</p>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-gray-500">Your email</FormLabel>
                                <FormControl>
                                <Input className="block w-full rounded-lg border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500" placeholder="name@company.com" {...field} />
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
                                <FormLabel className="text-gray-500">Password</FormLabel>
                                <FormControl>
                                <Input className="block w-full rounded-lg border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500" type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <div className="flex items-center justify-between">
                            <div className="flex items-start">
                            </div>
                            <Link href="#" className="text-sm font-medium text-blue-600 hover:underline">Forgot password?</Link>
                        </div>
                        <Button type="submit" className="w-full rounded-lg px-5 py-3 text-center text-sm font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Login with Email
                        </Button>
                         <p className="text-sm font-light text-center text-gray-500">
                            Don’t have an account yet? <Link href="/signup/user" className="font-medium text-blue-600 hover:underline">Sign up</Link>
                        </p>
                    </form>
                </Form>
            </div>
        </div>
    </div>
  );
}
