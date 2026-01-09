import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram, Linkedin, Code, GraduationCap, Sparkles, Trophy, Rocket, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, useAnimation, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";
import { useIsMobile } from "@/hooks/use-mobile";
import InteractiveLogo from "@/components/InteractiveLogo";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll-based fade - track the hero section specifically
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Perfect fade from 0 to 1 as user scrolls past hero
  const fadeOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0, 0.5, 1]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* BLOB CANVAS - Desktop only */}
      {!isMobile && (
        <div className="fixed top-0 left-0 right-0 h-screen pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-cream via-white to-blue-50 dark:from-primary/20 dark:via-background dark:to-blue-950/20"></div>
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-20 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-40 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-20 left-40 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>
        </div>
      )}

      {/* Mobile background - simple gradient */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-screen pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-cream via-white to-blue-50 dark:from-primary/20 dark:via-background dark:to-blue-950/20"></div>
        </div>
      )}

      {/* SCROLL-BASED FADE OVERLAY */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[200vh] bg-cream dark:bg-background pointer-events-none"
        style={{ opacity: fadeOpacity, zIndex: 1 }}
      />

      {/* Content */}
      <div className="relative" style={{ zIndex: 10 }}>
        {/* Hero Section */}
        <section ref={heroRef} className={`relative min-h-screen flex items-center justify-center overflow-hidden ${isMobile ? 'bg-cream' : ''}`}>
          <div className={`relative z-10 container mx-auto px-4 ${isMobile ? 'py-6' : 'py-20'}`}>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className={`max-w-5xl mx-auto text-center ${isMobile ? 'space-y-6' : 'space-y-8'}`}
            >
              <InteractiveLogo />

              <motion.div
                variants={fadeInUp}
                className={isMobile ? "" : "space-y-4"}
              >
                <h1 className={`${isMobile ? 'text-4xl' : 'text-6xl md:text-8xl'} font-black bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent leading-tight`}>
                  Claude Builder Club
                </h1>
                <div className="flex items-center justify-center gap-3">
                  <img src="/msu-logo.png" alt="MSU" className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'}`} />
                  <p className={`${isMobile ? 'text-xl' : 'text-2xl md:text-3xl'} font-bold text-foreground/80`}>
                    Michigan State University
                  </p>
                </div>
              </motion.div>

              <motion.p
                variants={fadeInUp}
                className={`${isMobile ? 'text-base' : 'text-xl md:text-2xl'} text-muted-foreground max-w-3xl mx-auto leading-relaxed`}
              >
                We're a community of ambitious builders, innovators, and learners who are passionate about leveraging AI
                to create real-world impact. From professional client work to cutting-edge research, we're pushing the
                boundaries of what's possible with technology.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className={`${isMobile ? 'pt-6' : 'pt-12'}`}
              >
                <div className="inline-flex flex-col items-center gap-2 text-muted-foreground">
                  <span className="text-sm font-medium">Scroll to explore</span>
                  <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* What We Do Section */}
        <section className="relative py-32 bg-cream dark:bg-background">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="max-w-7xl mx-auto"
            >
              <motion.div variants={fadeInUp} className={`text-center ${isMobile ? 'mb-12' : 'mb-20'}`}>
                <h2 className={`${isMobile ? 'text-4xl' : 'text-5xl md:text-6xl'} font-black mb-6 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent`}>
                  What We Do
                </h2>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-muted-foreground max-w-2xl mx-auto`}>
                  Four pillars that define our commitment to excellence
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-8">
                <motion.div variants={fadeInUp}>
                  <Card className="relative h-full border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-2xl group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <CardContent className={`relative space-y-6 ${isMobile ? 'p-6' : 'p-8'}`}>
                      <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg`}>
                        <Code className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                      </div>
                      <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Innovative Projects</h3>
                      <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground leading-relaxed`}>
                        Partner with companies far and wide to give students real-world experience. Build and deploy
                        production-grade applications, work with actual clients, and create solutions that matter.
                        From startups to established firms, our members gain invaluable hands-on experience building
                        software that ships.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <Card className="relative h-full border-2 border-border hover:border-blue-500 transition-all duration-300 hover:shadow-2xl group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <CardContent className={`relative space-y-6 ${isMobile ? 'p-6' : 'p-8'}`}>
                      <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg`}>
                        <GraduationCap className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                      </div>
                      <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Education Pipeline</h3>
                      <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground leading-relaxed`}>
                        Learn from industry experts and seasoned professionals. Master system design, conquer LeetCode,
                        and prepare for top-tier internships at FAANG and beyond. Our comprehensive curriculum covers
                        everything from technical interviews to real-world engineering practices, setting you up for
                        success in the competitive tech landscape.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <Card className="relative h-full border-2 border-border hover:border-purple-500 transition-all duration-300 hover:shadow-2xl group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <CardContent className={`relative space-y-6 ${isMobile ? 'p-6' : 'p-8'}`}>
                      <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg`}>
                        <Sparkles className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                      </div>
                      <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>AI Development Support</h3>
                      <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground leading-relaxed`}>
                        Kickstart your AI journey with $50 in Claude API credits for every member. Experiment with
                        cutting-edge language models, build intelligent applications, and bring your AI ideas to life
                        without financial barriers. We believe in removing obstacles so you can focus on innovation
                        and creativity.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <Card className="relative h-full border-2 border-border hover:border-green-500 transition-all duration-300 hover:shadow-2xl group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <CardContent className={`relative space-y-6 ${isMobile ? 'p-6' : 'p-8'}`}>
                      <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg`}>
                        <Trophy className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                      </div>
                      <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>The Devvys</h3>
                      <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground leading-relaxed`}>
                        Our annual project showcase where innovation takes center stage. Present your personal projects,
                        hackathon wins, or client work in front of recruiters, professors, and the MSU community.
                        Compete for recognition, network with industry leaders, and celebrate the incredible work
                        our members create throughout the year.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="relative py-32 bg-gradient-to-br from-orange-50/20 via-cream to-orange-50/20 dark:from-orange-950/10 dark:via-background dark:to-orange-950/10">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="max-w-5xl mx-auto"
            >
              <div className={`text-center ${isMobile ? 'mb-12' : 'mb-16'}`}>
                <div className={`inline-flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 rounded-full mb-8 shadow-2xl ${isMobile ? 'w-16 h-16' : 'w-20 h-20'}`}>
                  <Rocket className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
                </div>
                <h2 className={`${isMobile ? 'text-4xl' : 'text-5xl md:text-6xl'} font-black mb-8`}>Our Vision</h2>
                <div className="space-y-8 text-left">
                  <div className={`bg-card border-2 rounded-2xl shadow-lg ${isMobile ? 'p-6' : 'p-8'}`}>
                    <div className={`flex items-start gap-6 ${isMobile ? 'gap-4' : 'gap-6'}`}>
                      <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Rocket className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-primary`} />
                      </div>
                      <div>
                        <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-3`}>Send Students to the World</h3>
                        <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground leading-relaxed`}>
                          We're building a fund to send hand-picked students to premier hackathons and tech conferences
                          across the country. Experience MLH events, attend cutting-edge AI conferences, and represent
                          MSU on the national stage. Your talent deserves a global platform.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`bg-card border-2 rounded-2xl shadow-lg ${isMobile ? 'p-6' : 'p-8'}`}>
                    <div className={`flex items-start gap-6 ${isMobile ? 'gap-4' : 'gap-6'}`}>
                      <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Users className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-blue-600`} />
                      </div>
                      <div>
                        <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-3`}>Host Internal Hackathons</h3>
                        <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground leading-relaxed`}>
                          Create a culture of rapid prototyping and innovation right here at MSU. Our internal hackathons
                          bring together the brightest minds to solve real problems, experiment with new technologies,
                          and build the future—all in an intense, collaborative, and fun environment.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-2xl text-white ${isMobile ? 'p-6' : 'p-8'}`}>
                    <div className={`flex items-start gap-6 ${isMobile ? 'gap-4' : 'gap-6'}`}>
                      <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Sparkles className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
                      </div>
                      <div>
                        <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-3`}>Build the Future Together</h3>
                        <p className={`${isMobile ? 'text-base' : 'text-lg'} leading-relaxed opacity-95`}>
                          This is just the beginning. We're creating an ecosystem where students don't just learn
                          about technology—they shape it. Join us in building something extraordinary.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className={`relative ${isMobile ? 'py-20' : 'py-32'} bg-gradient-to-br from-primary via-primary/80 to-primary text-white overflow-hidden`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="container mx-auto px-4 relative z-10"
          >
            <div className="max-w-4xl mx-auto text-center space-y-12">
              <h2 className={`${isMobile ? 'text-4xl' : 'text-5xl md:text-7xl'} font-black leading-tight`}>
                Spread the Joy of CS
              </h2>
              <p className={`${isMobile ? 'text-lg' : 'text-xl md:text-2xl'} opacity-95 max-w-2xl mx-auto leading-relaxed`}>
                Join a community where innovation meets opportunity, and passion drives progress.
              </p>

              <div className={`flex flex-col items-center justify-center gap-6 pt-8 ${isMobile ? 'sm:flex-col' : 'sm:flex-row'}`}>
                <Button
                  size="lg"
                  onClick={() => window.open('https://www.instagram.com/claudemsu', '_blank')}
                  className={`bg-white text-primary hover:bg-cream font-bold shadow-2xl hover:scale-105 transition-transform ${isMobile ? 'text-base px-8 py-6 w-full max-w-xs' : 'text-lg px-10 py-7'}`}
                >
                  <Instagram className={`${isMobile ? 'h-5 w-5 mr-2' : 'h-6 w-6 mr-3'}`} />
                  Instagram
                </Button>

                <Button
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className={`bg-white text-primary hover:bg-cream font-bold shadow-2xl hover:scale-110 transition-transform border-4 border-white/50 ${isMobile ? 'text-lg px-12 py-7 w-full max-w-xs' : 'text-xl px-16 py-8'}`}
                >
                  Apply Now
                </Button>

                <Button
                  size="lg"
                  onClick={() => window.open('https://www.linkedin.com/company/claude-builder-club-michigan-state/', '_blank')}
                  className={`bg-white text-primary hover:bg-cream font-bold shadow-2xl hover:scale-105 transition-transform ${isMobile ? 'text-base px-8 py-6 w-full max-w-xs' : 'text-lg px-10 py-7'}`}
                >
                  <Linkedin className={`${isMobile ? 'h-5 w-5 mr-2' : 'h-6 w-6 mr-3'}`} />
                  LinkedIn
                </Button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="relative bg-background border-t py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/claude-logo.png" alt="Claude Logo" className="h-8 w-8" />
              <span className="text-lg font-bold">Claude Builder Club @ MSU</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Claude Builder Club. Spreading the joy of CS, one project at a time.
            </p>
          </div>
        </footer>
      </div>
      <Analytics />
    </div>
  );
};

export default Index;