"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import React from "react";

export default function Home() {
    const heroImages = [
      "https://pub-3b4d54024e6641ff9fc45c4bc3e84878.r2.dev/main1.png",
      "https://pub-3b4d54024e6641ff9fc45c4bc3e84878.r2.dev/main2.png",
      "https://pub-3b4d54024e6641ff9fc45c4bc3e84878.r2.dev/main3.png",
      "https://pub-3b4d54024e6641ff9fc45c4bc3e84878.r2.dev/main4.png",
      "https://pub-3b4d54024e6641ff9fc45c4bc3e84878.r2.dev/main5.png",
    ];

    const plugin = React.useRef(
        Autoplay({ delay: 5000, stopOnInteraction: true })
    );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <div className="container flex items-center justify-between mx-auto">
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
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-20 lg:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
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
                    <Link href="/request-demo">Request a Demo</Link>
                  </Button>
                </div>
                 <p className="text-xs text-muted-foreground">
                    For employees and admins. No credit card required.
                </p>
              </div>
               <Carousel
                    opts={{
                        loop: true,
                    }}
                    plugins={[plugin.current]}
                    className="w-full"
                    onMouseEnter={plugin.current.stop}
                    onMouseLeave={plugin.current.reset}
                >
                    <CarouselContent>
                        {heroImages.map((src, index) => (
                            <CarouselItem key={index}>
                                <Image
                                    src={src}
                                    width="600"
                                    height="400"
                                    alt={`Hero image ${index + 1}`}
                                    className="mx-auto aspect-video overflow-hidden rounded-xl object-cover"
                                    data-ai-hint="modern office workplace"
                                />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 bg-secondary">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-medium">
                  Key Features
                </div>
                <h2 className="mb-4 text-3xl font-bold tracking-tighter sm:text-4xl">Everything You Need for a Smarter Workplace</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From AI-powered scheduling to in-depth analytics, EaseSpace provides the tools to create an efficient and productive office environment.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center justify-items-center gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 mt-12">
              <div className="grid gap-2 text-center">
                 <div className="flex justify-center items-center mb-4">
                    <Image
                      src="https://pub-3b4d54024e6641ff9fc45c4bc3e84878.r2.dev/sub2%20-%20admin.png"
                      width="400"
                      height="300"
                      alt="Admin dashboard showing charts and stats"
                      className="rounded-lg object-cover aspect-[4/3]"
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
                      src="https://pub-3b4d54024e6641ff9fc45c4bc3e84878.r2.dev/sub1%20-%20ai.png"
                      width="400"
                      height="300"
                      alt="AI chatbot interface for booking"
                      className="rounded-lg object-cover aspect-[4/3]"
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
                      src="https://pub-3b4d54024e6641ff9fc45c4bc3e84878.r2.dev/sub3%20-%20utilz.png"
                      width="400"
                      height="300"
                      alt="Utilization charts and graphs"
                      className="rounded-lg object-cover aspect-[4/3]"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                     <h3 className="font-semibold text-foreground mb-4">EaseSpace</h3>
                     <p className="text-sm text-muted-foreground">&copy; 2024 EaseSpace Inc. <br/>All rights reserved.</p>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground mb-4">Product</h3>
                    <nav className="flex flex-col gap-2">
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
                         <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
                    </nav>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground mb-4">Company</h3>
                    <nav className="flex flex-col gap-2">
                        <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link>
                        <Link href="/request-demo" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
                    </nav>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
