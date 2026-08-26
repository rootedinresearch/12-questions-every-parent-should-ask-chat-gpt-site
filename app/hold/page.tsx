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
        <Link href="/" className="answers-brand" aria-label="British Swim School parent guide"><img src="/bss-logo.png" alt="British Swim School — Every Age. Every Stage." /></Link>
        <a className="header-call" href="tel:+18179735455">817-973-5455</a>
      </header>
      <section className="hold-hero">
        <div><p className="answers-kicker">All About British Swim School of Arlington, Grand Prairie, and Mansfield</p><h1>Let’s find your class time.</h1><p>Answer a few questions about your swimmer. We’ll estimate the right starting level, then text you the open class times that fit your schedule.</p></div>
        <div className="hold-timeline" aria-label="What happens next"><span><b>1</b><strong>Share details</strong><small>Family and swimmer information</small></span><span><b>2</b><strong>Confirm level</strong><small>We identify the right starting point</small></span><span><b>3</b><strong>Choose a class</strong><small>We review current availability</small></span><span><b>4</b><strong>Get your options</strong><small>We text you the class times that fit</small></span></div>
      </section>

      <section className="hold-content">
        <HoldForm />
        <aside className="hold-options">
          <p className="answers-kicker">Know your options</p>
          <h2>A class match and a trial are different.</h2>
          <article className="option-card hold-option"><span>Free · No obligation</span><h3>Personal Class Match</h3><p>Share your swimmer’s details and we’ll check current openings at your preferred pool and text you what fits. No payment, no commitment.</p></article>
          <article className="option-card trial-option"><span>Money-back guarantee</span><h3>Two-Class Trial</h3><p>You enroll in regular lessons and pay the full monthly tuition and enrollment fee. Attend two consecutive classes. If it is not the right fit after class two, we refund the tuition and enrollment fee in full.</p></article>
          <Link className="options-link" href="/answers#pricing">Compare monthly pricing →</Link>
        </aside>
      </section>
      <footer className="answers-footer"><span>Locally owned by Greg &amp; Melissa Hladik</span><Link href="/answers">Pricing, flexibility &amp; trial details →</Link></footer>
    </main>
  );
}
