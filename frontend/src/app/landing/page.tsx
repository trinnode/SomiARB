'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '../../components/ui/Button';

export default function LandingPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  const features = [
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Execute arbitrage opportunities in milliseconds with our advanced algorithms'
    },
    {
      icon: '🛡️', 
      title: 'Secure & Safe',
      description: 'Your funds are protected with battle-tested smart contracts'
    },
    {
      icon: '📈',
      title: 'High Yield',
      description: 'Maximize your returns with automated arbitrage strategies'
    },
    {
      icon: '🎯',
      title: 'Precise Execution',
      description: 'AI-powered analysis identifies the most profitable opportunities'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  if (isConnected) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Redirecting to dashboard...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/20 to-slate-900/90" />
      
      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Image src="/favicon.ico" alt="SomiARB" width={28} height={28} priority />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            SomiARB
          </span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ConnectButton />
        </motion.div>
      </nav>

      {/* Hero Section */}
      <motion.main
        className="relative z-10 container mx-auto px-6 lg:px-8 pt-20 pb-32"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            className="text-5xl lg:text-7xl font-bold mb-8"
            variants={itemVariants}
          >
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Advanced Arbitrage
            </span>
            <br />
            <span className="text-white">
              Trading Platform
            </span>
          </motion.h1>

          <motion.p
            className="text-xl lg:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed"
            variants={itemVariants}
          >
            Harness the power of AI-driven arbitrage strategies to maximize your DeFi returns. 
            Trade smarter, not harder, with our next-generation platform.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
            variants={itemVariants}
          >
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, authenticationStatus, mounted }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain;

                return (
                  <Button
                    onClick={connected ? undefined : openConnectModal}
                    variant="glow"
                    size="lg"
                    className="px-8 py-4 text-lg font-semibold"
                  >
                    {connected ? 'Connected' : 'Connect Wallet'}
                  </Button>
                );
              }}
            </ConnectButton.Custom>
            
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20"
            variants={itemVariants}
          >
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-blue-400 mb-2">$2.4M+</div>
              <div className="text-slate-400">Total Volume</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-green-400 mb-2">15.7%</div>
              <div className="text-slate-400">Avg APY</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-purple-400 mb-2">1,250+</div>
              <div className="text-slate-400">Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-pink-400 mb-2">99.9%</div>
              <div className="text-slate-400">Uptime</div>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.section
          id="features"
          className="max-w-6xl mx-auto"
          variants={itemVariants}
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16">
            Why Choose <span className="text-blue-400">SomiARB</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300"
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: '0 20px 40px rgba(59, 130, 246, 0.15)'
                }}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          className="text-center mt-20"
          variants={itemVariants}
        >
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-3xl p-12 border border-blue-500/20">
            <h3 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Start Trading?
            </h3>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Join thousands of traders who are already maximizing their DeFi returns with SomiARB.
            </p>
            <ConnectButton.Custom>
              {({ openConnectModal, connectModalOpen }) => (
                <Button
                  onClick={openConnectModal}
                  variant="glow"
                  size="lg"
                  className="px-12 py-4 text-lg font-semibold"
                  disabled={connectModalOpen}
                >
                  Get Started Now
                </Button>
              )}
            </ConnectButton.Custom>
          </div>
        </motion.section>
      </motion.main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-8 text-center text-slate-400">
        <div className="container mx-auto px-6">
          <p>&copy; 2025 SomiARB. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}