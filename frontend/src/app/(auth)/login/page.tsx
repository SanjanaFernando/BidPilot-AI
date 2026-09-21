"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, ShieldCheck, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 800);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F9FB",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {/* Left panel — branding */}
      <div
        style={{
          width: "480px",
          background: "linear-gradient(145deg, #7A1C2C 0%, #4A0E18 100%)",
          padding: "56px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: "absolute",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(221,166,37,0.12) 0%, transparent 70%)",
            top: -80,
            left: -80,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
            bottom: -50,
            right: -80,
          }}
        />

        <div style={{ position: "relative" }}>
          {/* Logo */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "14px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "32px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
              overflow: "hidden",
              padding: "4px",
            }}
          >
            <Image
              src="/logo.png"
              alt="BidPilot AI Logo"
              width={56}
              height={56}
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
              priority
            />
          </div>

          <h1
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.2,
              marginBottom: "16px",
            }}
          >
            BidPilot AI
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.7,
              marginBottom: "40px",
              maxWidth: "340px",
            }}
          >
            Multi-Agent RFP Response Platform for Sri Lankan IT Companies. Evidence-backed proposals
            with full requirement traceability.
          </p>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              "AI-driven RFP analysis & requirement extraction",
              "Company knowledge base with RAG retrieval",
              "Compliance verification & human approval",
              "Audit-ready DOCX proposal export",
            ].map((f) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "13.5px",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <div
                  style={{
                    background: "#DDA625",
                    color: "#1E252D",
                    borderRadius: "50%",
                    width: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tag */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 56,
            fontSize: "12px",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          LankaTech Solutions Demo · National IT Procurement Platform
        </div>
      </div>

      {/* Right panel — login form with shadcn components */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 40px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <Card className="border-[#E2E8F0] bg-white shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <div className="mb-1 flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#7A1C2C]" />
                <CardTitle className="text-xl font-bold text-[#1E252D]">
                  Sign in to your account
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-[#64748B]">
                Enter your credentials to access the BidPilot AI dashboard
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-[#1E252D]">
                    Work Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@organisation.lk"
                    defaultValue="ashan@lankatech.lk"
                    required
                    className="border-[#E2E8F0] focus-visible:ring-[#7A1C2C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-[#1E252D]">
                      Password
                    </Label>
                    <a href="#" className="text-xs font-semibold text-[#7A1C2C] hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      defaultValue="demo1234"
                      className="border-[#E2E8F0] pr-10 focus-visible:ring-[#7A1C2C]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-[#64748B] hover:text-[#1E252D]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    defaultChecked
                    style={{ accentColor: "#7A1C2C" }}
                    className="h-4 w-4 rounded border-[#CBD5E1]"
                  />
                  <Label
                    htmlFor="remember"
                    className="cursor-pointer text-xs font-normal text-[#64748B]"
                  >
                    Keep me signed in on this device
                  </Label>
                </div>

                <Button
                  id="signin-btn"
                  type="submit"
                  disabled={loading}
                  className="h-auto w-full bg-[#7A1C2C] py-2.5 text-sm font-semibold text-white shadow-none hover:bg-[#631724]"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <Separator className="my-5 bg-[#E2E8F0]" />

              <div className="text-center text-xs text-[#64748B]">
                Don&apos;t have an account?{" "}
                <Link href="/login" className="font-semibold text-[#7A1C2C] hover:underline">
                  Request Access
                </Link>
              </div>

              <div className="mt-5 rounded-md border border-[#FDE68A] bg-[#FDF3DA] p-3">
                <div className="mb-1 text-xs font-semibold text-[#92661A]">Demo Credentials</div>
                <div className="font-mono text-xs text-[#B45309]">
                  ashan@lankatech.lk / demo1234
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
