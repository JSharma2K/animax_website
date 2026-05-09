import { motion, useScroll, useTransform } from 'motion/react';
import { Play, CheckCircle2, Activity, Users2, Dumbbell, ArrowRight, PhoneCall, ShieldCheck } from 'lucide-react';
import { useState, useRef } from 'react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';

export default function App() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

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

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-50 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="bg-emerald-500/10 p-1.5 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tighter text-white">ANIMAX</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {[
              { name: 'How it works', href: '#how-it-works' },
              { name: 'Coaching', href: '#coaches' },
              { name: 'Results', href: '#reviews' }
            ].map((item) => (
              <a 
                key={item.name} 
                href={item.href} 
                className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors duration-300"
              >
                {item.name}
              </a>
            ))}
          </div>

          <button className="bg-emerald-500 text-black px-6 py-2.5 rounded-full text-sm font-bold hover:scale-105 hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-300">
            Book Free Call
          </button>
        </div>
      </motion.nav>

      <main ref={containerRef} className="relative">
        {/* Hero Section */}
        <section className="relative pt-40 pb-20 px-6 min-h-[90vh] flex flex-col items-center">
          <motion.div 
            style={{ y: y1, opacity: opacity1 }}
            className="w-full max-w-5xl mx-auto text-center z-10"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Elite Fitness Coaching
            </motion.div>
            
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
              className="text-lg md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed"
            >
              Work with an elite coaching team who builds your roadmap, tracks your progress, and guarantees your success.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="flex justify-center"
            >
              <button className="flex items-center gap-3 bg-emerald-500 text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-400 hover:scale-105 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <PhoneCall className="w-5 h-5" /> Book Your Free Call
              </button>
            </motion.div>
          </motion.div>

          {/* Focal Promotional Video Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            className="w-full max-w-6xl mx-auto relative z-20 group cursor-pointer mt-16"
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />
                  
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

        {/* Stats Marquee Strip */}
        <section className="border-y border-white/5 bg-zinc-900/30 overflow-hidden py-8">
          <div className="flex gap-16 md:gap-32 px-6 items-center w-max animate-[marquee_40s_linear_infinite] opacity-70">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-16 md:gap-32 items-center">
                <div className="flex flex-col"><span className="text-3xl font-bold text-white">98%</span><span className="text-sm text-zinc-500 uppercase tracking-widest">Goal Achievement</span></div>
                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                <div className="flex flex-col"><span className="text-3xl font-bold text-white">100%</span><span className="text-sm text-zinc-500 uppercase tracking-widest">Money Back Guarantee</span></div>
                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                <div className="flex flex-col"><span className="text-3xl font-bold text-white">24/7</span><span className="text-sm text-zinc-500 uppercase tracking-widest">Coach Support</span></div>
                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                <div className="flex flex-col"><span className="text-3xl font-bold text-white">500+</span><span className="text-sm text-zinc-500 uppercase tracking-widest">Success Stories</span></div>
                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        {/* What You Get Section */}
        <section id="how-it-works" className="py-32 px-6 relative">
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
                    
                    <button className="inline-flex items-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors self-start mt-auto">
                      {idx === 0 ? "Join the Community" : "Claim Your Guarantee"} <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Deep Dive / Coaching Section */}
        <section className="py-32 px-6 bg-zinc-900/30 border-y border-white/5 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="order-2 lg:order-1 space-y-8"
              >
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">Expert guidance, <span className="text-emerald-400">every step of the way.</span></h2>
                <p className="text-xl text-zinc-400">Your dedicated coach reviews your progress, adjusts your plan, and keeps you accountable. No more guessing—just guaranteed results.</p>
                
                <div className="space-y-6 pt-6">
                  {[
                    "Step-by-step guidance for every movement",
                    "Direct 24/7 access to your expert coach",
                    "Custom nutrition and macro planning",
                    "100% Money-back guarantee"
                  ].map((text, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div className="mt-1 bg-emerald-500/20 p-1.5 rounded-full">
                        {i === 3 ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <span className="text-lg text-zinc-300">{text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-8">
                  <button className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-zinc-200 transition-colors">
                    <PhoneCall className="w-5 h-5" /> Book a Free Consultation
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="order-1 lg:order-2 relative"
              >
                <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
                <div className="relative rounded-[2.5rem] bg-zinc-900 border border-white/10 p-4 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-700">
                  <div className="rounded-[2rem] overflow-hidden bg-black aspect-[3/4] relative">
                    <ImageWithFallback 
                      src="https://images.unsplash.com/photo-1695892046204-ec2962b26b48?auto=format&fit=crop&q=80&w=1080" 
                      alt="Coach Consultation"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-emerald-400 font-semibold tracking-wider uppercase text-sm">Elite Coach Match</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl">
                        <p className="text-base font-bold text-white mb-2">Coach Marcus</p>
                        <p className="text-zinc-300 text-sm leading-relaxed">"I've built a custom 12-week roadmap specifically for your goals. We're going to transform your physique and build habits that last a lifetime. Let's get to work!"</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 text-black px-10 py-5 rounded-full font-bold text-xl hover:scale-105 hover:bg-emerald-400 transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <PhoneCall className="w-6 h-6" /> Book a Free Call
              </button>
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent text-white border border-white/20 px-10 py-5 rounded-full font-bold text-xl hover:bg-white/5 transition-all duration-300">
                <Users2 className="w-6 h-6" /> Join a Pod
              </button>
            </div>
          </motion.div>
        </section>

        {/* Minimal Footer */}
        <footer className="border-t border-white/5 py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span className="text-xl font-bold tracking-tighter text-white">ANIMAX</span>
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
      `}} />
    </div>
  );
}
