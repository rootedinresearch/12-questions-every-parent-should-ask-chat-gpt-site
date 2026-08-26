"use client";

import Link from "next/link";

import { useEffect, useRef, useState } from "react";

type Question = { category: string; question: string; why: string; answer: string };

const questions: Question[] = [
  { category: "Safety & staff", question: "Is there a certified lifeguard on duty during every single lesson?", why: "Not every swim program has a certified lifeguard present throughout lesson times. Ask whether a lifeguard is always on duty whenever lessons are taking place.", answer: "At British Swim School, a certified lifeguard is always on duty during lessons." },
  { category: "Safety & staff", question: "Are the instructors mature, trained professionals—not seasonal high-school staff?", why: "Consistency, judgment, and real training matter. Ask about background checks, staff training, and how long instructors typically stay.", answer: "Our trained, background-checked instructors follow a proven curriculum and treat water safety as serious work." },
  { category: "Curriculum & teaching", question: "Does the program teach survival-first skills before swim strokes?", why: "A beautiful freestyle is not the first priority in an unexpected water situation. Ask when your child will learn to roll, float on their back, breathe, and reach the wall.", answer: "Safe first. Swimmer second. We teach the back float and other lifesaving survival skills before advancing to strokes." },
  { category: "Curriculum & teaching", question: "How long has the curriculum been in use—and where was it developed?", why: "A curriculum refined over decades and taught across many schools has been tested in more situations than a newly assembled program.", answer: "British Swim School's survival-first curriculum has more than 45 years of development behind it." },
  { category: "Curriculum & teaching", question: "What is the student-to-instructor ratio?", why: "The right ratio depends on age and skill level. Beginners need close attention, while advanced swimmers can work well in slightly larger, active groups.", answer: "Our survival levels are kept to small groups of up to 4 swimmers. Advanced stroke levels may have up to 6." },
  { category: "Curriculum & teaching", question: "Is there a trial option—and how many classes do you get?", why: "One lesson is rarely enough to judge the fit. Two classes give your child time to understand the routine and give you a more honest look at the program.", answer: "Our 2-Class Money-Back Trial refunds tuition and the enrollment fee if it is not the right fit after the first two consecutive lessons." },
  { category: "Curriculum & teaching", question: "How is progress measured, and how will I know my child is advancing?", why: "A good program should show you a clear skill path and explain exactly what your swimmer is practicing—not leave you guessing until a session ends.", answer: "Students follow a clear skill progression and move up when they are ready. Every first lesson also includes an assessment to confirm placement." },
  { category: "Family life & flexibility", question: "Is the program year-round, or built around seasonal sessions?", why: "Long breaks can turn spring into a season of relearning. Year-round practice helps swimmers build on their progress without repeatedly starting over.", answer: "Our lessons run year-round in heated indoor pools, with enrollment available throughout the year." },
  { category: "Family life & flexibility", question: "Will my child have the same instructor each week, at the same time?", why: "A predictable instructor and schedule build trust for your swimmer—and make family life much easier to plan.", answer: "Families reserve a consistent weekly class time with the same instructor whenever staffing permits." },
  { category: "Family life & flexibility", question: "If we need to pause for travel, illness, or sports—what happens?", why: "Life happens. Ask how pauses work, how many makeups you receive, and whether those credits expire.", answer: "We offer a Pause Program, and makeup credits do not expire while your account remains active. Advance notice requirements apply." },
  { category: "Family life & flexibility", question: "Is pricing flat and predictable—or are there surprise charges?", why: "Ask about enrollment fees, fifth-lesson months, cancellation notice, and every charge that may appear later. The full cost should be easy to understand.", answer: "We explain tuition, enrollment fees, billing, and our 30-day pause or cancellation policy up front. Enrollment is month-to-month with no long-term contract." },
  { category: "Family life & flexibility", question: "How many locations are there, and can I switch if life changes?", why: "A new job, school schedule, or move across town can change what works. Nearby options make it easier to stay consistent.", answer: "Our locally owned school offers three convenient pools across Arlington, Mansfield, and Grand Prairie." },
];



const totalSlides = questions.length + 2;

const LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbyUCakByl8j40MxtKBkAqR5VT9zUbvE0-WK7Jltd47RN_MO9cIEipEXTWpW5fLQ2wqk3Q/exec";

export default function Home() {
  const [slide, setSlide] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [pdfEmail, setPdfEmail] = useState("");
  const [pdfSent, setPdfSent] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const touchStart = useRef<number | null>(null);

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfEmail) return;
    setPdfLoading(true);
    const payload = JSON.stringify({
      submittedAt: new Date().toISOString(),
      message: `Requested 12 Questions PDF Guide for: ${pdfEmail}`,
      family: {
        firstName: "PDF Request",
        lastName: "",
        email: pdfEmail,
        phone: "",
        smsConsent: false
      },
      referral: {
        source: "12 Questions Site",
        friendName: "",
        other: ""
      },
      swimmers: []
    });
    try {
      const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
      navigator.sendBeacon(LEAD_ENDPOINT, blob);
    } catch {
      fetch(LEAD_ENDPOINT, { method: "POST", mode: "no-cors", keepalive: true, headers: { "content-type": "text/plain;charset=utf-8" }, body: payload }).catch(() => {});
    }
    setPdfSent(true);
    setPdfLoading(false);
    
    // Logging to Sheet is enough, no mail client redirect needed
  };
  const isIntro = slide === 0;
  const isFinish = slide === totalSlides - 1;
  const currentQuestion = !isIntro && !isFinish ? questions[slide - 1] : null;
  const go = (next: number) => {
    setAnswerRevealed(false);
    setSlide(Math.max(0, Math.min(totalSlides - 1, next)));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") go(slide + 1);
      if (event.key === "ArrowLeft") go(slide - 1);
      if (event.key === "Home") go(0);
      if (event.key === "End") go(totalSlides - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slide]);

  return (
    <main className="site-shell">
      <div className="water-lines" aria-hidden="true" />
      <header className="topbar">
        <button className="brand" onClick={() => go(0)} aria-label="Return to the beginning"><img src="/bss-logo.png" alt="British Swim School — Every Age. Every Stage." /></button>
        <div className="counter" aria-live="polite">{isIntro ? "Parent guide" : isFinish ? "Your next step" : `Question ${slide} of 12`}</div>
      </header>

      <div className="carousel-frame">
        <button className="nav-button side-nav side-nav-back" onClick={() => go(slide - 1)} disabled={isIntro} aria-label="Previous slide">←</button>
        <section className="carousel-stage" aria-roledescription="carousel" aria-label="12 questions every parent should ask before enrolling in swim lessons"
          onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
          onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = touchStart.current - event.changedTouches[0].clientX; if (Math.abs(distance) > 45) go(slide + (distance > 0 ? 1 : -1)); touchStart.current = null; }}>
          <article className={`slide-card ${isIntro ? "intro-card" : ""} ${isFinish ? "finish-card" : ""}`} key={slide}>
          {isIntro && <>
            <div className="eyebrow">A 3-minute parent resource</div>
            <h1><span>12 questions</span> every parent should ask before enrolling in swim lessons.</h1>
            <p className="intro-copy">Most swim schools look similar from the outside. These questions reveal the safety, teaching, and family-fit details that matter once lessons begin.</p>
            <div className="promise-row" aria-label="Guide topics"><span>Safety</span><i /><span>Teaching</span><i /><span>Flexibility</span></div>
            <button className="primary-button start-button" onClick={() => go(1)}>Start with question 1 <span aria-hidden="true">→</span></button>
            <p className="swipe-hint">Swipe, tap, or use your arrow keys</p>
          </>}

          {currentQuestion && <>
            <div className="question-meta"><span className="question-number">{String(slide).padStart(2, "0")}</span><span className="eyebrow">{currentQuestion.category}</span></div>
            <h2>{currentQuestion.question}</h2>
            <div className="insight-block"><span className="mini-label">Why it matters</span><p>{currentQuestion.why}</p></div>
            <div className={`answer-reveal ${answerRevealed ? "is-open" : ""}`}>
              <button
                className="reveal-button"
                type="button"
                onClick={() => setAnswerRevealed((revealed) => !revealed)}
                aria-expanded={answerRevealed}
                aria-controls={`answer-${slide}`}
              >
                <span className="reveal-icon" aria-hidden="true">{answerRevealed ? "✓" : "?"}</span>
                <span className="reveal-copy">
                  <span className="mini-label">How does British Swim School answer?</span>
                  <strong>{answerRevealed ? "Our answer" : "Tap to reveal our answer"}</strong>
                </span>
                <span className="reveal-arrow" aria-hidden="true">⌄</span>
              </button>
              <div className="answer-panel" id={`answer-${slide}`} aria-hidden={!answerRevealed}>
                <div className="answer-panel-inner"><p>{currentQuestion.answer}</p></div>
              </div>
            </div>
          </>}

          {isFinish && <>
            <div className="finish-mark" aria-hidden="true">✓</div>
            <div className="eyebrow">You know what to ask</div>
            <h2>Select your pricing, location, and class times.</h2>
            <p className="finish-copy">Compare our plans, view available schedules, or request your parent guide PDF below. You can also text or email us anytime.</p>
            <div className="location-list select-flow-list">
              <Link href="/answers" className="location-link">
                <span><strong>Pricing &amp; Locations</strong><small>View our plans, prices, and indoor pools</small></span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/hold" className="location-link">
                <span><strong>Find My Class Time</strong><small>Use our starting level estimator</small></span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/hold" className="location-link">
                <span><strong>Instant Family Quote</strong><small>Get a quick tuition estimate</small></span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            {pdfSent ? (
              <div className="pdf-success-box">
                <strong>✓ Request Sent!</strong>
                <p>We have received your request and will email the PDF copy to: {pdfEmail}</p>
              </div>
            ) : (
              <div className="pdf-request-box">
                <h3>Want a PDF copy of this guide?</h3>
                <form onSubmit={handlePdfSubmit} className="pdf-form">
                  <input type="email" placeholder="Enter your email address" required value={pdfEmail} onChange={(e) => setPdfEmail(e.target.value)} disabled={pdfLoading} />
                  <button type="submit" disabled={pdfLoading}>{pdfLoading ? "Sending..." : "Email Me the PDF"}</button>
                </form>
              </div>
            )}

            <p className="no-pressure">2-Class Money-Back Trial · No long-term contracts · No pressure</p>
          </>}
          </article>
        </section>
        <button className="nav-button side-nav side-nav-next" onClick={() => go(slide + 1)} disabled={isFinish} aria-label="Next slide">→</button>
      </div>

      <nav className="carousel-nav" aria-label="Carousel controls">
        <div className="progress" aria-label={`Slide ${slide + 1} of ${totalSlides}`}>{Array.from({ length: totalSlides }).map((_, index) => <button key={index} onClick={() => go(index)} className={index === slide ? "active" : ""} aria-label={`Go to ${index === 0 ? "introduction" : index === totalSlides - 1 ? "next steps" : `question ${index}`}`} aria-current={index === slide ? "step" : undefined} />)}</div>
      </nav>
      <Link className="carousel-utility-link" href="/answers">View pricing &amp; class times →</Link>

      <footer><span>Locally owned by Greg &amp; Melissa Hladik</span><span className="footer-dot">•</span><a href="tel:+18179735455">817-973-5455</a></footer>
    </main>
  );
}
