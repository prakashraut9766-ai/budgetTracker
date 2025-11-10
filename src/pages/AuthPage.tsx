import { useState } from 'react';
import { LoginForm } from '../components/Auth/LoginForm';
import { SignupForm } from '../components/Auth/SignupForm';
import { Wallet } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex items-center justify-center gap-12">
        <div className="hidden lg:block flex-1">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">Budget Tracker</h1>
            </div>
            <p className="text-xl text-gray-600 leading-relaxed">
              Take control of your finances with smart expense tracking, budget management, and AI-powered insights.
            </p>
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Track Expenses Easily</h3>
                  <p className="text-gray-600 text-sm">Log expenses manually, via voice, SMS, or scan receipts</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Split Bills Seamlessly</h3>
                  <p className="text-gray-600 text-sm">Share expenses with friends and groups effortlessly</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Smart Insights</h3>
                  <p className="text-gray-600 text-sm">Get AI-powered recommendations and spending alerts</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          {isLogin ? (
            <LoginForm onToggle={() => setIsLogin(false)} />
          ) : (
            <SignupForm onToggle={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
