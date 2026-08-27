import Link from "next/link";
import type { Metadata } from "next";
import HoldForm from "./HoldForm";

export const metadata: Metadata = {
  title: "Find Your Swim Class Time | British Swim School",
  description: "Tell us about your swimmer and we'll text you the class times that fit.",
};

export default function HoldPage() {
  return (
    <main className="hold-shell">
      <header className="answers-header">
        <Link href="/" className="answers-brand" aria-label="British Swim School parent guide">
          <img src="/bss-logo.png" alt="British Swim School — Every Age. Every Stage." />
        </Link>
        <a className="header-call" href="tel:+18179735455">817-973-5455</a>
      </header>

      <section className="hold-hero">
        <div className="hold-hero-content">
          <h1>Let’s find your class time.</h1>
          <p>Answer a few questions about your swimmer. We’ll estimate the right starting level, then text you the open class times that fit your schedule.</p>
        </div>
      </section>

      <section className="hold-content">
        <HoldForm />
      </section>
    </main>
  );
}
