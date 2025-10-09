import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Bot, BarChart, ArrowRight, CheckCircle, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link href="#" className="flex items-center justify-center gap-2" prefetch={false}>
          <Logo className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">EaseSpace</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
           <Button variant="ghost" asChild>
            <Link
              href="/login"
              className="text-sm font-medium hover:underline underline-offset-4"
              prefetch={false}
            >
              User Login
            </Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Admin Onboarding</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-20 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl xl:text-5xl/none text-foreground">
                    The Smart Way to Manage Your Workspace
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    EaseSpace is an intelligent, all-in-one platform for seamless meeting room and cafeteria booking. Stop juggling spreadsheets and start optimizing your office.
                  </p>
                </div>
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  <Button asChild size="lg">
                     <Link href="/login">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/signup">Request a Demo</Link>
                  </Button>
                </div>
                 <p className="text-xs text-muted-foreground">
                    For employees and admins. No credit card required.
                </p>
              </div>
               <Image
                src="https://picsum.photos/seed/office/1200/800"
                width="600"
                height="400"
                alt="Modern office interior with collaborative spaces"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                data-ai-hint="modern office"
              />
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-medium">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">Everything You Need for a Smarter Workplace</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From AI-powered scheduling to in-depth analytics, EaseSpace provides the tools to create an efficient and productive office environment.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 mt-12">
              <div className="grid gap-2 text-center">
                 <div className="flex justify-center items-center mb-4">
                    <Image
                      src="https://picsum.photos/seed/dashboard/400/300"
                      width="400"
                      height="300"
                      alt="Admin dashboard showing charts and stats"
                      className="rounded-lg object-cover aspect-video"
                      data-ai-hint="data analytics dashboard"
                    />
                </div>
                <h3 className="text-xl font-bold">Admin Command Center</h3>
                <p className="text-sm text-muted-foreground">
                  A comprehensive overview of all bookings, user activity, and space utilization in one place.
                </p>
              </div>
              <div className="grid gap-2 text-center">
                 <div className="flex justify-center items-center mb-4">
                    <Image
                      src="https://picsum.photos/seed/chatbot/400/300"
                      width="400"
                      height="300"
                      alt="AI chatbot interface for booking"
                      className="rounded-lg object-cover aspect-video"
                      data-ai-hint="AI chatbot interface"
                    />
                </div>
                <h3 className="text-xl font-bold">AI-Powered Booking</h3>
                <p className="text-sm text-muted-foreground">
                  Users and admins can interact with our smart AI chatbot to make bookings and get insights using natural language.
                </p>
              </div>
              <div className="grid gap-2 text-center">
                <div className="flex justify-center items-center mb-4">
                   <Image
                      src="https://picsum.photos/seed/charts/400/300"
                      width="400"
                      height="300"
                      alt="Utilization charts and graphs"
                      className="rounded-lg object-cover aspect-video"
                      data-ai-hint="utilization charts graphs"
                    />
                </div>
                <h3 className="text-xl font-bold">Utilization Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize booking data with intuitive charts to optimize your space allocation and resource management.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-background border-t">
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                     <h3 className="font-semibold text-foreground mb-4">EaseSpace</h3>
                     <p className="text-sm text-muted-foreground">&copy; 2024 EaseSpace Inc. <br/>All rights reserved.</p>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground mb-4">Product</h3>
                    <nav className="flex flex-col gap-2">
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
                         <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
                    </nav>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground mb-4">Company</h3>
                    <nav className="flex flex-col gap-2">
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Careers</Link>
                    </nav>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground mb-4">Legal</h3>
                    <nav className="flex flex-col gap-2">
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
                    </nav>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
