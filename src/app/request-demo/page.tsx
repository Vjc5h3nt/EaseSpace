
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const demoRequestSchema = z.object({
  businessEmail: z.string().email({ message: "Please enter a valid business email." }),
  enquiryType: z.string({ required_error: "Please select an enquiry type." }),
  contactNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit mobile number." }),
  region: z.string(),
  state: z.string({ required_error: "Please select a state." }),
});

const ticketSchema = z.object({
  userEmail: z.string().email({ message: "Please enter a valid email." }),
  userRole: z.string().min(1, { message: "User role is required." }),
  organization: z.string().min(1, { message: "Organization name is required." }),
  fullName: z.string().min(1, { message: "Full name is required." }),
  issueHeading: z.string().min(5, { message: "Heading must be at least 5 characters." }),
  issueDetail: z.string().min(20, { message: "Please provide at least 20 characters of detail." }),
});

export default function RequestDemoPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isTicketLoading, setIsTicketLoading] = useState(false);

  const demoForm = useForm<z.infer<typeof demoRequestSchema>>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: {
      businessEmail: "",
      contactNumber: "",
      region: "India",
    },
  });

  const ticketForm = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      userEmail: "",
      userRole: "",
      organization: "",
      fullName: "",
      issueHeading: "",
      issueDetail: "",
    },
  });

  const handleDemoSubmit = async (values: z.infer<typeof demoRequestSchema>) => {
    setIsDemoLoading(true);
    if (!db) {
      toast({ title: "Error", description: "Database connection not found.", variant: "destructive" });
      setIsDemoLoading(false);
      return;
    }
    try {
      await addDoc(collection(db, "demo_requests"), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Request Sent!", description: "Our sales team will contact you shortly." });
      demoForm.reset();
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleTicketSubmit = async (values: z.infer<typeof ticketSchema>) => {
    setIsTicketLoading(true);
    if (!db) {
      toast({ title: "Error", description: "Database connection not found.", variant: "destructive" });
      setIsTicketLoading(false);
      return;
    }
    try {
      await addDoc(collection(db, "complaint_tickets"), {
        ...values,
        status: "Open",
        createdAt: serverTimestamp(),
      });
      toast({ title: "Ticket Raised!", description: "Your issue has been submitted. We will get back to you soon." });
      ticketForm.reset();
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsTicketLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="absolute top-4 left-4">
            <Link href="/" className="flex items-center gap-2">
                <Logo className="h-6 w-6 text-primary" />
                <span className="font-bold">EaseSpace</span>
            </Link>
        </div>
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Contact Us</CardTitle>
          <CardDescription>
            Whether you're new here or an existing customer, we're ready to help.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="request-demo">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="request-demo">Request a Demo</TabsTrigger>
              <TabsTrigger value="raise-ticket">Raise a Ticket</TabsTrigger>
            </TabsList>
            <TabsContent value="request-demo" className="mt-6">
              <Form {...demoForm}>
                <form onSubmit={demoForm.handleSubmit(handleDemoSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={demoForm.control} name="businessEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl><Input placeholder="name@yourcompany.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={demoForm.control} name="enquiryType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enquiry For</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select institution type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="College">College</SelectItem>
                            <SelectItem value="University">University</SelectItem>
                            <SelectItem value="Workplace">Workplace</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={demoForm.control} name="contactNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl><Input placeholder="9876543210" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={demoForm.control} name="region" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                         <FormControl>
                            <Input {...field} readOnly disabled />
                         </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={demoForm.control} name="state" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl><SelectTrigger><SelectValue placeholder="Select your state" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {indianStates.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isDemoLoading}>
                    {isDemoLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="raise-ticket" className="mt-6">
              <Form {...ticketForm}>
                <form onSubmit={ticketForm.handleSubmit(handleTicketSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={ticketForm.control} name="fullName" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                     <FormField control={ticketForm.control} name="userEmail" render={({ field }) => (
                        <FormItem><FormLabel>Your Email</FormLabel><FormControl><Input placeholder="you@yourcompany.com" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                     <FormField control={ticketForm.control} name="organization" render={({ field }) => (
                        <FormItem><FormLabel>Organization</FormLabel><FormControl><Input placeholder="Acme Inc." {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                     <FormField control={ticketForm.control} name="userRole" render={({ field }) => (
                        <FormItem><FormLabel>Your Role</FormLabel><FormControl><Input placeholder="e.g., Student, Employee, Admin" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                  </div>
                  <FormField control={ticketForm.control} name="issueHeading" render={({ field }) => (
                    <FormItem><FormLabel>Issue Heading</FormLabel><FormControl><Input placeholder="e.g., Unable to book meeting room" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={ticketForm.control} name="issueDetail" render={({ field }) => (
                    <FormItem><FormLabel>Issue in Detail</FormLabel><FormControl><Textarea placeholder="Please describe the issue in detail..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={isTicketLoading}>
                    {isTicketLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Raise Ticket
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
