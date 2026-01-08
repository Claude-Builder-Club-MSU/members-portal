import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram, Linkedin, Code, GraduationCap, Sparkles, Trophy, Rocket, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";

const Index = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-orange-950/20 dark:via-background dark:to-blue-950/20"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-5xl mx-auto text-center space-y-8"
          >
            {/* Logo */}
            <motion.div
              className="flex justify-center mb-8"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 blur-2xl opacity-30 animate-pulse"></div>
                <img
                  src="/claude-logo.png"
                  alt="Claude Logo"
                  className="relative h-32 w-32 md:h-40 md:w-40 drop-shadow-2xl"
                />
              </div>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              variants={fadeInUp}
              className="space-y-4"
            >
              <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 bg-clip-text text-transparent leading-tight">
                Claude Builder Club
              </h1>
              <div className="flex items-center justify-center gap-3">
                <img src="/msu-logo.png" alt="MSU" className="h-10 w-10" />
                <p className="text-2xl md:text-3xl font-bold text-foreground/80">
                  Michigan State University
                </p>
              </div>
            </motion.div>

            {/* Description */}
            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              We're a community of ambitious builders, innovators, and learners who are passionate about leveraging AI
              to create real-world impact. From professional client work to cutting-edge research, we're pushing the
              boundaries of what's possible with technology.
            </motion.p>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="pt-12"
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

      {/* What We Do Section - 2x2 Grid */}
      <section className="py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="max-w-7xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                What We Do
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Four pillars that define our commitment to excellence
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Card 1: Projects */}
              <motion.div variants={fadeInUp}>
                <Card className="h-full border-2 hover:border-orange-500 transition-all duration-300 hover:shadow-2xl group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="relative p-8 space-y-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Code className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold">Innovative Projects</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Partner with companies far and wide to give students real-world experience. Build and deploy
                      production-grade applications, work with actual clients, and create solutions that matter.
                      From startups to established firms, our members gain invaluable hands-on experience building
                      software that ships.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Card 2: Education */}
              <motion.div variants={fadeInUp}>
                <Card className="h-full border-2 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="relative p-8 space-y-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold">Education Pipeline</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Learn from industry experts and seasoned professionals. Master system design, conquer LeetCode,
                      and prepare for top-tier internships at FAANG and beyond. Our comprehensive curriculum covers
                      everything from technical interviews to real-world engineering practices, setting you up for
                      success in the competitive tech landscape.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Card 3: API Credits */}
              <motion.div variants={fadeInUp}>
                <Card className="h-full border-2 hover:border-purple-500 transition-all duration-300 hover:shadow-2xl group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="relative p-8 space-y-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold">AI Development Support</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Kickstart your AI journey with $50 in Claude API credits for every member. Experiment with
                      cutting-edge language models, build intelligent applications, and bring your AI ideas to life
                      without financial barriers. We believe in removing obstacles so you can focus on innovation
                      and creativity.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Card 4: The Devvys */}
              <motion.div variants={fadeInUp}>
                <Card className="h-full border-2 hover:border-green-500 transition-all duration-300 hover:shadow-2xl group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="relative p-8 space-y-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Trophy className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold">The Devvys</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
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
      <section className="py-32 bg-gradient-to-br from-background via-orange-50/20 to-background dark:from-background dark:via-orange-950/10 dark:to-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="max-w-5xl mx-auto"
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mb-8 shadow-2xl">
                <Rocket className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-5xl md:text-6xl font-black mb-8">Our Vision</h2>
              <div className="space-y-8 text-left">
                <div className="bg-card border-2 rounded-2xl p-8 shadow-lg">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Rocket className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3">Send Students to the World</h3>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        We're building a fund to send hand-picked students to premier hackathons and tech conferences
                        across the country. Experience MLH events, attend cutting-edge AI conferences, and represent
                        MSU on the national stage. Your talent deserves a global platform.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border-2 rounded-2xl p-8 shadow-lg">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3">Host Internal Hackathons</h3>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Create a culture of rapid prototyping and innovation right here at MSU. Our internal hackathons
                        bring together the brightest minds to solve real problems, experiment with new technologies,
                        and build the future—all in an intense, collaborative, and fun environment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 shadow-2xl text-white">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3">Build the Future Together</h3>
                      <p className="text-lg leading-relaxed opacity-95">
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
      <section className="py-32 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white relative overflow-hidden">
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
            <h2 className="text-5xl md:text-7xl font-black leading-tight">
              Spread the Joy of CS
            </h2>
            <p className="text-xl md:text-2xl opacity-95 max-w-2xl mx-auto leading-relaxed">
              Join a community where innovation meets opportunity, and passion drives progress.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
              <Button
                size="lg"
                onClick={() => window.open('https://www.instagram.com/claudemsu', '_blank')}
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold text-lg px-10 py-7 shadow-2xl hover:scale-105 transition-transform"
              >
                <Instagram className="h-6 w-6 mr-3" />
                Instagram
              </Button>

              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold text-xl px-16 py-8 shadow-2xl hover:scale-110 transition-transform border-4 border-white/50"
              >
                Apply Now
              </Button>

              <Button
                size="lg"
                onClick={() => window.open('https://www.linkedin.com/company/claude-builder-club-michigan-state/', '_blank')}
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold text-lg px-10 py-7 shadow-2xl hover:scale-105 transition-transform"
              >
                <Linkedin className="h-6 w-6 mr-3" />
                LinkedIn
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
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
      <Analytics />
    </div>
  );
};

export default Index;