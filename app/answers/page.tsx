import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing, Availability & Getting Started | British Swim School",
  description: "Quick answers about swim lesson pricing, availability, flexibility, starting levels, trial classes, and enrollment in Arlington, Mansfield, and Grand Prairie.",
};

const locations = [
  { name: "Arlington", detail: "LA Fitness · Little Road", href: "https://britishswimschool.com/arlington-south-grand-prairie/location/arlington-la-fitness-little-road/" },
  { name: "Mansfield", detail: "24 Hour Fitness · Walnut Creek", href: "https://britishswimschool.com/arlington-south-grand-prairie/location/mansfield-24-hour-fitness/" },
  { name: "Grand Prairie", detail: "LA Fitness · I-20", href: "https://britishswimschool.com/arlington-south-grand-prairie/location/grand-prairie-la-fitness/" },
];

const pricing = [
  { group: "Under 3", starting: "$114.99", rows: [["ELITE · Unlimited Swim*", "$399.99"], ["STANDARD · 2 days/week", "$199.99"], ["FOUNDATION · 1 day/week", "$114.99"]], note: "SEAHORSE is priced separately." },
  { group: "Ages 3–12", starting: "$139.99", rows: [["ELITE · Unlimited Swim*", "$449.99"], ["STANDARD · 2 days/week", "$249.99"], ["FOUNDATION · 1 day/week", "$139.99"]] },
  { group: "Adult & Young Adult", starting: "$159.99", rows: [["ELITE · Unlimited Swim*", "$499.99"], ["STANDARD · 2 days/week", "$299.99"], ["FOUNDATION · 1 day/week", "$159.99"]] },
  { group: "DOLPHIN · Adaptive", starting: "$249.99", rows: [["Semi-private · 2:1 ratio", "$249.99"], ["Private · 1:1 lesson", "$499.99"]] },
];

export default function AnswersPage() {
  return (
    <main className="answers-shell">
      <header className="answers-header">
        <Link href="/" className="answers-brand" aria-label="British Swim School parent guide"><img src="/bss-logo.png" alt="British Swim School — Every Age. Every Stage." /></Link>
        <a className="header-call" href="tel:+18179735455">817-973-5455</a>
      </header>

      <section className="answers-hero">
        <p className="answers-kicker">Quick answers for your family</p>
        <h1>Still thinking about swim lessons?</h1>
        <p>Here are the answers families ask us for most—pricing, available class times, flexibility, starting level, and how our two-class trial works.</p>
        <nav className="topic-nav" aria-label="Jump to a topic">
          <a href="#pricing">Pricing</a><a href="#flexibility">Flexibility</a><a href="#trial">Trial classes</a><a href="#starting-level">Starting level</a><a href="#availability">Availability</a><Link href="/hold">Find my class time</Link><a href="#enroll">Enroll now</a>
        </nav>
      </section>

      <section className="answer-section" id="pricing">
        <div className="section-heading"><span>01</span><div><p>Pricing</p><h2>Choose the pace that fits your goals.</h2></div></div>
        <p className="section-intro">Your monthly tuition is based on age, program, and how often your swimmer attends. More time in the water builds confidence and skills faster. For most families, <strong>STANDARD—two lessons each week—is the best balance of progress, consistency, and value.</strong></p>
        <div className="pace-guide" aria-label="Compare our three lesson paces">
          <article className="pace-option elite-pace"><span>Maximum momentum</span><h3>ELITE</h3><strong>Unlimited Swim*</strong><p>Our highest-frequency option for families who want the most possible pool time.</p></article>
          <article className="pace-option standard-pace"><span>Recommended · Most popular</span><h3>STANDARD</h3><strong>2 lessons each week</strong><p>More repetition between lessons helps skills stick and keeps progress moving.</p></article>
          <article className="pace-option foundation-pace"><span>Steady start</span><h3>FOUNDATION</h3><strong>1 lesson each week</strong><p>A consistent weekly option for families who need a lighter schedule.</p></article>
        </div>
        <div className="pricing-grid">
          {pricing.map((plan) => (
            <article className="pricing-card" key={plan.group}>
              <div className="price-top"><h3>{plan.group}</h3><p>Starting at</p><div className="starting-price"><strong>{plan.starting}</strong><span>/month</span></div></div>
              <ul>{plan.rows.map(([label, amount]) => {
                const recommended = label.startsWith("STANDARD");
                return <li className={recommended ? "recommended-price" : ""} key={label}>
                  <span>{label}{recommended && <em>Recommended</em>}</span>
                  <strong className="monthly-amount">{amount}<b>/mo</b></strong>
                </li>;
              })}</ul>
              {plan.note && <small>{plan.note}</small>}
            </article>
          ))}
        </div>
        <div className="pricing-notes">
          <div><strong>Enrollment fee</strong><span>$49.99 per swimmer · $59.99 family maximum</span></div>
          <div><strong>Sibling savings</strong><span>10% off monthly tuition for each additional child</span></div>
          <div><strong>Prepay savings</strong><span>Save 15% when you prepay six months of tuition</span></div>
        </div>
      </section>

      <section className="answer-section alt-section" id="flexibility">
        <div className="section-heading"><span>02</span><div><p>Flexibility</p><h2>Built for real family schedules.</h2></div></div>
        <ul className="check-list" style={{ maxWidth: '680px', margin: '25px auto 0' }}>
          <li>Month-to-month enrollment with no long-term contract</li>
          <li>30-day notice to pause or cancel</li>
          <li>Change your lesson pace with notice</li>
          <li>Makeup credits do not expire while your account remains active</li>
        </ul>
      </section>

      <section className="trial-section" id="trial">
        <div className="trial-badge">3</div>
        <div><p className="answers-kicker">Two-class money-back trial</p><h2>Give your swimmer time to settle in.</h2><p>The trial is secured through regular enrollment, so full monthly tuition and the enrollment fee are charged when you enroll. Attend the first two consecutive classes. If we are not the right fit after class two, we will refund all tuition paid and the enrollment fee. No questions asked.</p></div>
      </section>

      <section className="answer-section" id="starting-level">
        <div className="section-heading"><span>04</span><div><p>Starting level</p><h2>We will help place your swimmer.</h2></div></div>
        <div style={{ maxWidth: '680px', margin: '25px auto 0' }}>
          <p>Level is based on age, comfort, and current skills—not just whether someone has taken lessons before.</p>
          <div className="level-list">
            <span><strong>Under 3</strong> Parent-and-child and early survival levels</span>
            <span><strong>Ages 3–12</strong> Water acclimation, survival, or stroke levels</span>
            <span><strong>Teens & adults</strong> Beginner through advanced instruction</span>
            <span><strong>DOLPHIN</strong> Adaptive aquatics with individualized support</span>
          </div>
          <p className="assessment-note" style={{ marginTop: '18px' }}>Your first lesson includes an assessment. If the starting level is not right, we adjust placement.</p>
        </div>
      </section>

      <section className="answer-section alt-section" id="availability">
        <div className="section-heading"><span>05</span><div><p>Availability</p><h2>See live class times at your preferred pool.</h2></div></div>
        <p className="section-intro">Availability changes as families enroll and move up. Choose a location to see the most current schedule and open classes.</p>
        <div className="answers-location-grid">
          {locations.map((location) => <a href={location.href} target="_blank" rel="noreferrer" key={location.name}><span><strong>{location.name}</strong><small>{location.detail}</small></span><b aria-hidden="true">→</b></a>)}
        </div>
      </section>

      <section className="hold-callout">
        <div><p className="answers-kicker">Not sure where to start?</p><h2>We’ll find the class that fits.</h2><p>No credit card and no charge. Share a few family and swimmer details, and our local team will confirm the right level and text you the available class times.</p></div>
        <Link href="/hold">Find my class time →</Link>
      </section>

      <section className="enroll-section" id="enroll">
        <p className="answers-kicker">Ready when you are</p>
        <h2>Find the right class and jump on in.</h2>
        <p>Choose your pool to view schedules and enroll—or reach out and a real member of our local team will help.</p>
        <div className="enroll-actions">
          <Link className="enroll-primary" href="/hold">Find my class time</Link>
          <a href="#availability">View schedules &amp; enroll</a>
          <a href="sms:+18179735455?body=Hi%20British%20Swim%20School!%20I%20have%20a%20question%20about%20pricing%20or%20finding%20the%20right%20class.">Text us</a>
          <a href="mailto:goswimarlsgpra@britishswimschool.com?subject=Help%20finding%20the%20right%20swim%20class">Email us</a>
        </div>
        <small>Arlington · Mansfield · Grand Prairie</small>
      </section>

      <footer className="answers-footer"><span>Locally owned by Greg &amp; Melissa Hladik</span><Link href="/">Explore the 12-question parent guide →</Link></footer>
    </main>
  );
}
