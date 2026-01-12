"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();
  const user = session?.user;
  const loading = status === "loading";

  useEffect(() => {
    // Handle scroll for navbar
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Sticky Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled
          ? "bg-white shadow-md"
          : "bg-white"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                WordSage
              </span>
            </Link>

            {/* Center Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection("features")}
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors"
              >
                FAQ
              </button>
            </div>

            {/* Right: Auth Buttons */}
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              ) : user ? (
                <>
                  <Link
                    href="/editor"
                    className="hidden sm:block px-5 py-2.5 text-gray-700 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    Editor
                  </Link>
                  <Link
                    href="/dashboard"
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl hover:scale-105 transition-all"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-5 py-2.5 text-gray-700 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-7 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-md"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-50 pt-20 flex items-center justify-center px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fadeIn">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Write Smarter,
              </span>
              <br />
              <span>Faster, and More</span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Confidently
              </span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
              Your AI-powered writing companion that improves grammar, tone, and
              clarity in real time. Whether you're drafting emails, essays, or
              reports — WordSage helps you write like a pro.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href={user ? "/editor" : "/signup"}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all transform hover:scale-105 text-center"
              >
                {user ? "Open Editor" : "Try WordSage Free"}
              </Link>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-indigo-600 hover:text-indigo-600 transition-all"
              >
                Watch Demo
              </button>
            </div>
            <p className="text-sm text-gray-500 pt-2">
              🎉 Start with 100 free SkillsCoins • No credit card required
            </p>
          </div>

          {/* Hero Animation */}
          <div className="hidden lg:block">
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="space-y-4">
                <div className="h-3 bg-red-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-red-200 rounded w-full animate-pulse"></div>
                <div className="h-3 bg-red-200 rounded w-5/6 animate-pulse"></div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                <div className="h-3 bg-green-200 rounded w-3/4"></div>
                <div className="h-3 bg-green-200 rounded w-full"></div>
                <div className="h-3 bg-green-200 rounded w-5/6"></div>
              </div>
              <div className="absolute top-4 right-4 text-sm font-semibold text-indigo-600">
                AI in Action ✨
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problem Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                💭 Writing clearly shouldn't be this hard.
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                Whether you're sending an important email, writing a blog, or
                editing a report — unclear writing can cost time, money, and
                opportunities.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                WordSage eliminates guesswork by giving you instant feedback,
                improvements, and rewrites powered by cutting-edge AI.
              </p>
            </div>

            {/* Before/After Animation */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                <p className="text-sm font-semibold text-red-600 mb-3">
                  Before WordSage
                </p>
                <p className="text-gray-700 line-through opacity-60">
                  The qaulity of you're writting is realy importent for making
                  good impression on others.
                </p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <p className="text-sm font-semibold text-green-600 mb-3">
                  After WordSage
                </p>
                <p className="text-gray-700 font-medium">
                  The quality of your writing is really important for making a
                  good impression on others.
                </p>
              </div>
              <div className="text-center text-sm font-semibold text-indigo-600">
                💡 Clarity increased by 43% — instantly.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="py-20 px-4 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🧠 Meet WordSage — Your AI Writing Partner
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "🧠",
                title: "Fix Grammar Instantly",
                desc: "Correct mistakes in seconds.",
              },
              {
                icon: "✨",
                title: "Rewrite & Improve",
                desc: "Transform dull text into engaging copy.",
              },
              {
                icon: "📚",
                title: "Summarize or Expand",
                desc: "Condense or enrich your ideas instantly.",
              },
              {
                icon: "🗣️",
                title: "Tone Control",
                desc: "Adjust your tone to formal, friendly, or persuasive.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-8 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1 backdrop-blur-sm bg-opacity-80"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 text-sm font-semibold text-gray-600">
            🔒 Your words are yours — WordSage never stores or shares your data.
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ⚙️ How It Works in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: "1",
                title: "Write or paste your text",
                desc: "Drop your content into the editor.",
              },
              {
                num: "2",
                title: "Choose your action",
                desc: "Fix grammar, rewrite, summarize, or expand.",
              },
              {
                num: "3",
                title: "Get instant results",
                desc: "AI-refined text ready to copy, export, or share.",
              },
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {step.num}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-6">
              💬 Try it in seconds — no sign-up required for free tier.
            </p>
            <Link
              href={user ? "/editor" : "/signup"}
              className="inline-block px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all transform hover:scale-105"
            >
              {user ? "Launch Editor" : "Get Started Free"}
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Testimonials */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              💜 Trusted by professionals, students, and teams worldwide.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "WordSage made my emails sound more confident — clients started replying faster!",
                author: "Rina Patel",
                role: "Freelancer",
              },
              {
                quote:
                  "My essays finally sound polished and original. It's like having a personal editor.",
                author: "Karan Verma",
                role: "Student",
              },
              {
                quote:
                  "Way beyond grammar correction — it improves your thinking clarity.",
                author: "Dr. Ananya Roy",
                role: "Professor",
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-8 border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="flex justify-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">
                      ⭐
                    </span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <p className="font-semibold text-gray-900">— {testimonial.author}</p>
                <p className="text-sm text-gray-600">{testimonial.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Enhanced Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-4xl">💼</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Simple, transparent pricing
              </h2>
            </div>
            <p className="text-xl text-indigo-100">Start free, grow as you go.</p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="relative rounded-2xl p-8 bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/15 transition-all">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <p className="text-indigo-100 text-sm mb-4">Try basic features forever</p>
              <div className="text-5xl font-bold mb-6">₹0</div>
              <Link
                href={user ? "/dashboard" : "/signup"}
                className="block w-full py-3 px-6 bg-white/20 hover:bg-white/30 border border-white/40 text-white rounded-lg font-semibold transition-all text-center mb-6"
              >
                {user ? "Current Plan" : "Start Free"}
              </Link>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-green-300 mt-1">✓</span>
                  <span>5 AI requests/day</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-300 mt-1">✓</span>
                  <span>100 SkillsCoins</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-300 mt-1">✓</span>
                  <span>Basic grammar check</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-300 mt-1">✓</span>
                  <span>Cloud storage</span>
                </li>
              </ul>
            </div>

            {/* Pro Plan - MOST POPULAR */}
            <div className="relative rounded-2xl p-8 bg-white shadow-2xl transform md:-translate-y-4 hover:scale-105 transition-all">
              <span className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full">
                MOST POPULAR
              </span>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <p className="text-gray-600 text-sm mb-4">Unlock full power</p>
              <div className="text-5xl font-bold text-gray-900 mb-6">₹2,999<span className="text-lg text-gray-500">/mo</span></div>
              <Link
                href={user ? "/dashboard/settings?tab=billing#plans" : "/signup"}
                className="block w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl transition-all text-center mb-6"
              >
                {user ? "Get Pro" : "Get Pro"}
              </Link>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>5000 SkillsCoins/month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Team collaboration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Custom features</span>
                </li>
              </ul>
            </div>

            {/* Team Plan */}
            <div className="relative rounded-2xl p-8 bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/15 transition-all">
              <h3 className="text-2xl font-bold mb-2">Team</h3>
              <p className="text-indigo-100 text-sm mb-4">For teams and organizations</p>
              <div className="text-5xl font-bold mb-6">₹2,999<span className="text-lg opacity-70">/mo</span></div>
              <Link
                href={user ? "/dashboard/settings?tab=billing#plans" : "/signup"}
                className="block w-full py-3 px-6 bg-white/20 hover:bg-white/30 border border-white/40 text-white rounded-lg font-semibold transition-all text-center mb-6"
              >
                {user ? "Get Team" : "Get Team"}
              </Link>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-green-300 mt-1">✓</span>
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-300 mt-1">✓</span>
                  <span>5000 SkillsCoins/month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-300 mt-1">✓</span>
                  <span>Team collaboration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-300 mt-1">✓</span>
                  <span>Custom features</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center mt-12">
            <p className="text-indigo-100 flex items-center justify-center gap-2">
              <span>💡</span>
              <span>No credit card required for free plan. Cancel anytime.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ❓ Have Questions? We've Got Answers.
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "Is my data private?",
                a: "100%. WordSage never stores or shares your content. Your writing stays completely private.",
              },
              {
                q: "Do I need to install anything?",
                a: "No, it works right in your browser. Just visit WordSage and start writing.",
              },
              {
                q: "Can I use WordSage for academic writing?",
                a: "Yes, it helps maintain clarity and tone ethically. Perfect for essays, research papers, and more.",
              },
              {
                q: "Is there a free trial?",
                a: "Yes! The Free plan is forever free with basic features. No credit card needed.",
              },
              {
                q: "How do I upgrade my plan?",
                a: "Simply go to Settings → Billing and choose your plan. Razorpay handles secure payments.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, cancel anytime from your dashboard. No questions asked, no hidden fees.",
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-indigo-600 transition-all cursor-pointer"
              >
                <summary className="font-semibold text-gray-900 flex justify-between items-center">
                  {faq.q}
                  <span className="text-2xl group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="text-gray-600 mt-4">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            ✨ Stop overthinking your words — start mastering them with WordSage.
          </h2>
          <Link
            href={user ? "/editor" : "/signup"}
            className="inline-block px-10 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:shadow-2xl transition-all transform hover:scale-105"
          >
            {user ? "Open Editor Now" : "Get Started Free"}
          </Link>
          <p className="text-indigo-100 mt-6">
            💬 Takes 30 seconds. {!user && "No sign-up needed for free tier."}
          </p>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">WordSage</span>
              </div>
              <p className="text-gray-400">Your AI Writing Partner.</p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <div className="space-y-2">
                <Link href="/editor" className="block text-gray-400 hover:text-white transition-colors">
                  Editor
                </Link>
                <button onClick={() => scrollToSection("features")} className="block text-gray-400 hover:text-white transition-colors">
                  Features
                </button>
                <button onClick={() => scrollToSection("pricing")} className="block text-gray-400 hover:text-white transition-colors">
                  Pricing
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <div className="space-y-2">
                <Link href="/dashboard" className="block text-gray-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/dashboard/settings" className="block text-gray-400 hover:text-white transition-colors">
                  Settings
                </Link>
                <Link href="/dashboard/analytics" className="block text-gray-400 hover:text-white transition-colors">
                  Analytics
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <div className="space-y-2">
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2025 WordSage. All rights reserved. CoFounder Makhija Quantum AI in India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
