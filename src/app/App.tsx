import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { Play, CheckCircle2, Users2, ArrowRight, PhoneCall, ShieldCheck, Menu, X, Target, CalendarCheck, Flame, TrendingUp, Download } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import type { ComponentType } from 'react';
import Lenis from 'lenis';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import animaxLogo from '../../assets/animax_logo_style_1.png';

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

const bookingUrl = normalizeBookingUrl(import.meta.env.VITE_CALENDLY_URL || import.meta.env.VITE_CAL_LINK);

const quizQuestions = [
  'Do you feel your current routine is moving you toward the body you want?',
  'Do you often restart after a few good days instead of staying consistent?',
  'Would a clear plan make it easier for you to show up each week?',
  'Are you ready to be coached instead of guessing what to do next?',
];

const quizDownloadFiles = [
  {
    title: '3-week diet plan',
    href: '/downloads/animax-3-week-diet-plan.pdf',
  },
  {
    title: '3-week workout plan',
    href: '/downloads/animax-3-week-workout-plan.pdf',
  },
  {
    title: '3-week supplement stack',
    href: '/downloads/animax-3-week-supplement-stack.pdf',
  },
];

const initialQuizAnswers = {
  age: '',
  gender: '',
  weight: '',
  height: '',
  name: '',
  email: '',
  phone: '',
  goal: '',
  consent: false,
  answers: quizQuestions.map(() => ''),
};

export default function App() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState(initialQuizAnswers);
  const [quizState, setQuizState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const bookingButtonProps = {
    onClick: openBookingPopup,
  };
  const quizButtonProps = {
    onClick: () => {
      setQuizState('idle');
      setQuizStep(0);
      setIsQuizOpen(true);
    },
  };

  useEffect(() => {
    if (!bookingUrl) {
      console.warn('VITE_CAL_LINK or VITE_CALENDLY_URL is not configured.');
      return;
    }

    loadCalendlyAssets();
  }, []);

  useEffect(() => {
    let animationFrameId = 0;

    const handleScroll = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0;
        setScrolled((current) => {
          const scrollY = window.scrollY;
          const next = current ? scrollY > 24 : scrollY > 72;
          return current === next ? current : next;
        });
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (scrolled) {
      setMobileMenuOpen(false);
    }
  }, [scrolled]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    let animationFrameId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    };

    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  const features = [
    {
      title: "Join Our Transformation Pod",
      description: "Evolve and transform with an elite dedicated gym community.",
      icon: Users2,
      img: "https://images.unsplash.com/photo-1770513649465-2c60c8039806?auto=format&fit=crop&q=80&w=1080"
    },
    {
      title: "Ready to take things to the next level?",
      description: "Sign up for 1-1 coaching. Book a free call with our expert with a promised 100% money back guarantee.",
      icon: PhoneCall,
      img: "https://images.unsplash.com/photo-1695892046204-ec2962b26b48?auto=format&fit=crop&q=80&w=1080"
    }
  ];
  const navItems = [
    { name: 'How it works', href: '#video' },
    { name: 'Coaching', href: '#coaching-options' },
    { name: 'Results', href: '#results' }
  ];
  const resultCards = [
    {
      title: 'Consistency that sticks',
      description: 'Weekly targets, coach check-ins, and habit loops that keep you moving after motivation dips.',
      stat: '98%',
      label: 'goal follow-through',
      icon: CalendarCheck,
    },
    {
      title: 'Stronger every block',
      description: 'Your plan progresses with your body so training feels focused, measurable, and repeatable.',
      stat: '12 wk',
      label: 'guided roadmap',
      icon: TrendingUp,
    },
    {
      title: 'Built around your life',
      description: 'Travel, busy weeks, missed sessions, equipment limits: your coach adjusts without derailing you.',
      stat: '24/7',
      label: 'coach support',
      icon: Target,
    },
    {
      title: 'Momentum you can feel',
      description: 'Small wins compound into visible change, better energy, and confidence in how you train.',
      stat: '500+',
      label: 'member wins',
      icon: Flame,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-50 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed left-0 right-0 top-0 z-50 pointer-events-none"
      >
        <div className={`mx-auto pl-2 pr-6 transition-[padding] duration-500 ease-out ${scrolled ? 'max-w-none py-1' : 'max-w-none py-2'}`}>
          <div className="relative -translate-y-3 flex items-center justify-between">
            <a
              href="#"
              className={`pointer-events-auto flex items-center group transition-all duration-300 ${
                scrolled ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
              }`}
            >
              <span className="block h-32 w-[204px] shrink-0 overflow-visible">
                <img
                  src={animaxLogo}
                  alt="Animax Coaching"
                  className="block h-full w-full object-contain transform-gpu"
                  width={800}
                  height={534}
                  decoding="async"
                />
              </span>
            </a>

            <ul
              className={`hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.22em] leading-none transition-all duration-300 ${
                scrolled ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'
              }`}
              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 400 }}
            >
              {navItems.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-white/60 hover:text-white transition-colors relative group"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gradient-to-r from-emerald-400 to-white/80 transition-all duration-300 group-hover:w-full" />
                  </a>
                </li>
              ))}
            </ul>

            <div className={`flex items-center gap-3 transition-all duration-300 ${
              scrolled ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'
            }`}>
              <button {...bookingButtonProps} className="group hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400 transition-colors duration-300 hover:text-emerald-300 sm:flex">
                Book Your Free Call
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white transition-colors hover:text-emerald-300"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && !scrolled ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pointer-events-auto mt-6 border-t border-white/10 pt-6 pb-6 md:hidden"
            >
              <ul className="space-y-4">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="block py-2 text-sm uppercase tracking-[0.18em] text-white/80 transition-colors hover:text-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
                <li>
                  <button {...bookingButtonProps} className="mt-2 flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400 transition-colors hover:text-emerald-300">
                    Book Your Free Call
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </li>
              </ul>
            </motion.div>
          ) : null}
        </div>
      </motion.nav>

      <main ref={containerRef} className="relative">
        {/* Hero Section */}
        <section className="relative pt-52 pb-20 px-6 min-h-[90vh] flex flex-col items-center">
          <motion.div 
            style={{ y: y1, opacity: opacity1 }}
            className="w-full max-w-5xl mx-auto text-center z-10"
          >
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.1] mb-6"
            >
              Get ready to <span className="text-emerald-400 italic pr-2">transform</span>
              <br /> your life.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-lg md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-16 font-light leading-relaxed"
            >
              Work with an elite coaching team who builds your roadmap, tracks your progress, and guarantees your success.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="relative flex justify-center"
            >
              <div className="flex flex-col items-center gap-2">
                <button {...quizButtonProps} className="group flex items-center gap-3 text-lg font-bold uppercase tracking-[0.14em] text-emerald-400 transition-colors hover:text-emerald-300">
                  Start Your Transformation
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                <button {...quizButtonProps} className="text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300">
                  Take our quiz
                </button>
              </div>
            </motion.div>
          </motion.div>

          {/* Focal Promotional Video Section */}
          <motion.div
            id="video"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            className="w-full max-w-6xl mx-auto relative z-20 group cursor-pointer mt-16 scroll-mt-28"
            onClick={() => setIsVideoPlaying(true)}
          >
            <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/20 to-transparent rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-700" />
            <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
              {!isVideoPlaying ? (
                <>
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1679236703546-8a26e1d83918?auto=format&fit=crop&q=80&w=1920" 
                    alt="Animax Video Thumbnail"
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] backdrop-blur-md transition-all duration-300"
                    >
                      <Play className="w-10 h-10 ml-1.5 text-black" fill="currentColor" />
                    </motion.div>
                  </div>
                  
                  {/* Bottom Info Overlay */}
                  <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div>
                        <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">See how our coaching transforms lives</h3>
                        <p className="text-zinc-400 text-lg">2 minute walkthrough of what to expect</p>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 backdrop-blur-md">
                        <Play className="w-4 h-4" fill="currentColor" /> Watch Video
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black/90">
                  <Play className="w-16 h-16 text-emerald-500 mb-4 opacity-50 animate-pulse" />
                  <p className="text-zinc-400 font-medium">Video Player Initializing...</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsVideoPlaying(false); }}
                    className="mt-6 text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Close Video
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* Results Section */}
        <section id="results" className="relative overflow-hidden bg-black py-28 scroll-mt-28">
          <div className="mx-auto mb-16 max-w-7xl px-6">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Real coaching. Real momentum.</p>
                <h2 className="text-5xl font-bold tracking-tighter text-white md:text-7xl">We get <span className="text-emerald-400 italic">results.</span></h2>
              </div>
              <p className="max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
                The goal is not another plan sitting in your notes. It is a system that helps you train, adjust, and keep showing up until change becomes obvious.
              </p>
            </div>
          </div>

          <div className="space-y-6 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex w-max gap-6 animate-[results-marquee_36s_linear_infinite]">
              {[...resultCards, ...resultCards].map((card, index) => (
                <ResultCard key={`${card.title}-${index}`} card={card} />
              ))}
            </div>
            <div className="flex w-max gap-6 animate-[results-marquee-reverse_40s_linear_infinite]">
              {[...resultCards.slice().reverse(), ...resultCards.slice().reverse()].map((card, index) => (
                <ResultCard key={`${card.title}-reverse-${index}`} card={card} compact />
              ))}
            </div>
          </div>
        </section>

        {/* What You Get Section */}
        <section id="coaching-options" className="py-32 px-6 relative scroll-mt-28">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">Everything you need to <span className="text-emerald-400">succeed.</span></h2>
              <p className="text-xl text-zinc-400 max-w-2xl mx-auto">More than just a workout plan. We provide a complete ecosystem around your fitness journey to guarantee results.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {features.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  className="group relative rounded-[2rem] bg-zinc-900/50 border border-white/5 overflow-hidden hover:border-emerald-500/50 transition-colors duration-500 flex flex-col"
                >
                  <div className="h-64 sm:h-80 relative overflow-hidden shrink-0">
                    <ImageWithFallback 
                      src={feature.img} 
                      alt={feature.title}
                      className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0e] via-zinc-900/40 to-transparent" />
                  </div>
                  <div className="p-8 sm:p-10 flex-grow flex flex-col justify-end bg-gradient-to-b from-[#0d0d0e] to-zinc-900/90">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                      <feature.icon className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-white">{feature.title}</h3>
                    <p className="text-zinc-400 text-lg leading-relaxed mb-8">{feature.description}</p>
                    
                    <button {...(idx === 1 ? bookingButtonProps : {})} className="inline-flex items-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors self-start mt-auto">
                      {idx === 0 ? "Join the Community" : "Claim Your Guarantee"} <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mx-auto mt-16 max-w-6xl rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8 shadow-2xl shadow-emerald-950/10 sm:p-10"
            >
              <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">Not sure where to start?</p>
                  <h3 className="mb-5 text-3xl font-bold tracking-tighter text-white md:text-5xl">Unsure? Book a free consultation.</h3>
                  <p className="text-lg leading-relaxed text-zinc-400">
                    Your dedicated coach reviews your progress, adjusts your plan, and keeps you accountable. No more guessing, just a clear next step.
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    "Step-by-step guidance for every movement",
                    "Direct 24/7 access to your expert coach",
                    "Custom nutrition and macro planning",
                    "100% Money-back guarantee"
                  ].map((text, i) => (
                    <div key={text} className="flex items-start gap-4">
                      <div className="mt-1 rounded-full bg-emerald-500/20 p-1.5">
                        {i === 3 ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                      </div>
                      <span className="text-base text-zinc-300 sm:text-lg">{text}</span>
                    </div>
                  ))}

                  <button {...bookingButtonProps} className="group inline-flex items-center gap-3 pt-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-400 transition-colors hover:text-emerald-300">
                    Book a free consultation
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-950/20" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto relative z-10 text-center"
          >
            <ShieldCheck className="w-20 h-20 text-emerald-400 mx-auto mb-8" />
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8">Ready to start your transformation?</h2>
            <p className="text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto">Join thousands of members who have changed their lives with Animax. 100% money back guarantee.</p>
            <div className="flex items-center justify-center">
              <button {...bookingButtonProps} className="group inline-flex items-center gap-3 text-lg font-bold uppercase tracking-[0.16em] text-emerald-400 transition-colors hover:text-emerald-300">
                Book Your Free Call Now
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* Minimal Footer */}
        <footer className="py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <img
                src={animaxLogo}
                alt="Animax Coaching"
                className="h-32 w-[204px] object-contain"
                width={800}
                height={534}
                decoding="async"
              />
            </div>
            <div className="text-sm text-zinc-500">
              © 2026 Animax Coaching. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-zinc-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Guarantee Policy</a>
            </div>
          </div>
        </footer>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes results-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 0.75rem)); }
        }
        @keyframes results-marquee-reverse {
          0% { transform: translateX(calc(-50% - 0.75rem)); }
          100% { transform: translateX(0); }
        }
      `}} />

      <TransformationQuiz
        answers={quizAnswers}
        isOpen={isQuizOpen}
        state={quizState}
        step={quizStep}
        onAnswerChange={setQuizAnswers}
        onClose={() => setIsQuizOpen(false)}
        onNext={() => setQuizStep((step) => Math.min(step + 1, quizQuestions.length))}
        onPrevious={() => setQuizStep((step) => Math.max(step - 1, 0))}
        onSubmit={async () => {
          setQuizState('submitting');

          try {
            const response = await fetch('/api/leads/interest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: quizAnswers.name,
                email: quizAnswers.email,
                phone: quizAnswers.phone,
                primaryGoal: quizAnswers.goal,
                age: quizAnswers.age,
                gender: quizAnswers.gender,
                weight: quizAnswers.weight,
                height: quizAnswers.height,
                notes: quizQuestions
                  .map((question, index) => `${question} ${quizAnswers.answers[index] || 'Not answered'}`)
                  .join('\n'),
                consentToContact: quizAnswers.consent,
              }),
            });

            if (!response.ok) {
              throw new Error('Lead submission failed');
            }

            setQuizState('success');
          } catch (error) {
            console.error(error);
            setQuizState('error');
          }
        }}
      />
    </div>
  );
}

function ResultCard({
  card,
  compact = false,
}: {
  card: {
    title: string;
    description: string;
    stat: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
  };
  compact?: boolean;
}) {
  const Icon = card.icon;

  return (
    <div className={`group relative flex shrink-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/90 p-6 shadow-2xl shadow-emerald-950/10 transition-colors hover:border-emerald-400/40 ${compact ? 'h-56 w-[22rem]' : 'h-64 w-[24rem]'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-white/[0.03] opacity-70" />
      <div className="relative z-10 flex h-full w-full flex-col justify-between">
        <div className="flex items-start justify-between gap-5">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
            <Icon className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="text-right">
            <div className="text-4xl font-black tracking-tighter text-white">{card.stat}</div>
            <div className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-emerald-300">{card.label}</div>
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-2xl font-bold tracking-tight text-white">{card.title}</h3>
          <p className="text-sm leading-relaxed text-zinc-400">{card.description}</p>
        </div>
      </div>
    </div>
  );
}

type QuizAnswers = typeof initialQuizAnswers;

function TransformationQuiz({
  answers,
  isOpen,
  onAnswerChange,
  onClose,
  onNext,
  onPrevious,
  onSubmit,
  state,
  step,
}: {
  answers: QuizAnswers;
  isOpen: boolean;
  onAnswerChange: (answers: QuizAnswers) => void;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  state: 'idle' | 'submitting' | 'success' | 'error';
  step: number;
}) {
  const detailsStep = quizQuestions.length;
  const totalSteps = quizQuestions.length + 1;
  const isDetailsStep = step >= detailsStep;
  const scrollContainerClassName = [
    'min-h-0 flex-1 overscroll-contain px-6 sm:px-10',
    isDetailsStep
      ? 'overflow-y-scroll pb-32 sm:pb-36 [scrollbar-color:rgba(52,211,153,0.65)_rgba(255,255,255,0.06)] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-400/60 hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300/80'
      : 'overflow-y-auto pb-8',
  ].join(' ');
  const canContinue =
    step < detailsStep
      ? Boolean(answers.answers[step])
      : Boolean(
          answers.name &&
          answers.email &&
          answers.age &&
          answers.gender &&
          answers.weight &&
          answers.height &&
          answers.goal &&
          answers.consent
        );

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-4 backdrop-blur-md sm:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative flex h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#090909] shadow-[0_0_60px_rgba(16,185,129,0.18)] sm:h-[calc(100dvh-4rem)]"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-white/70 to-emerald-300" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:text-white"
              aria-label="Close questionnaire"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 px-6 pt-6 sm:px-10 sm:pt-10">
                <div className="mb-8 flex items-center justify-between gap-4 pr-12">
                <div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Transformation check</p>
                  <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Quick body reset quiz</h2>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
                    Finish it to unlock a free downloadable 3-week diet, workout, and supplement stack.
                  </p>
                </div>
                <div className="hidden text-sm font-bold text-emerald-400 sm:block">
                  {Math.min(step + 1, totalSteps)}/{totalSteps}
                </div>
              </div>

                <div className="mb-8 grid gap-2" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
                  {Array.from({ length: totalSteps }).map((_, item) => (
                    <div key={item} className={`h-1.5 rounded-full ${item <= step ? 'bg-emerald-400' : 'bg-white/10'}`} />
                  ))}
                </div>
              </div>

              <div data-lenis-prevent className={scrollContainerClassName}>
                <AnimatePresence mode="wait">
                  {state === 'success' ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      className="py-8 text-center"
                    >
                      <CheckCircle2 className="mx-auto mb-5 h-14 w-14 text-emerald-400" />
                      <h3 className="mb-3 text-3xl font-bold text-white">Your free stack is ready.</h3>
                      <p className="mx-auto mb-8 max-w-lg text-zinc-400">
                        Download your 3-week diet, workout, and supplement stack below. Drop the PDFs into <span className="font-mono text-emerald-300">public/downloads</span> later using these filenames and the buttons will serve them automatically.
                      </p>
                      <div className="mx-auto mb-8 grid max-w-lg gap-3 sm:grid-cols-3">
                        {quizDownloadFiles.map((file) => (
                          <a
                            key={file.href}
                            href={file.href}
                            download
                            className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-bold text-emerald-300 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/10"
                          >
                            <Download className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                            {file.title}
                          </a>
                        ))}
                      </div>
                      <button {...{ onClick: openBookingPopup }} className="rounded-full bg-emerald-500 px-7 py-3 font-bold text-black transition-colors hover:bg-emerald-400">
                        Book a Free Call
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 22 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -22 }}
                      transition={{ duration: 0.22 }}
                    >
                      {step < detailsStep ? (
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
                            Question {step + 1}
                          </p>
                          <h3 className="mb-8 text-2xl font-bold leading-tight text-white sm:text-3xl">
                            {quizQuestions[step]}
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            {['Yes', 'No'].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  const nextAnswers = [...answers.answers];
                                  nextAnswers[step] = option;
                                  onAnswerChange({ ...answers, answers: nextAnswers });
                                }}
                                className={`min-h-16 rounded-2xl border px-4 py-4 text-lg font-bold transition-all ${
                                  answers.answers[step] === option
                                    ? 'border-emerald-400 bg-emerald-500 text-black'
                                    : 'border-white/10 bg-white/5 text-zinc-200 hover:border-emerald-400/70'
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Final details</p>
                            <h3 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                              Where should we send your free 3-week stack?
                            </h3>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-zinc-300">Name</span>
                              <input
                                value={answers.name}
                                onChange={(event) => onAnswerChange({ ...answers, name: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none transition-colors focus:border-emerald-400"
                                placeholder="Your name"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-zinc-300">Email</span>
                              <input
                                type="email"
                                value={answers.email}
                                onChange={(event) => onAnswerChange({ ...answers, email: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none transition-colors focus:border-emerald-400"
                                placeholder="you@example.com"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-zinc-300">Age</span>
                              <input
                                type="number"
                                min="13"
                                max="100"
                                value={answers.age}
                                onChange={(event) => onAnswerChange({ ...answers, age: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none transition-colors focus:border-emerald-400"
                                placeholder="Age"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-zinc-300">Weight</span>
                              <input
                                value={answers.weight}
                                onChange={(event) => onAnswerChange({ ...answers, weight: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none transition-colors focus:border-emerald-400"
                                placeholder="Example: 78 kg"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-zinc-300">Height</span>
                              <input
                                value={answers.height}
                                onChange={(event) => onAnswerChange({ ...answers, height: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none transition-colors focus:border-emerald-400"
                                placeholder="Example: 5'10 or 178 cm"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-zinc-300">Phone or WhatsApp</span>
                              <input
                                value={answers.phone}
                                onChange={(event) => onAnswerChange({ ...answers, phone: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none transition-colors focus:border-emerald-400"
                                placeholder="Optional"
                              />
                            </label>
                          </div>
                          <div>
                            <span className="mb-3 block text-sm font-semibold text-zinc-300">Gender</span>
                            <div className="grid gap-3 sm:grid-cols-3">
                              {['Female', 'Male', 'Prefer not to say'].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => onAnswerChange({ ...answers, gender: option })}
                                  className={`min-h-14 rounded-2xl border px-4 py-3 font-bold transition-all ${
                                    answers.gender === option
                                      ? 'border-emerald-400 bg-emerald-500 text-black'
                                      : 'border-white/10 bg-white/5 text-zinc-200 hover:border-emerald-400/70'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-zinc-300">Biggest goal right now</span>
                            <textarea
                              value={answers.goal}
                              onChange={(event) => onAnswerChange({ ...answers, goal: event.target.value })}
                              className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none transition-colors focus:border-emerald-400"
                              placeholder="Example: lose fat, build muscle, feel confident again"
                            />
                          </label>
                          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
                            <input
                              type="checkbox"
                              checked={answers.consent}
                              onChange={(event) => onAnswerChange({ ...answers, consent: event.target.checked })}
                              className="mt-1 h-4 w-4 accent-emerald-500"
                            />
                            I agree that Animax can contact me and send my free 3-week diet, workout, and supplement stack using these details.
                          </label>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {state === 'error' ? (
                  <p className="mt-4 text-sm text-red-300">Could not save this locally. On Vercel, this uses the HubSpot API route.</p>
                ) : null}
              </div>

              {state !== 'success' ? (
                <div
                  className="flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 bg-[#090909]/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-between sm:px-10"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  <button
                    type="button"
                    onClick={step === 0 ? onClose : onPrevious}
                    className="py-3 text-xs font-normal uppercase leading-none tracking-[0.22em] text-white transition-colors hover:text-white/70"
                  >
                    {step === 0 ? 'Close' : 'Back'}
                  </button>
                  {step < detailsStep ? (
                    <button
                      type="button"
                      disabled={!canContinue}
                      onClick={onNext}
                      className="py-3 text-xs font-normal uppercase leading-none tracking-[0.22em] text-emerald-400 transition-colors hover:text-emerald-300 disabled:cursor-not-allowed disabled:text-emerald-400/40"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canContinue || state === 'submitting'}
                      onClick={onSubmit}
                      className="py-3 text-xs font-normal uppercase leading-none tracking-[0.22em] text-emerald-400 transition-colors hover:text-emerald-300 disabled:cursor-not-allowed disabled:text-emerald-400/40"
                    >
                      {state === 'submitting' ? 'Saving...' : 'Unlock My Free Stack'}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function normalizeBookingUrl(value?: string) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return '';
  }

  if (/^https?:\/\//.test(rawValue)) {
    return rawValue;
  }

  if (rawValue.includes('calendly.com/')) {
    return `https://${rawValue}`;
  }

  return `https://calendly.com/${rawValue.replace(/^\/+/, '')}`;
}

function loadCalendlyAssets() {
  if (!document.querySelector('link[data-calendly-widget-css="true"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://assets.calendly.com/assets/external/widget.css';
    link.setAttribute('data-calendly-widget-css', 'true');
    document.head.appendChild(link);
  }

  if (!document.querySelector('script[data-calendly-widget-js="true"]')) {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.setAttribute('data-calendly-widget-js', 'true');
    document.body.appendChild(script);
  }
}

function openBookingPopup() {
  if (!bookingUrl) {
    window.open('https://calendly.com/animaxcoaching/free-call', '_blank', 'noopener,noreferrer');
    return;
  }

  if (window.Calendly) {
    window.Calendly.initPopupWidget({ url: bookingUrl });
    return;
  }

  window.open(bookingUrl, '_blank', 'noopener,noreferrer');
}
